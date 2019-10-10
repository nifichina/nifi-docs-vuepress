# NIFI Linux系统配置的最佳实践
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com**
***
内容：

如果您在Linux上运行，请考虑以下最佳实践。典型的Linux缺省值并不一定能够很好地适应像NiFi这样的IO密集型应用程序的需要。

**1、Maximum File Handles**

NiFi在任何时候都可能打开大量的文件句柄。通过编辑/etc/security/limits.conf来增加这些限制，添加如下内容：
```
* hard nofile 50000

* soft nofile 50000
```
**2、Maximum Forked Processes**

可以将NiFi配置为生成大量线程。要增加允许的数量，请编辑/etc/security/limits.conf

```
*  hard  nproc  10000
*  soft  nproc  10000
```

您的Linux发行版可能需要对/etc/security/limits.d/90-nproc.conf进行编辑

```
*  soft  nproc  10000
```

**3、Increase the number of TCP socket ports available**

如果您的流程将在短时间内设置和拆除大量套接字，那么这一点尤其重要。

```
sudo sysctl -w net.ipv4.ip_local_port_range="10000 65000"
```
**4、Set how long sockets stay in a TIMED_WAIT state when closed**

您不希望您的套接字停留太久，因为您希望能够快速地设置和拆卸新的套接字。类似调整如下

```
sudo sysctl -w net.ipv4.netfilter.ip_conntrack_tcp_timeout_time_wait="1"
```

**5、Tell Linux you never want NiFi to swap**

Swapping 对某些应用很好，但不适用一直在运行的NIFI，编辑_/etc/sysctl.conf告诉Linux禁用 Swapping_

```
vm.swappiness = 0
```

对于处理各种NiFi repos的分区，请关闭诸如atime之类的选项。这样做会导致吞吐量的惊人提高。编辑/etc/fstab文件，对于感兴趣的分区，添加noatime选项。