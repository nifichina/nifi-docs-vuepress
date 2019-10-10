# nifi.sh 脚本解读 
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com** 
***
内容：

整个脚本分为三部分，第一部分是确定NIFI各个路径 目录的确定，设置环境变量，第二部分是方法区。第三部分是脚本逻辑代码的入口，初略的根据传参不同区执行不同的方法。以下脚本有详细注释：


```bash
#!/bin/sh

# ==========================
# 1、查找文件的路径 start
# ==========================

# 由于MacOS X、FreeBSD和其他一些系统缺少gnu readlink，我们使用了基于以下StackOverflow注释http://stackoverflow.com/a/1116890/888876的更可移植的方法

## 特殊变量 当前脚本的文件名
TARGET_FILE=$0
#跳转到当前脚本所在的目录
cd $(dirname $TARGET_FILE)
## TARGET_FILE=nifi.sh
TARGET_FILE=$(basename $TARGET_FILE)

## 遍历(可能的)符号链接链   -L filename，判断文件是否问链接文件
while [ -L "$TARGET_FILE" ]
do
    TARGET_FILE=$(readlink $TARGET_FILE)
    cd $(dirname $TARGET_FILE)
    TARGET_FILE=$(basename $TARGET_FILE)
done


# pwd -P  显示出实际路径，而非使用连接（link）路径。
PHYS_DIR=$(pwd -P)
# 脚本所在目录
SCRIPT_DIR=$PHYS_DIR
PROGNAME=$(basename "$0")
# ==========================
# 查找文件的路径 end
# ==========================

# 执行nifi-env.sh  设置了NIFI的目录环境变量
. "${SCRIPT_DIR}/nifi-env.sh"

# ==========================
#/2、方法区 start
# ==========================

warn() {
    echo "${PROGNAME}: $*"
}

die() {
    warn "$*"
    exit 1
}

# 检测特殊的操作系统，然后做一些特殊操作
detectOS() {
    # Cygwin是一个在windows平台上运行的类UNIX模拟环境
    cygwin=false;
    # AIX，是IBM专有的UNIX操作系统
    aix=false;
    # AS400是IBM早期推出的商用小型机
    os400=false;
    # Darwin是由苹果电脑于2000年所释出的一个开放原始码操作系统
    darwin=false;
    case "$(uname)" in
        CYGWIN*)
            cygwin=true
            ;;
        AIX*)
            aix=true
            ;;
        OS400*)
            os400=true
            ;;
        Darwin)
            darwin=true
            ;;
    esac
    # For AIX, set an environment variable
    if ${aix}; then
         export LDR_CNTRL=MAXDATA=0xB0000000@DSA
         echo ${LDR_CNTRL}
    fi
    # In addition to those, go around the linux space and query the widely
    # adopted /etc/os-release to detect linux variants
    if [ -f /etc/os-release ]; then
        . /etc/os-release
    fi
}

unlimitFD() {
    # Use the maximum available, or set MAX_FD != -1 to use that
    # 判断 ${MAX_FD}有没有被赋值 条件成立则没有赋值
    if [ "x${MAX_FD}" = "x" ]; then
        MAX_FD="maximum"
    fi

    # 如果可能的话，提升文件描述符的最大数量
    if [ "${os400}" = "false" ] && [ "${cygwin}" = "false" ]; then
        MAX_FD_LIMIT=$(ulimit -H -n)
        if [ "${MAX_FD_LIMIT}" != 'unlimited' ]; then
            if [ $? -eq 0 ]; then
                if [ "${MAX_FD}" = "maximum" -o "${MAX_FD}" = "max" ]; then
                    # use the system max
                    MAX_FD="${MAX_FD_LIMIT}"
                fi

                ulimit -n ${MAX_FD} > /dev/null
                # echo "ulimit -n" `ulimit -n`
                if [ $? -ne 0 ]; then
                    warn "Could not set maximum file descriptor limit: ${MAX_FD}"
                fi
            else
                warn "Could not query system maximum file descriptor limit: ${MAX_FD_LIMIT}"
            fi
        fi
    fi
}


# 找到要执行的JVM
locateJava() {
    # 设置Java虚拟机
    if $cygwin ; then
        [ -n "${JAVA}" ] && JAVA=$(cygpath --unix "${JAVA}")
        [ -n "${JAVA_HOME}" ] && JAVA_HOME=$(cygpath --unix "${JAVA_HOME}")
    fi

    if [ "x${JAVA}" = "x" ] && [ -r /etc/gentoo-release ] ; then
        JAVA_HOME=$(java-config --jre-home)
    fi
    if [ "x${JAVA}" = "x" ]; then
        if [ "x${JAVA_HOME}" != "x" ]; then
            if [ ! -d "${JAVA_HOME}" ]; then
                die "JAVA_HOME is not valid: ${JAVA_HOME}"
            fi
            JAVA="${JAVA_HOME}/bin/java"
        else
            warn "JAVA_HOME not set; results may vary"
            JAVA=$(type java)
            JAVA=$(expr "${JAVA}" : '.* \(/.*\)$')
            if [ "x${JAVA}" = "x" ]; then
                die "java command not found"
            fi
        fi
    fi
    # 如果命令是 env, tools.jar classes.jar也加到 classpath
    if [ "$1" = "env" ]; then
        [ "x${TOOLS_JAR}" =  "x" ] && [ -n "${JAVA_HOME}" ] && TOOLS_JAR=$(find -H "${JAVA_HOME}" -name "tools.jar")
        [ "x${TOOLS_JAR}" =  "x" ] && [ -n "${JAVA_HOME}" ] && TOOLS_JAR=$(find -H "${JAVA_HOME}" -name "classes.jar")
        if [ "x${TOOLS_JAR}" =  "x" ]; then
             warn "Could not locate tools.jar or classes.jar. Please set manually to avail all command features."
        fi
    fi

}
# 初始化 
init() {
    # 确定是否需要执行特殊的操作系统处理
    detectOS

    # 如果可能的话，不限制文件描述符的数量
    unlimitFD

    # 找到要执行的JVM
    locateJava "$1"
}

# 将nifi安装为service
install() {
    detectOS

    if [ "${darwin}" = "true"  ] || [ "${cygwin}" = "true" ]; then
        echo 'Installing Apache NiFi as a service is not supported on OS X or Cygwin.'
        exit 1
    fi

    SVC_NAME=nifi
    if [ "x$2" != "x" ] ; then
        SVC_NAME=$2
    fi

    # since systemd seems to honour /etc/init.d we don't still create native systemd services
    # yet...
    initd_dir='/etc/init.d'
    SVC_FILE="${initd_dir}/${SVC_NAME}"

    if [ ! -w  "${initd_dir}" ]; then
        echo "Current user does not have write permissions to ${initd_dir}. Cannot install NiFi as a service."
        exit 1
    fi

# Create the init script, overwriting anything currently present
cat <<SERVICEDESCRIPTOR > ${SVC_FILE}
#!/bin/sh

#
#    Licensed to the Apache Software Foundation (ASF) under one or more
#    contributor license agreements.  See the NOTICE file distributed with
#    this work for additional information regarding copyright ownership.
#    The ASF licenses this file to You under the Apache License, Version 2.0
#    (the "License"); you may not use this file except in compliance with
#    the License.  You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS,
#    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#    See the License for the specific language governing permissions and
#    limitations under the License.
#
# chkconfig: 2345 20 80
# description: Apache NiFi is a dataflow system based on the principles of Flow-Based Programming.
#

# Make use of the configured NIFI_HOME directory and pass service requests to the nifi.sh executable
NIFI_HOME=${NIFI_HOME}
bin_dir=\${NIFI_HOME}/bin
nifi_executable=\${bin_dir}/nifi.sh

\${nifi_executable} "\$@"
SERVICEDESCRIPTOR

    if [ ! -f "${SVC_FILE}" ]; then
        echo "Could not create service file ${SVC_FILE}"
        exit 1
    fi

    # Provide the user execute access on the file
    chmod u+x ${SVC_FILE}


    # If SLES or OpenSuse...
    if [ "${ID}" = "opensuse" ] || [ "${ID}" = "sles" ]; then
        rm -f "/etc/rc.d/rc2.d/S65${SVC_NAME}"
        ln -s "/etc/init.d/${SVC_NAME}" "/etc/rc.d/rc2.d/S65${SVC_NAME}" || { echo "Could not create link /etc/rc.d/rc2.d/S65${SVC_NAME}"; exit 1; }
        rm -f "/etc/rc.d/rc2.d/K65${SVC_NAME}"
        ln -s "/etc/init.d/${SVC_NAME}" "/etc/rc.d/rc2.d/K65${SVC_NAME}" || { echo "Could not create link /etc/rc.d/rc2.d/K65${SVC_NAME}"; exit 1; }
        echo "Service ${SVC_NAME} installed"
    # Anything other fallback to the old approach
    else
        rm -f "/etc/rc2.d/S65${SVC_NAME}"
        ln -s "/etc/init.d/${SVC_NAME}" "/etc/rc2.d/S65${SVC_NAME}" || { echo "Could not create link /etc/rc2.d/S65${SVC_NAME}"; exit 1; }
        rm -f "/etc/rc2.d/K65${SVC_NAME}"
        ln -s "/etc/init.d/${SVC_NAME}" "/etc/rc2.d/K65${SVC_NAME}" || { echo "Could not create link /etc/rc2.d/K65${SVC_NAME}"; exit 1; }
        echo "Service ${SVC_NAME} installed"
    fi
}

run() {
    BOOTSTRAP_CONF_DIR="${NIFI_HOME}/conf"
    BOOTSTRAP_CONF="${BOOTSTRAP_CONF_DIR}/bootstrap.conf";
    BOOTSTRAP_LIBS="${NIFI_HOME}/lib/bootstrap/*"

    # 运行NiFi时使用的用户名。此值将在Windows上被忽略。在bootstrap.conf中 run.as= 配置
    run_as_user=$(grep '^\s*run.as' "${BOOTSTRAP_CONF}" | cut -d'=' -f2)
    # 如果以用户身份运行与启动流程相同，则忽略此配置
    if [ "${run_as_user}" = "$(whoami)" ]; then
        unset run_as_user
    fi

    if $cygwin; then
        if [ -n "${run_as_user}" ]; then
            echo "The run.as option is not supported in a Cygwin environment. Exiting."
            exit 1
        fi;

        NIFI_HOME=$(cygpath --path --windows "${NIFI_HOME}")
        NIFI_LOG_DIR=$(cygpath --path --windows "${NIFI_LOG_DIR}")
        NIFI_PID_DIR=$(cygpath --path --windows "${NIFI_PID_DIR}")
        BOOTSTRAP_CONF=$(cygpath --path --windows "${BOOTSTRAP_CONF}")
        BOOTSTRAP_CONF_DIR=$(cygpath --path --windows "${BOOTSTRAP_CONF_DIR}")
        BOOTSTRAP_LIBS=$(cygpath --path --windows "${BOOTSTRAP_LIBS}")
        BOOTSTRAP_CLASSPATH="${BOOTSTRAP_CONF_DIR};${BOOTSTRAP_LIBS}"
        if [ -n "${TOOLS_JAR}" ]; then
            TOOLS_JAR=$(cygpath --path --windows "${TOOLS_JAR}")
            BOOTSTRAP_CLASSPATH="${TOOLS_JAR};${BOOTSTRAP_CLASSPATH}"
        fi
    else
        if [ -n "${run_as_user}" ]; then
            if ! id -u "${run_as_user}" >/dev/null 2>&1; then
                echo "The specified run.as user ${run_as_user} does not exist. Exiting."
                exit 1
            fi
        fi;
        BOOTSTRAP_CLASSPATH="${BOOTSTRAP_CONF_DIR}:${BOOTSTRAP_LIBS}"
        if [ -n "${TOOLS_JAR}" ]; then
            BOOTSTRAP_CLASSPATH="${TOOLS_JAR}:${BOOTSTRAP_CLASSPATH}"
        fi
    fi

    echo
    echo "Java home: ${JAVA_HOME}"
    echo "NiFi home: ${NIFI_HOME}"
    echo
    echo "Bootstrap Config File: ${BOOTSTRAP_CONF}"
    echo

    #在后台运行'start'，因为进程将继续运行，监视NiFi。所有其他命令都将很快终止，所以要等待它们

    #设置目录的参数
    # java程序启动参数 -D 在System类中通过getProperties()得到的一串系统属性
    BOOTSTRAP_LOG_PARAMS="-Dorg.apache.nifi.bootstrap.config.log.dir='${NIFI_LOG_DIR}'"
    BOOTSTRAP_PID_PARAMS="-Dorg.apache.nifi.bootstrap.config.pid.dir='${NIFI_PID_DIR}'"
    BOOTSTRAP_CONF_PARAMS="-Dorg.apache.nifi.bootstrap.config.file='${BOOTSTRAP_CONF}'"

    # 去掉一下注釋就允许调试NIFI进程 (或者在bootstrap.conf中取消注释)
    #BOOTSTRAP_DEBUG_PARAMS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=8000"

    BOOTSTRAP_DIR_PARAMS="${BOOTSTRAP_LOG_PARAMS} ${BOOTSTRAP_PID_PARAMS} ${BOOTSTRAP_CONF_PARAMS}"

    run_nifi_cmd="'${JAVA}' -cp '${BOOTSTRAP_CLASSPATH}' -Xms12m -Xmx24m ${BOOTSTRAP_DIR_PARAMS} ${BOOTSTRAP_DEBUG_PARAMS} ${BOOTSTRAP_JAVA_OPTS} org.apache.nifi.bootstrap.RunNiFi $@"

    if [ -n "${run_as_user}" ]; then
      # 为运行提供SCRIPT_DIR并执行ni -env。
      run_nifi_cmd="sudo -u ${run_as_user} sh -c \"SCRIPT_DIR='${SCRIPT_DIR}' && . '${SCRIPT_DIR}/nifi-env.sh' && ${run_nifi_cmd}\""
    fi

    if [ "$1" = "run" ]; then
      # 使用exec将PID切换到RunNiFi java进程，而不是将其作为子进程( 前台运行nifi，Ctrl-C就停止NIFI)
      # exec命令 用于调用并执行指令的命令。exec命令通常用在shell脚本程序中，可以调用其他的命令。如果在当前终端中使用命令，则当指定的命令执行完毕后会立即退出终端。
      run_nifi_cmd="exec ${run_nifi_cmd}"
    fi
    # Linux eval命令用于重新运算求出参数的内容。
    # eval可读取一连串的参数，然后再依参数本身的特性来执行。
    if [ "$1" = "start" ]; then
        ( eval "cd ${NIFI_HOME} && ${run_nifi_cmd}" & )> /dev/null 1>&-
    else
        eval "cd ${NIFI_HOME} && ${run_nifi_cmd}"
    fi
    EXIT_STATUS=$?

   # 稍等(3秒)，等待日志记录完成，然后回显新行。
   # 我们这样做是为了避免在运行命令后，日志在控制台被吐出来，然后返回给用户
    sleep 3
    echo
}

main() {
    init "$1"
    run "$@"
}

# ==========================
# 方法区 end
# ==========================

# ==========================
# 3、入口 start
# ==========================

# 判断 $1 第一个参数是什么 
# 其中install 将nifi安装为service 
# start 启动
# stop 停止
# run
# status 
# dump
# env
# restart 重启

# $@ 传全部参数
case "$1" in
    install)
        install "$@"
        ;;
    start|stop|run|status|dump|env)
        main "$@"
        ;;
    restart)
        init
        run "stop"
        run "start"
        ;;
    *)
        echo "Usage nifi {start|stop|run|restart|status|dump|install}"
        ;;
esac


```