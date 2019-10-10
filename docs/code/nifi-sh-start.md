# nifi.sh start 解读 
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com** 
***
内容：

以下是我们执行nifi.sh start的时候最后执行的命令：

```
/usr/bin/java -cp /data/nifi/nifi-1.8.0/conf:/data/nifi/nifi-1.8.0/lib/bootstrap/* -Xms12m -Xmx24m -Dorg.apache.nifi.bootstrap.config.log.dir=/data/nifi/nifi-1.8.0/logs -Dorg.apache.nifi.bootstrap.config.pid.dir=/data/nifi/nifi-1.8.0/run -Dorg.apache.nifi.bootstrap.config.file=/data/nifi/nifi-1.8.0/conf/bootstrap.conf org.apache.nifi.bootstrap.RunNiFi start
```

java -cp 和 -classpath 一样，是指定类运行所依赖其他类的路径，通常是类库，jar包之类，需要全路径到jar包

-D 环境变量

主类：RunNiFi 参数 start

