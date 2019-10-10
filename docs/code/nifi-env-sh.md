# nifi-env.sh 脚本解读 
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com** 
***
内容：

```bash

#!/bin/sh

# nifi 目录
export NIFI_HOME=$(cd "${SCRIPT_DIR}" && cd .. && pwd)

# nifi pid 目录
export NIFI_PID_DIR="${NIFI_HOME}/run"

# nifi 日志目录
export NIFI_LOG_DIR="${NIFI_HOME}/logs"

# 设置为false，以强制在使用Kerberos的处理器中使用Keytab控制器服务。
# 如果为true，这些处理器将允许直接在处理器内配置keytab和principal。
# 如果为false，如果试图配置这些属性，这些处理器将无效。这在多租户环境中可能是有利的，在这种环境中，keytabs的管理应该只由具有较高权限的用户执行(即，已被授予“ACCESS_KEYTAB”限制的用户)。
export NIFI_ALLOW_EXPLICIT_KEYTAB=true

```