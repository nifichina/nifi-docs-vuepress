## Runtime类是什么？

每个java程序在运行时相当于启动了一个JVM进程，每个JVM进程都对应一个RunTime实例。此实例是JVM负责实例化的，所以我们不能实例化一个RunTime对象，只能通过getRuntime() 获取当前运行的Runtime对象的引用。一旦得到了一个当前的Runtime对象的引用，就可以调用Runtime对象的方法去查看Java虚拟机的状态以及控制虚拟机的行为。

## 源码

![](https://upload-images.jianshu.io/upload_images/8573125-83e2f44de3c242c1.png?imageMogr2/auto-orient/strip|imageView2/2/w/894/format/webp)

image.png  

如图，Runtime类用类似单例模式的方式，保证通过getRuntime()返回同一个Runtime对象。  

![](https://upload-images.jianshu.io/upload_images/8573125-45d81fc3c67ad545.png?imageMogr2/auto-orient/strip|imageView2/2/w/311/format/webp)

image.png  

如上图4个native方法，分别返回JVM内核数、空闲内存、总内存、最大内存。

![](https://upload-images.jianshu.io/upload_images/8573125-568ca87e98213e2b.png?imageMogr2/auto-orient/strip|imageView2/2/w/314/format/webp)

image.png  

exec()执行本地程序，比如在win平台下运行exe。  

![](https://upload-images.jianshu.io/upload_images/8573125-27391ba15089f0e6.png?imageMogr2/auto-orient/strip|imageView2/2/w/317/format/webp)

image.png  

load()可以加载动态链接库，如linux下的so文件，win下的dll文件。