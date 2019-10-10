# Java常用类源码——Thread源码解析
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com**
***
内容：

## Thread 源码解析
线程是在进程中执行的单位，线程的资源开销相对于进程的开销是相对较少的，所以我们一般创建线程执行，而不是进程执行。 下面我们就来了解一下Java Thread类源码，了解一下线程的控制吧！

### 构造方法
```java
private void init(ThreadGroup g, Runnable target, String name,
                    long stackSize) {
      init(g, target, name, stackSize, null);
  }
private void init(ThreadGroup g, Runnable target, String name,
                    long stackSize, AccessControlContext acc) {
      if (name == null) {
          throw new NullPointerException("name cannot be null");
      }
      this.name = name.toCharArray();
      Thread parent = currentThread();
      SecurityManager security = System.getSecurityManager();
      if (g == null) {
          /* Determine if it's an applet or not */
          /* If there is a security manager, ask the security manager
             what to do. */
          if (security != null) {
              g = security.getThreadGroup();
          }
          /* If the security doesn't have a strong opinion of the matter
             use the parent thread group. */
          if (g == null) {
              g = parent.getThreadGroup();
          }
      }
      /* checkAccess regardless of whether or not threadgroup is
         explicitly passed in. */
      g.checkAccess();
      /*
       * Do we have the required permissions?
       */
      if (security != null) {
          if (isCCLOverridden(getClass())) {
              security.checkPermission(SUBCLASS_IMPLEMENTATION_PERMISSION);
          }
      }
      g.addUnstarted();
      this.group = g;
      this.daemon = parent.isDaemon();
      this.priority = parent.getPriority();
      if (security == null || isCCLOverridden(parent.getClass()))
          this.contextClassLoader = parent.getContextClassLoader();
      else
          this.contextClassLoader = parent.contextClassLoader;
      this.inheritedAccessControlContext =
              acc != null ? acc : AccessController.getContext();
      this.target = target;
      setPriority(priority);
      if (parent.inheritableThreadLocals != null)
          this.inheritableThreadLocals =
              ThreadLocal.createInheritedMap(parent.inheritableThreadLocals);
      /* Stash the specified stack size in case the VM cares */
      this.stackSize = stackSize;
      /* Set thread ID */
      tid = nextThreadID();
  }
  public Thread() {
      init(null, null, "Thread-" + nextThreadNum(), 0);
  }
  
  public Thread(Runnable target) {
      init(null, target, "Thread-" + nextThreadNum(), 0);
  }
  Thread(Runnable target, AccessControlContext acc) {
      init(null, target, "Thread-" + nextThreadNum(), 0, acc);
  }
 // 线程名
  public Thread(String name) {
      init(null, null, name, 0);
  }
  //线程组和线程名
  public Thread(ThreadGroup group, String name) {
      init(group, null, name, 0);
  }
  //线程任务，线程名
  public Thread(Runnable target, String name){
      init(null, target, name, 0);
  }
  // 线程组， 线程任务， 线程名 ，栈大小
  public Thread(ThreadGroup group, Runnable target, String name, long stackSize) {
      init(group, target, name, stackSize);
  }
//  ......
```
上述的的Thread 的构造方法不止是上面的一些内容，还有其他带参数的组合不同的构造方法， 我们可以发现在构造方法里面执行的是init()方法，那么这个init（）方法进行的是什么样的操作呢？
通过init()方法，我们可以看到， init是一个私有的方法，其中第一个进行的操作是，判断是否具有线程名，线程名是不可以为空的，如果我们使用的是无参数构造函数，或者使用的是没有传入线程名的构造方法，那么Thread类中是会默认的为我们规定线程名字，即调用的是Thread- nextThreadNum()，对线程进行编号。 这个方法是同步的，保证了在执行的时候不会进行异步操作，避免了产生有相同的线ID的出现，源码如下:
```java
/* For autonumbering anonymous threads. */
 private static int threadInitNumber;
 private static synchronized int nextThreadNum() {
        return threadInitNumber++;
    }
```
我们要注意的一点是，Thread的是实现了Runnable接口的，那么我们其中的run 方法应该怎么执行执行呢？ 在init（）方法中，我们可以找到实现了’run’方法， 它是如下实现的:
```java
/**
 * If this thread was constructed using a separate
 * <code>Runnable</code> run object, then that
 * <code>Runnable</code> object's <code>run</code> method is called;
 * otherwise, this method does nothing and returns.
 * <p>
 * Subclasses of <code>Thread</code> should override this method.
 *
 * @see     #start()
 * @see     #stop()
 * @see     #Thread(ThreadGroup, Runnable, String)
 */
@Override
public void run() {
    if (target != null) {
        target.run();
    }
}
```
原来里面就做了这个简单的工作，调用了target中个run方法呀！ 但是这个target是什么东西呢？ 就是我们实现了Runnable接口的对象呀，所以我们在构造方法中会传入一个Runnable接口实现对象， 这个就是 target， 所以最红线程执行的run方法是我们传入的 对象中的run方法，看到这个思路，我马上又想到了Spring中集成hibernate中的做法是一样的(你想做的操作，在外面你自己定义好，Spring暴露一个接口给你，你实现了就行，按照他的规范，就传入到Spring内部中去了，人家就帮你执行了)。

接着看init（）方法中做了什么： 执行currentThread 方法，而这个方法又是一个本地方法（本地方法是由其他语言编写的，编译成和处理器相关的机器代码，本地方法保存在动态链接库中，即.dll(windows系统)文件中，格式是各个平台专有的，Java方法是与平台无关的，但是本地方法不是，运行中的Java方法调用本地方法时，虚拟机装载包含这个本地方法的动态库， 并调用这个方法，通过本地方法Java程序可以直接访问底层操作系统的资源），接着又做了左了是否有ThreadGroup的判断，如果没有传入线程组的话， 第一是使用SecurityManager中的ThreadGroup， 如果从SecurityManager 中获取不到ThreadGroup()， 那么就从当前线程中获取线程组（parent.getThreadGroup()），最后做了检验和些参数的赋值。

### 重要的属性
接下来，我们来看看Thread类中的重要的属性有哪些吧!
```java
/* Make sure registerNatives is the first thing <clinit> does. */
  // 类加载的时候，调用本地的注册本地方静态方法， 这个方法是本地方法，具体干了什么不知道
  private static native void registerNatives();
  static {
      registerNatives();
  }
  private volatile char  name[];
  private int            priority;
  private Thread         threadQ;
  private long           eetop;
  /* Whether or not to single_step this thread. */
  private boolean     single_step;
  /* Whether or not the thread is a daemon thread. */
  // 设设置这个线程是否是守护线程
  private boolean     daemon = false;
  /* JVM state */
  private boolean     stillborn = false;
  /* What will be run. */
  // 要执行的run方法的对象
  private Runnable target;
  /* The group of this thread */
  // 这个线程的线程组
  private ThreadGroup group;
  /* The context ClassLoader for this thread */
  // 这个线程的上下文类加载器
  private ClassLoader contextClassLoader;
  /* The inherited AccessControlContext of this thread */
  private AccessControlContext inheritedAccessControlContext;
  /* For autonumbering anonymous threads. */
  private static int threadInitNumber;
  private static synchronized int nextThreadNum() {
      return threadInitNumber++;
  }
  /* ThreadLocal values pertaining to this thread. This map is maintained
   * by the ThreadLocal class. */
  ThreadLocal.ThreadLocalMap threadLocals = null;
  /*
   * InheritableThreadLocal values pertaining to this thread. This map is
   * maintained by the InheritableThreadLocal class.
   */
  ThreadLocal.ThreadLocalMap inheritableThreadLocals = null;
  /*
   * The requested stack size for this thread, or 0 if the creator did
   * not specify a stack size.  It is up to the VM to do whatever it
   * likes with this number; some VMs will ignore it.
   */
   // 给这个线程设置的栈的大小,默认为0 
  private long stackSize;
  /*
   * JVM-private state that persists after native thread termination.
   */
  private long nativeParkEventPointer;
  /*
   * Thread ID
   */
   
   //线程id
  private long tid;
  /* For generating thread ID */
  private static long threadSeqNumber;
  /* Java thread status for tools,
   * initialized to indicate thread 'not yet started'
   */
  private volatile int threadStatus = 0;
  private static synchronized long nextThreadID() {
      return ++threadSeqNumber;
  }
  /**
   * The argument supplied to the current call to
   * java.util.concurrent.locks.LockSupport.park.
   * Set by (private) java.util.concurrent.locks.LockSupport.setBlocker
   * Accessed using java.util.concurrent.locks.LockSupport.getBlocker
   */
  volatile Object parkBlocker;
  /* The object in which this thread is blocked in an interruptible I/O
   * operation, if any.  The blocker's interrupt method should be invoked
   * after setting this thread's interrupt status.
   */
  private volatile Interruptible blocker;
  private final Object blockerLock = new Object();
  /* Set the blocker field; invoked via sun.misc.SharedSecrets from java.nio code
   */
  void blockedOn(Interruptible b) {
      synchronized (blockerLock) {
          blocker = b;
      }
  }
  /**
   * The minimum priority that a thread can have.
   */
   // 线程执行的最低优先级 为1
  public final static int MIN_PRIORITY = 1;
 /**
   * The default priority that is assigned to a thread.
   */
   // 线程默认的执行优先级为 5
  public final static int NORM_PRIORITY = 5;
  /**
   * The maximum priority that a thread can have.
   */
   // 线程执行的最高的优先级为 10
  public final static int MAX_PRIORITY = 10;
  ```
  线程的优先级在不同的平台上，对应的系统优先级会不同，可能多个优先级对应同一个系统优先级。
优先级高的线程并不一定优先执行，这个由JVM来解释并向系统提供参考.

### 重要的方法
#### start( )方法
```java
/**
    * Causes this thread to begin execution; the Java Virtual Machine
    * calls the <code>run</code> method of this thread.
    * <p>
    * The result is that two threads are running concurrently: the
    * current thread (which returns from the call to the
    * <code>start</code> method) and the other thread (which executes its
    * <code>run</code> method).
    * <p>
    * It is never legal to start a thread more than once.
    * In particular, a thread may not be restarted once it has completed
    * execution.
    *
    * @exception  IllegalThreadStateException  if the thread was already
    *               started.
    * @see        #run()
    * @see        #stop()
    */
   public synchronized void start() {
       /**
        * This method is not invoked for the main method thread or "system"
        * group threads created/set up by the VM. Any new functionality added
        * to this method in the future may have to also be added to the VM.
        *
        * A zero status value corresponds to state "NEW".
        */
       if (threadStatus != 0)
           throw new IllegalThreadStateException();
       /* Notify the group that this thread is about to be started
        * so that it can be added to the group's list of threads
        * and the group's unstarted count can be decremented. */
       group.add(this);
       boolean started = false;
       try {
           start0();
           started = true;
       } finally {
           try {
               if (!started) {
                   group.threadStartFailed(this);
               }
           } catch (Throwable ignore) {
               /* do nothing. If start0 threw a Throwable then
                 it will be passed up the call stack */
           }
       }
   }
private native void start0();
```
start( )方法是同步的，并且是启动这个线程进行执行，Java虚拟机将会调用这个线程的run方法，这样产生的结果是，两个线程执行着，其中一个是调用start（）方法的线程执行，另一个线程是执行run方法的线程。在start（）方法中，首先进行的是线程状态的判断，如果是一个JVM新启动的线程，那么threadStatus 的状态是为0的，如果线程不为0 将报出异常， 然后将线程添加到group中， group.add(this)方法中执行的结果是，通知group， 这个线程要执行了，所以可以添加进group中，并且这个线程组中没有没有启动的数量将减少。然后设置标识为， 接着调用本地方法started0，如果没有启动成功，将会通知这个线程组，没有启动成功，捕捉的异常将会忽略。

#### exit( )方法
```java
/**
 * This method is called by the system to give a Thread
 * a chance to clean up before it actually exits.
 */
private void exit() {
    if (group != null) {
        group.threadTerminated(this);
        group = null;
    }
    /* Aggressively null out all reference fields: see bug 4006245 */
    target = null;
    /* Speed the release of some of these resources */
    threadLocals = null;
    inheritableThreadLocals = null;
    inheritedAccessControlContext = null;
    blocker = null;
    uncaughtExceptionHandler = null;
}
```
这个方法的解释是说，exit( )是由系统调用的，用于线程在真正的退出前进行一些清理的操作。看看里面进行的操作是什么吧，可以看出，里面执行的是group 赋值为null了， 将target引用进行释放，同时释放了threadLocals所占用的资源，等等属性都赋值为null。

#### sleep()方法
```java
 public static native void sleep(long millis) throws InterruptedException;
public static void sleep(long millis, int nanos)
    throws InterruptedException {
        if (millis < 0) {
            throw new IllegalArgumentException("timeout value is negative");
        }
        if (nanos < 0 || nanos > 999999) {
            throw new IllegalArgumentException(
                                "nanosecond timeout value out of range");
        }
        if (nanos >= 500000 || (nanos != 0 && millis == 0)) {
            millis++;
        }
        sleep(millis);
    }
```
sleep（）方法在使用线程的时候，用的是比较多的。 这个方法的作用使得当前线程休眠一定的时间，但是这个期间是不释放持有的锁的。这个方法里面首先进行的是休眠时间的判断，然后又是调用本地方法。

#### stop( )方法
```java
@Deprecated
  public final void stop() {
      SecurityManager security = System.getSecurityManager();
      if (security != null) {
        //检查是否有权限
          checkAccess();
          if (this != Thread.currentThread()) {
              security.checkPermission(SecurityConstants.STOP_THREAD_PERMISSION);
          }
      }
      // A zero status value corresponds to "NEW", it can't change to
      // not-NEW because we hold the lock.
      if (threadStatus != 0) {
          resume(); // Wake up thread if it was suspended; no-op otherwise
      }
      // The VM can handle all thread states
      stop0(new ThreadDeath());
  }
```
stop( )方法是停止线程的执行，这个方法是一个不推荐使用的方法，已经被废弃了，因为使用该方法会出现异常情况。

#### join（）方法
join方法是等待该线程执行，直到超时或者终止，可以作为线程通信的一种方式，A线程调用B线程的join（阻塞），等待B完成后再往下执行。 join（）方法中重载了多个方法，但是主要的方法是下面的方法。
```java
/**
    * Waits at most {@code millis} milliseconds for this thread to
    * die. A timeout of {@code 0} means to wait forever.
    *
    * <p> This implementation uses a loop of {@code this.wait} calls
    * conditioned on {@code this.isAlive}. As a thread terminates the
    * {@code this.notifyAll} method is invoked. It is recommended that
    * applications not use {@code wait}, {@code notify}, or
    * {@code notifyAll} on {@code Thread} instances.
    *
    * @param  millis
    *         the time to wait in milliseconds
    *
    * @throws  IllegalArgumentException
    *          if the value of {@code millis} is negative
    *
    * @throws  InterruptedException
    *          if any thread has interrupted the current thread. The
    *          <i>interrupted status</i> of the current thread is
    *          cleared when this exception is thrown.
    */
   public final synchronized void join(long millis)
   throws InterruptedException {
       //得到当前的系统给时间
       long base = System.currentTimeMillis();
       long now = 0;
       if (millis < 0) {
           throw new IllegalArgumentException("timeout value is negative");
       }
       if (millis == 0) {
           //如果是活跃的的
           while (isAlive()) {
           //无限期的等待
               wait(0);
           }
       } else {
           while (isAlive()) {
               long delay = millis - now;
               if (delay <= 0) {
                   break;
               }
               //有限期的进行等待
               wait(delay);
               now = System.currentTimeMillis() - base;
           }
       }
   }
```
#### interrupt()方法
```java
public void interrupt() {
    if (this != Thread.currentThread())
        checkAccess();
    synchronized (blockerLock) {
        Interruptible b = blocker;
        if (b != null) {
            interrupt0();           // Just to set the interrupt flag
            b.interrupt(this);
            return;
        }
    }
    interrupt0();
}
```
interrupt()方法是中断当前的线程， 其实Thread类中有三个方法，比较容易混淆，在这里解释一下。

- interrupt:将线程置为中断状态
- isInterrupt:线程是否中断
- interrupted:返回线程的上次的中断状态，并清除中断状态。

一般来说，阻塞函数：如Thread.sleep、Thread.join、Object.wait等在检查到线程的中断状态的时候，会抛出InteruptedExeption, 同时会清除线程的中断状态。

对于InterruptedException的处理，可以有两种情况：

1. 外层代码可以处理这个异常，直接抛出这个异常即可
2. 如果不能抛出这个异常，比如在run()方法内，因为在得到这个异常的同时，线程的中断状态已经被清除了，需要保留线程的中断状态，则需要调用Thread.currentThread().interrupt()

### 线程的状态
```java
public enum State {
       /**
        * Thread state for a thread which has not yet started.
        */
        //新建立的线程，还没有调用start()方法
       NEW,
       /**
        * Thread state for a runnable thread.  A thread in the runnable
        * state is executing in the Java virtual machine but it may
        * be waiting for other resources from the operating system
        * such as processor.
        */
        // 可以运行，需要再等到其他资源(如CPU)就绪才能运行
       RUNNABLE,
       /**
        * Thread state for a thread blocked waiting for a monitor lock.
        * A thread in the blocked state is waiting for a monitor lock
        * to enter a synchronized block/method or
        * reenter a synchronized block/method after calling
        * {@link Object#wait() Object.wait}.
        */
        //线程调用wait（）后等待内置锁进入同步方法或块中
       BLOCKED,
       /**
        * Thread state for a waiting thread.
        * A thread is in the waiting state due to calling one of the
        * following methods:
        *
        * <p>A thread in the waiting state is waiting for another thread to
        * perform a particular action.
        *
        * For example, a thread that has called <tt>Object.wait()</tt>
        * on an object is waiting for another thread to call
        * <tt>Object.notify()</tt> or <tt>Object.notifyAll()</tt> on
        * that object. A thread that has called <tt>Thread.join()</tt>
        * is waiting for a specified thread to terminate.
        */
        // 在调用无参的wait(),Thread.join()或LockSupport.lock()方法后进入等待状态  
       WAITING,
       /**
        * Thread state for a waiting thread with a specified waiting time.
        * A thread is in the timed waiting state due to calling one of
        * the following methods with a specified positive waiting time:
        */
          // 调用Thread.sleep(), 有时间参数的wait(), 有时间参数的Thread.join(), LockSupport.parkNanos或LockSupport.parkUtil方法后进行有期限的等待状态  
       TIMED_WAITING,
       /**
        * Thread state for a terminated thread.
        * The thread has completed execution.
        */
           // 执行完毕的线程状态  
       TERMINATED;
   }
  public State getState() { 
   // get current thread state 
   return sun.misc.VM.toThreadState(threadStatus);     }
```

### getContextClassLoader()方法
这个方法是上下文类加载器：
```java
@CallerSensitive
    public ClassLoader getContextClassLoader() {
        if (contextClassLoader == null)
            return null;
        SecurityManager sm = System.getSecurityManager();
        if (sm != null) {
            ClassLoader.checkClassLoaderPermission(contextClassLoader,
                                                   Reflection.getCallerClass());
        }
        return contextClassLoader;
    }
    
// 设置类加载器
 public void setContextClassLoader(ClassLoader cl) {
        SecurityManager sm = System.getSecurityManager();
        if (sm != null) {
            sm.checkPermission(new RuntimePermission("setContextClassLoader"));
        }
        contextClassLoader = cl;
    }
```

原文地址：https://wangchangchung.github.io/2016/12/05/Java%E5%B8%B8%E7%94%A8%E7%B1%BB%E6%BA%90%E7%A0%81%E2%80%94%E2%80%94Thread%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90/ 感谢wangchangchung大神的知识分享
