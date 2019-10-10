# 通过配置优化NiFi性能
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com** 
***
内容：

## 简介

NiFi的默认设置可以满足一般的运行和测试需求，但是如果想要处理大容量数据流，那就远远不够了。本文将介绍与NiFi性能有关的几个设置参数，让NiFi可以高效运转。

本文重点在如何优化初始配置或者对默认参数进行小幅修改，并不会深入讨论如何优化数据流设计和NiFi处理器。这些优化可以简单地可以通过编辑nifi.properties和bootstrap.conf实现，更多内容，可以去Apache官网(https://nifi.apache.org/docs.html)了。

## nifi.properties 文件

nifi.properties位于NiFi根目录下的conf中，文件包含若干区域。

### Core Properties

其中

```
nifi.bored.yield.duration=10 millis
```

通过限制空闲进程占用CPU的时间来达到控制CPU占用的目的。默认值10 millis，很大程度上降低了CPU利用率。调低参数会降低系统延迟提高性能，但会增大CPU占用率，鱼和熊掌不可兼得，需要根据具体性能需求来设置。

另一个参数与NiFi性能无关，但是可以提高浏览器界面的反应速度。

```
nifi.ui.autorefresh.interval=30 sec
```

顾名思义，这是浏览器会话的自动刷新间隔。降低可以让用户更好地实时了解系统的状况，但是也会增大网络带宽占用。如果没有强烈的需求，建议保持默认值，然后可以点击NiFi web界面中的“refresh status”手动刷新。

### H2 Settings

NiFi有两种H2数据库，user DB记录用户登录信息，History DB记录编辑历史。通常这两个数据库都较小，保存在默认路径与否不会对性能有什么影响。但是，为了维护方便，建议移动到安装路径以外，这样在更新时不会被覆盖。

### FlowFile Repository

FlowFile记录数据流的状态信息，如果损坏，会造成NiFi正在处理的文件丢失，而储存空间不足是损坏FlowFile的最常见的原因。最好也将FlowFile保存在NiFi根路径以外，尽量不要与高I/O的程序、content repository 或者 provenance repository在相同的磁盘上。FlowFile的路径通过下面的参数修改

```
nifi.flowfile.repository.directory=./flowfile_repository
```

为了提高性能，FlowFile驻留JVM内存以提高处理器之间文件传递的效率。但是，放任FlowFile过度地占用JVM内存，当内存不足时，性能也会受到极大的影响。因此，需要限制驻留内存的FlowFile数量。

```
nifi.queue.swap.threshold=20000
```

设置每个连接的队列中可以驻留内存的FlowFile数量。若队列经常超过20000个FlowFile，需要增加以提高性能，同时管理员也要根据实际情况调整堆(heap)的大小(在bootstrap.conf中修改，见后文)。

### Content Repository

数据流的实际内容保存在Content中，通常应该独占高性能高容量的磁盘。

默认值为

```
nifi.content.repository.directory.default=./content_repository
```

若单一RAID仍不能满足需求，可以为一个NiFi实例设置多个Content repository。NiFi将以轮询调度方式存储文件。将nifi.content.repository.directory.default删除或注释，然后为每个Content Repository增加一行参数指定路径，如下例子。

```
nifi.content.repository.directory.contS1R1=/cont-repo1/content_repository nifi.content.repository.directory.contS1R2=/cont-repo2/content_repository nifi.content.repository.directory.contS1R3=/cont-repo3/content_repository
```

注意，contS1R1, contS1R2, contS1R3，只是人为起的名字，可以自由命名。同一个节点上的Content repositor不可以重名，不同节点之间可以重名，但为了便于在web UI中管理，每个节点的Content repository的名字最好是不同的。

### Provenance Repository

与Content repository设置原理基本相同，也最好独占硬盘。

默认设置

```
nifi.provenance.repository.directory.default=./provenance_repository
```

也可以指定多个Provenance Repository

```
nifi.provenance.repository.directory.provS1R1=/prov-repo1/provenance_repository nifi.provenance.repository.directory.provS1R2=/prov-repo2/provenance_repository
```

命名规则也与Content repository相同。

Provenance Repository 允许多用户同时查询。当访问用户很多时，可以修改执行查询任务的线程数量以提高性能。

```
nifi.provenance.repository.query.threads=2
```

同样我们也可以修改执行Provenance Repository索引任务的线程数量

```
nifi.provenance.repository.index.threads=1
```

当遇到“The rate of the dataflow is exceeding the provenance recording rate. Slowing down flow to accommodate.”提示时，说明flowfile数量过多， Provenance处理速度不足，限制性能。需要增加索引线程的数量加以应对。不过，需要说明的是，此非多多益善，总的资源有限，增加了索引线程数，势必会争夺其他任务的资源。建议在无前文所示的提示出现时使用默认值。

```
nifi.provenance.repository.index.shard.size=500 MB
```

该参数影响Provenance查询时占用多少堆空间。提高该参数会增加查询性能，但是会增加堆消耗。默认值为500MB(注：此参数“影响”堆占用，并不代表会占用500MB的堆)

尽管Provenance功能不能被禁用，我们可以将其设置从“PersistentProvenanceRepository”改为“VolatileProvenanceRepository”，从而让Provenance Repository保存在堆中而非硬盘上，每次JVM重启就会丢失，但是可以提高性能。

通过

```
nifi.provenance.repository.buffer.size=100000
```

限制provenance能用多少堆

---

以下是一个NiFi节点示例

```
CPU: 24 - 48 cores
 
Memory: 64 -128 GB
 
Hard Drive configuration:
 
(1 hardware RAID 1 array)
 
(2 or more hardware RAID 10 arrays)
 
RAID 1 array (This could also be a RAID 10) logical volumes:
 
-/
-/boot
-/home
-/var
-/var/log/nifi-logs <-- point all your NiFi logs (logback.xml) here
-/opt <-- install NiFi here under a sub-directory
-/database-repo <-- point NiFi database repository here
-/flowfile-repo <-- point NiFi flowfile repository here
1st RAID 10 array logical volumes:
 
-/cont-repo1 <-- point NiFi content repository here
2nd RAID 10 array logical volumes:
 
- /prov-repo1 <-- point NiFi provenance repository here
 
3rd RAID 10 array logical volumes (recommended):
 
- / cont-repo2 <-- point 2nd NiFI content repository here
 
4th + RAID arrays logical volumes (optional):
```

## Bootstrap.conf 文件

此文件包含NiFi启动的相关设置，Java堆大小和Java系统属性。本文重点讨论针对大数据高性能数据流的优化问题。

### JVM 内存设置(JVM Memory Setting)

设置堆大小。Xms设置初始堆大小，Xmx堆最大值。默认值太小，对于初学者建议分别修改为4GB和8GB

```
java.arg.2=-Xms8gjava.arg.3=-Xmx8g
```

如果在NiFi日志文件中出现“out of memory”错误，说明可能有内存泄露或是内存不足，可以尝试提高堆大小。但是堆太大，会增加垃圾回收(Garbage Collection)的耗时，有时会造成明显的系统卡顿，若假死时间超过节点heartbeat的间隔，会造成节点离线。因此，需要选择一个较好的垃圾回收策略。

```
java.arg.13=-XX:+UseG1GC
```

注：HDF2.x 默认就是使用G1垃圾回收，因此无需特别修改。

### 以下设置只针对Java 7 (HDF 1.x 或者NiFi 0.x)

增加代码缓存(去掉注释符号)

```
java.arg.7=-XX:ReservedCodeCacheSize=256m
```

Java代码缓存用以暂存Java bytecode。当缓存满了的时候，编译器会被关闭，进而影响NiFi，而且除非重启，不然编译器不会再打开。代码缓存的默认大小与Java版本有关，有可能只有32M大小，所以增加代码缓存到256M能有效避免因为缓存填满而编译器被关闭。

去掉如下两行的注释开启代码缓存刷新，当剩余空间为10m时刷新代码缓存，腾出空间。

```
java.arg.8=-XX:CodeCacheFlushingMinimumFreeSpace=10mjava.arg.9=-XX:+UseCodeCacheFlushing
```

去掉上图中的最后两行注释增加permgen空间

```
java.arg.11=-XX:PermSize=128Mjava.arg.12=-XX:MaxPermSize=128M
```

permgen存储Java和Nifi的类，128M对于NiFi现存的类/处理器绰绰有余，但是如果新增了大量自定义的类，则需要根据实际情况增加permgen的值。

### 以下设置针对Java 8 (HDF 1.x 2.x, NiFi 0.x 1.x)


```
java.arg.7=-XX:ReservedCodeCacheSize=256mjava.arg.8=-XX:CodeCacheMinimumFreeSpace=10mjava.arg.9=-XX:+UseCodeCacheFlushing
```

与java 7同理，注意java.arg.11和java.arg.12不适用java 8。

原文链接：

https://community.hortonworks.com/articles/7882/hdfnifi-best-practices-for-setting-up-a-high-perfo.html