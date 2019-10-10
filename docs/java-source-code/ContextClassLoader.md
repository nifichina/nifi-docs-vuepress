# 深入理解Java线程上下文类加载器
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com**
***
内容：

## 先来了解一下什么是SPI

先来看看什么是SPI机制，引用一段博文中的介绍：

> SPI机制简介
SPI的全名为Service Provider Interface，主要是应用于厂商自定义组件或插件中。在java.util.ServiceLoader的文档里有比较详细的介绍。<br>简单的总结下java SPI机制的思想：我们系统里抽象的各个模块，往往有很多不同的实现方案，比如日志模块、xml解析模块、jdbc模块等方案。面向的对象的设计里，我们一般推荐模块之间基于接口编程，模块之间不对实现类进行硬编码。一旦代码里涉及具体的实现类，就违反了可拔插的原则，如果需要替换一种实现，就需要修改代码。为了实现在模块装配的时候能不在程序里动态指明，这就需要一种服务发现机制。 <br>Java SPI就是提供这样的一个机制：为某个接口寻找服务实现的机制。有点类似IOC的思想，就是将装配的控制权移到程序之外，在模块化设计中这个机制尤其重要。<br>
**SPI具体约定**<br>
Java SPI的具体约定为：当服务的提供者提供了服务接口的一种实现之后，在jar包的META-INF/services/目录里同时创建一个**以服务接口命名**的文件。该文件里就是实现该服务接口的具体实现类。而当外部程序装配这个模块的时候，就能通过该jar包META-INF/services/里的配置文件找到具体的实现类名，并装载实例化，完成模块的注入。基于这样一个约定就能很好的找到服务接口的实现类，而不需要再代码里制定。jdk提供服务实现查找的一个工具类：java.util.**ServiceLoader**

## 什么是线程上下文类加载器

> 线程上下文类加载器（context class loader）是从 JDK 1.2 开始引入的。类 java.lang.Thread中的方法 getContextClassLoader()和 setContextClassLoader(ClassLoader cl)用来获取和设置线程的上下文类加载器。<br>如果没有通过 setContextClassLoader(ClassLoader cl)方法进行设置的话，线程将继承其父线程的上下文类加载器。<br>Java 应用运行的初始线程的上下文类加载器是系统类加载器（AppClassLoader）。在线程中运行的代码可以通过此类加载器来加载类和资源。

> Java 提供了很多服务提供者接口（Service Provider Interface，SPI），允许第三方为这些接口提供实现。常见的 SPI 有 **JDBC**、JCE、JNDI、JAXP 和 JBI 等。这些 SPI 的接口由 Java 核心库来提供，如 JAXP 的 SPI 接口定义包含在 javax.xml.parsers包中。这些 SPI 的实现代码很可能是作为 Java 应用所依赖的 jar 包被包含进来，可以通过类路径（CLASSPATH）来找到，如实现了 JAXP SPI 的 Apache Xerces所包含的 jar 包。SPI 接口中的代码经常需要加载具体的实现类。如 JAXP 中的 javax.xml.parsers.DocumentBuilderFactory类中的 newInstance()方法用来生成一个新的 DocumentBuilderFactory的实例。这里的实例的真正的类是继承自 javax.xml.parsers.DocumentBuilderFactory，由 SPI 的实现所提供的。如在 Apache Xerces 中，实现的类是 org.apache.xerces.jaxp.DocumentBuilderFactoryImpl。<br>而问题在于，SPI 的接口是 Java 核心库的一部分，是由引导类加载器（BootstrapClassLoader）来加载的；SPI 实现的 Java 类一般是由系统类加载器（AppClassLoader）来加载的。引导类加载器是无法找到 SPI 的实现类的，因为它只加载 Java 的核心库。它也不能代理给系统类加载器，因为它是系统类加载器的祖先类加载器。也就是说，类加载器的**全盘负责委托机制**无法解决这个问题。

> 线程上下文类加载器正好解决了这个问题。如果不做任何的设置，Java 应用的线程的上下文类加载器默认就是系统上下文类加载器。在 SPI 接口的代码中使用线程上下文类加载器，就可以成功的加载到 SPI 实现的类。线程上下文类加载器在很多 SPI 的实现中都会用到。

Java默认的线程上下文类加载器是系统类加载器(AppClassLoader)。以下代码摘自sun.misc.Launch的无参构造函数Launch()。
```java
// Now create the class loader to use to launch the application
try {
    loader = AppClassLoader.getAppClassLoader(extcl);
} catch (IOException e) {
    throw new InternalError(
"Could not create application class loader" );
}
 
// Also set the context class loader for the primordial thread.
Thread.currentThread().setContextClassLoader(loader);
```

> 使用线程上下文类加载器，可以在执行线程中抛弃双亲委派加载链模式，使用线程上下文里的类加载器加载类。典型的例子有：通过线程上下文来加载第三方库jndi实现，而不依赖于双亲委派。大部分java application服务器(jboss, tomcat..)也是采用contextClassLoader来处理web服务。还有一些采用hot swap特性的框架，也使用了线程上下文类加载器，比如 seasar (full stack framework in japenese)。

线程上下文从根本解决了一般应用不能违背双亲委派模式的问题。使java类加载体系显得更灵活。随着多核时代的来临，相信多线程开发将会越来越多地进入程序员的实际编码过程中。因此，在编写基础设施时， 通过使用线程上下文来加载类，应该是一个很好的选择。

当然，好东西都有利弊。使用线程上下文加载类，也要注意保证多个需要通信的线程间的类加载器应该是同一个，防止因为不同的类加载器导致类型转换异常(ClassCastException)。

defineClass(String name, byte[] b, int off, int len,ProtectionDomain protectionDomain)是java.lang.Classloader提供给开发人员，用来自定义加载class的接口。使用该接口，可以动态的加载class文件。例如在jdk中，URLClassLoader是配合findClass方法来使用defineClass，可以从网络或硬盘上加载class。而使用类加载接口，并加上自己的实现逻辑，还可以定制出更多的高级特性。

## JDBC案例分析

我们先来看平时是如何使用mysql获取数据库连接的：

```java
// 加载Class到AppClassLoader（系统类加载器），然后注册驱动类
// Class.forName("com.mysql.jdbc.Driver").newInstance(); 
String url = "jdbc:mysql://localhost:3306/testdb";    
// 通过java库获取数据库连接
Connection conn = java.sql.DriverManager.getConnection(url, "name", "password") 
```
以上就是mysql注册驱动及获取connection的过程，各位可以发现经常写的Class.forName被注释掉了，但依然可以正常运行，这是为什么呢？这是因为从Java1.6开始自带的jdbc4.0版本已支持SPI服务加载机制，只要mysql的jar包在类路径中，就可以注册mysql驱动。

那到底是在哪一步自动注册了mysql driver的呢？重点就在DriverManager.getConnection()中。**我们都是知道调用类的静态方法会初始化该类，进而执行其静态代码块**，DriverManager的静态代码块就是：
```java
static {
    loadInitialDrivers();
    println("JDBC DriverManager initialized");
}
```
初始化方法loadInitialDrivers()的代码如下：
```java
private static void loadInitialDrivers() {
    String drivers;
    try {
		// 先读取系统属性
		drivers = AccessController.doPrivileged(new PrivilegedAction<String>() {
            public String run() {
                return System.getProperty("jdbc.drivers");
            }
        });
    } catch (Exception ex) {
        drivers = null;
    }
    // 通过SPI加载驱动类
    AccessController.doPrivileged(new PrivilegedAction<Void>() {
        public Void run() {
            ServiceLoader<Driver> loadedDrivers = ServiceLoader.load(Driver.class);
            Iterator<Driver> driversIterator = loadedDrivers.iterator();
            try{
                while(driversIterator.hasNext()) {
                    driversIterator.next();
                }
            } catch(Throwable t) {
                // Do nothing
            }
            return null;
        }
    });
    // 继续加载系统属性中的驱动类
    if (drivers == null || drivers.equals("")) {
        return;
    }
    
    String[] driversList = drivers.split(":");
    println("number of Drivers:" + driversList.length);
    for (String aDriver : driversList) {
        try {
            println("DriverManager.Initialize: loading " + aDriver);
            // 使用AppClassloader加载
            Class.forName(aDriver, true,
                    ClassLoader.getSystemClassLoader());
        } catch (Exception ex) {
            println("DriverManager.Initialize: load failed: " + ex);
        }
    }
}
```
从上面可以看出JDBC中的DriverManager的加载Driver的步骤顺序依次是：

1. 通过SPI方式，读取 META-INF/services 下文件中的类名，使用上下文类加载器加载；
2. 通过System.getProperty("jdbc.drivers")获取设置，然后通过系统类加载器加载。

下面详细分析SPI加载的那段代码。
### JDBC中的SPI
```java
ServiceLoader<Driver> loadedDrivers = ServiceLoader.load(Driver.class);
Iterator<Driver> driversIterator = loadedDrivers.iterator();

try{
    while(driversIterator.hasNext()) {
        driversIterator.next();
    }
} catch(Throwable t) {
// Do nothing
}
```
注意driversIterator.next()最终就是调用Class.forName(DriverName, false, loader)方法，也就是最开始我们注释掉的那一句代码。好，那句因SPI而省略的代码现在解释清楚了，那我们继续看给这个方法传的loader是怎么来的。

因为这句Class.forName(DriverName, false, loader)代码所在的类在java.util.ServiceLoader类中，而ServiceLoader.class又加载在BootrapLoader中，因此传给 forName 的 loader 必然不能是BootrapLoader，这时候只能使用上下文类加载器了，也就是说把自己加载不了的类加载到上下文类加载器中（通过Thread.currentThread()获取，简直作弊啊！）。上面那篇文章末尾也讲到了上下文类加载器默认使用当前执行的是代码所在应用的系统类加载器AppClassLoader。

再看下看ServiceLoader.load(Class)的代码，的确如此：
```java
public static <S> ServiceLoader<S> load(Class<S> service) {
    ClassLoader cl = Thread.currentThread().getContextClassLoader();
    return ServiceLoader.load(service, cl);
}
```
ContextClassLoader默认存放了AppClassLoader的引用，由于它是在运行时被放在了线程中，所以不管当前程序处于何处（BootstrapClassLoader或是ExtClassLoader等），在任何需要的时候都可以用Thread.currentThread().getContextClassLoader()取出应用程序类加载器来完成需要的操作。

**到这儿差不多把SPI机制解释清楚了。直白一点说就是，我（JDK）提供了一种帮你（第三方实现者）加载服务（如数据库驱动、日志库）的便捷方式，只要你遵循约定（把类名写在/META-INF里），那当我启动时我会去扫描所有jar包里符合约定的类名，再调用forName加载，但我的ClassLoader是没法加载的，那就把它加载到当前执行线程的TCCL里，后续你想怎么操作（驱动实现类的static代码块）就是你的事了。**

好，刚才说的驱动实现类就是com.mysql.jdbc.Driver.Class，它的静态代码块里头又写了什么呢？是否又用到了TCCL呢？我们继续看下一个例子。

### 校验实例的归属

com.mysql.jdbc.Driver加载后运行的静态代码块:
```java
static {
	try {
		// Driver已经加载到上下文类加载器中了，此时可以直接实例化
		java.sql.DriverManager.registerDriver(new com.mysql.jdbc.Driver());
	} catch (SQLException E) {
		throw new RuntimeException("Can't register driver!");
	}
}
```
registerDriver方法将driver实例注册到系统的java.sql.DriverManager类中，其实就是add到它的一个名为registeredDrivers的静态成员CopyOnWriteArrayList中 。

到此驱动注册基本完成，接下来我们回到最开始的那段样例代码：java.sql.DriverManager.getConnection()。它最终调用了以下方法：

```java
private static Connection getConnection(
     String url, java.util.Properties info, Class<?> caller) throws SQLException {
     /* 传入的caller由Reflection.getCallerClass()得到，该方法
      * 可获取到调用本方法的Class类，这儿获取到的是当前应用的类加载器
      */
     ClassLoader callerCL = caller != null ? caller.getClassLoader() : null;
     synchronized(DriverManager.class) {
         if (callerCL == null) {
             callerCL = Thread.currentThread().getContextClassLoader();
         }
     }

     if(url == null) {
         throw new SQLException("The url cannot be null", "08001");
     }

     SQLException reason = null;
     // 遍历注册到registeredDrivers里的Driver类
     for(DriverInfo aDriver : registeredDrivers) {
         // 检查Driver类有效性
         if(isDriverAllowed(aDriver.driver, callerCL)) {
             try {
                 println("    trying " + aDriver.driver.getClass().getName());
                 // 调用com.mysql.jdbc.Driver.connect方法获取连接
                 Connection con = aDriver.driver.connect(url, info);
                 if (con != null) {
                     // Success!
                     return (con);
                 }
             } catch (SQLException ex) {
                 if (reason == null) {
                     reason = ex;
                 }
             }

         } else {
             println("    skipping: " + aDriver.getClass().getName());
         }

     }
     throw new SQLException("No suitable driver found for "+ url, "08001");
 }
```
```java
private static boolean isDriverAllowed(Driver driver, ClassLoader classLoader) {
    boolean result = false;
    if(driver != null) {
        Class<?> aClass = null;
        try {
	    // 传入的classLoader为调用getConnetction的当前类加载器，从中寻找driver的class对象
            aClass =  Class.forName(driver.getClass().getName(), true, classLoader);
        } catch (Exception ex) {
            result = false;
        }
	// 注意，只有同一个类加载器中的Class使用==比较时才会相等，此处就是校验用户注册Driver时该Driver所属的类加载器与调用时的是否同一个
	// driver.getClass()拿到就是当初执行Class.forName("com.mysql.jdbc.Driver")时的应用AppClassLoader
        result = ( aClass == driver.getClass() ) ? true : false;
    }

    return result;
}
```
由于上下文类加载器本质就是当前应用类加载器，所以之前的初始化就是加载到当前的类加载器中，这一步就是校验存放的driver是否属于调用者的Classloader。例如在下文中的tomcat里，多个webapp都有自己的Classloader，如果它们都自带 mysql-connect.jar包，那底层Classloader的DriverManager里将注册多个不同类加载器的Driver实例，想要区分只能靠上下文类加载器了。

## 案例

### Tomcat中的类加载器

在Tomcat目录结构中，有三组目录（“/common/*”,“/server/*”和“shared/*”）可以存放公用Java类库，此外还有第四组Web应用程序自身的目录“/WEB-INF/*”，把java类库放置在这些目录中的含义分别是：

* 放置在common目录中：类库可被Tomcat和所有的Web应用程序共同使用。
* 放置在server目录中：类库可被Tomcat使用，但对所有的Web应用程序都不可见。
* 放置在shared目录中：类库可被所有的Web应用程序共同使用，但对Tomcat自己不可见。
* 放置在/WebApp/WEB-INF目录中：类库仅仅可以被此Web应用程序使用，对Tomcat和其他Web应用程序都不可见。

为了支持这套目录结构，并对目录里面的类库进行加载和隔离，Tomcat自定义了多个类加载器，这些类加载器按照经典的双亲委派模型来实现，如下图所示

![](./img/classloader.png)

对于运行在 Java EE容器中的 Web 应用来说，类加载器的实现方式与一般的 Java 应用有所不同。不同的 Web 容器的实现方式也会有所不同。以 Apache Tomcat 来说，每个 Web 应用都有一个对应的类加载器实例。该类加载器也使用双亲委派模型，所不同的是它是首先尝试去加载某个类，如果找不到再代理给父类加载器。这与一般类加载器的顺序是相反的。这是 Java Servlet 规范中的推荐做法，其目的是使得 Web 应用自己的类的优先级高于 Web 容器提供的类。这种代理模式的一个例外是：Java 核心库的类是不在查找范围之内的。这也是为了保证 Java 核心库的类型安全。
　　绝大多数情况下，Web 应用的开发人员不需要考虑与类加载器相关的细节。下面给出几条简单的原则：
　　（1）每个 Web 应用自己的 Java 类文件和使用的库的 jar 包，分别放在 WEB-INF/classes和 WEB-INF/lib目录下面。
　　（2）多个应用共享的 Java 类文件和 jar 包，分别放在 Web 容器指定的由所有 Web 应用共享的目录下面。
　　（3）当出现找不到类的错误时，检查当前类的类加载器和当前线程的上下文类加载器是否正确。

灰色背景的3个类加载器是JDK默认提供的类加载器，这3个加载器的作用前面已经介绍过了。而 CommonClassLoader、CatalinaClassLoader、SharedClassLoader 和 WebAppClassLoader 则是 Tomcat 自己定义的类加载器，它们分别加载 /common/*、/server/*、/shared/* 和 /WebApp/WEB-INF/* 中的 Java 类库。其中 WebApp 类加载器和 Jsp 类加载器通常会存在多个实例，每一个 Web 应用程序对应一个 WebApp 类加载器，每一个 JSP 文件对应一个 Jsp 类加载器。

从图中的委派关系中可以看出，CommonClassLoader 能加载的类都可以被 CatalinaClassLoader 和 SharedClassLoader 使用，而 CatalinaClassLoader 和 SharedClassLoader 自己能加载的类则与对方相互隔离。WebAppClassLoader 可以使用 SharedClassLoader 加载到的类，但各个 WebAppClassLoader 实例之间相互隔离。而 JasperLoader 的加载范围仅仅是这个 JSP 文件所编译出来的那一个 Class，它出现的目的就是为了被丢弃：当服务器检测到 JSP 文件被修改时，会替换掉目前的 JasperLoader 的实例，并通过再建立一个新的 Jsp 类加载器来实现 JSP 文件的 HotSwap 功能。

### Spring加载问题

Tomcat 加载器的实现清晰易懂，并且采用了官方推荐的“正统”的使用类加载器的方式。这时作者提一个问题：如果有 10 个 Web 应用程序都用到了spring的话，可以把Spring的jar包放到 common 或 shared 目录下让这些程序共享。Spring 的作用是管理每个web应用程序的bean，getBean时自然要能访问到应用程序的类，而用户的程序显然是放在 /WebApp/WEB-INF 目录中的（由 WebAppClassLoader 加载），那么在 CommonClassLoader 或 SharedClassLoader 中的 Spring 容器如何去加载并不在其加载范围的用户程序（/WebApp/WEB-INF/）中的Class呢？

**解答**

答案呼之欲出：spring根本不会去管自己被放在哪里，它统统使用上下文类加载器来加载类，而上下文类加载器默认设置为了WebAppClassLoader，也就是说哪个WebApp应用调用了spring，spring就去取该应用自己的WebAppClassLoader来加载bean，简直完美~

**源码分析**

有兴趣的可以接着看看具体实现。在web.xml中定义的listener为org.springframework.web.context.ContextLoaderListener，它最终调用了org.springframework.web.context.ContextLoader类来装载bean，具体方法如下（删去了部分不相关内容）：

```java
public WebApplicationContext initWebApplicationContext(ServletContext servletContext) {
	try {
		// 创建WebApplicationContext
		if (this.context == null) {
			this.context = createWebApplicationContext(servletContext);
		}
		// 将其保存到该webapp的servletContext中		
		servletContext.setAttribute(WebApplicationContext.ROOT_WEB_APPLICATION_CONTEXT_ATTRIBUTE, this.context);
		// 获取线程上下文类加载器，默认为WebAppClassLoader
		ClassLoader ccl = Thread.currentThread().getContextClassLoader();
		// 如果spring的jar包放在每个webapp自己的目录中
		// 此时线程上下文类加载器会与本类的类加载器（加载spring的）相同，都是WebAppClassLoader
		if (ccl == ContextLoader.class.getClassLoader()) {
			currentContext = this.context;
		}
		else if (ccl != null) {
			// 如果不同，也就是上面说的那个问题的情况，那么用一个map把刚才创建的WebApplicationContext及对应的WebAppClassLoader存下来
			// 一个webapp对应一个记录，后续调用时直接根据WebAppClassLoader来取出
			currentContextPerThread.put(ccl, this.context);
		}
		
		return this.context;
	}
	catch (RuntimeException ex) {
		logger.error("Context initialization failed", ex);
		throw ex;
	}
	catch (Error err) {
		logger.error("Context initialization failed", err);
		throw err;
	}
}
```
具体说明都在注释中，spring考虑到了自己可能被放到其他位置，所以直接用上下文类加载器来解决所有可能面临的情况。

### hot swap类加载器实现

下面是一个简单的hot swap类加载器实现。hot swap即热插拔的意思，这里表示一个类已经被一个加载器加载了以后，在不卸载它的情况下重新再加载它一次。我们知道Java缺省的加载器对相同全名的类只会加载一次，以后直接从缓存中取这个Class object。因此要实现hot swap，必须在加载的那一刻进行拦截，先判断是否已经加载，若是则重新加载一次，否则直接首次加载它。我们从URLClassLoader继承，加载类的过程都代理给系统类加载器URLClassLoader中的相应方法来完成。

```java
package classloader;
 
import java.net.URL;
import java.net.URLClassLoader;
 
/**
 * 可以重新载入同名类的类加载器实现
 * 放弃了双亲委派的加载链模式，需要外部维护重载后的类的成员变量状态
 */
public class HotSwapClassLoader extends URLClassLoader {
 
    public HotSwapClassLoader(URL[] urls) {
        super(urls);
    }
 
    public HotSwapClassLoader(URL[] urls, ClassLoader parent) {
        super(urls, parent);
    }
 
    // 下面的两个重载load方法实现类的加载，仿照ClassLoader中的两个loadClass()
    // 具体的加载过程代理给父类中的相应方法来完成
    public Class<?> load(String name) throws ClassNotFoundException {
        return load(name, false);
    }
 
    public Class<?> load(String name, boolean resolve) throws ClassNotFoundException {
        // 若类已经被加载，则重新再加载一次
        if (null != super.findLoadedClass(name)) {
            return reload(name, resolve);
        }
        // 否则用findClass()首次加载它
        Class<?> clazz = super.findClass(name);
        if (resolve) {
            super.resolveClass(clazz);
        }
        return clazz;
    }
 
    public Class<?> reload(String name, boolean resolve) throws ClassNotFoundException {
        return new HotSwapClassLoader(super.getURLs(), super.getParent()).load(
                name, resolve);
    }
}
```
两个重载的load方法参数与ClassLoader类中的两个loadClass()相似。在load的实现中，用findLoadedClass()查找指定的类是否已经被祖先加载器加载了，若已加载则重新再加载一次，从而放弃了双亲委派的方式（这种方式只会加载一次）。若没有加载则用自身的findClass()来首次加载它。<br>
　　下面是使用示例：
```java
package classloader;
 
public class A {
    
    private B b;
 
    public void setB(B b) {
        this.b = b;
    }
 
    public B getB() {
        return b;
    }
}
```
```java
package classloader;
 
public class B {
    
}
```
```java
package classloader;
 
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.MalformedURLException;
import java.net.URL;
 
public class TestHotSwap {
 
    public static void main(String args[]) throws MalformedURLException {
        A a = new A();  // 加载类A
        B b = new B();  // 加载类B
        a.setB(b);  // A引用了B，把b对象拷贝到A.b
        System.out.printf("A classLoader is %s\n", a.getClass().getClassLoader());
        System.out.printf("B classLoader is %s\n", b.getClass().getClassLoader());
        System.out.printf("A.b classLoader is %s\n", a.getB().getClass().getClassLoader());
 
        try {
            URL[] urls = new URL[]{ new URL("file:///C:/Users/JackZhou/Documents/NetBeansProjects/classloader/build/classes/") };
            HotSwapClassLoader c1 = new HotSwapClassLoader(urls, a.getClass().getClassLoader());
            Class clazz = c1.load("classloader.A");  // 用hot swap重新加载类A
            Object aInstance = clazz.newInstance();  // 创建A类对象
            Method method1 = clazz.getMethod("setB", B.class);  // 获取setB(B b)方法
            method1.invoke(aInstance, b);    // 调用setB(b)方法，重新把b对象拷贝到A.b
            Method method2 = clazz.getMethod("getB");  // 获取getB()方法
            Object bInstance = method2.invoke(aInstance);  // 调用getB()方法
            System.out.printf("Reloaded A.b classLoader is %s\n", bInstance.getClass().getClassLoader());
        } catch (MalformedURLException | ClassNotFoundException | 
                InstantiationException | IllegalAccessException | 
                NoSuchMethodException | SecurityException | 
                IllegalArgumentException | InvocationTargetException e) {
            e.printStackTrace();
        }
    }
}
```
运行输出：
```java
A classLoader is sun.misc.Launcher$AppClassLoader@73d16e93
B classLoader is sun.misc.Launcher$AppClassLoader@73d16e93
A.b classLoader is sun.misc.Launcher$AppClassLoader@73d16e93
Reloaded A.b classLoader is sun.misc.Launcher$AppClassLoader@73d16e93
```
HotSwapClassLoader加载器的作用是重新加载同名的类。为了实现hot swap，一个类在加载过后，若重新再加载一次，则新的Class object的状态会改变，老的状态数据需要通过其他方式拷贝到重新加载过的类生成的全新Class object实例中来。上面A类引用了B类，加载A时也会加载B（如果B已经加载，则直接从缓存中取出）。在重新加载A后，其Class object中的成员b会重置，因此要重新调用setB(b)拷贝一次。你可以注释掉这行代码，再运行会抛出java.lang.NullPointerException，指示A.b为null。
<br>注意新的A Class object实例所依赖的B类Class object，如果它与老的B Class object实例不是同一个类加载器加载的， 将会抛出类型转换异常(ClassCastException)，表示两种不同的类。因此在重新加载A后，要特别注意给它的B类成员b传入外部值时，它们是否由同一个类加载器加载。为了解决这种问题， HotSwapClassLoader自定义的l/oad方法中，当前类（类A）是由自身classLoader加载的， 而内部依赖的类（类B）还是老对象的classLoader加载的。

## 何时使用Thread.getContextClassLoader()

这是一个很常见的问题，但答案却很难回答。这个问题通常在需要动态加载类和资源的系统编程时会遇到。总的说来动态加载资源时，往往需要从三种类加载器里选择：系统或程序的类加载器、当前类加载器、以及当前线程的上下文类加载器。在程序中应该使用何种类加载器呢？<br>
系统类加载器通常不会使用。此类加载器处理启动应用程序时classpath指定的类，可以通过ClassLoader.getSystemClassLoader()来获得。所有的ClassLoader.getSystemXXX()接口也是通过这个类加载器加载的。一般不要显式调用这些方法，应该让其他类加载器代理到系统类加载器上。由于系统类加载器是JVM最后创建的类加载器，这样代码只会适应于简单命令行启动的程序。一旦代码移植到EJB、Web应用或者Java Web Start应用程序中，程序肯定不能正确执行。<br>
因此一般只有两种选择，当前类加载器和线程上下文类加载器。当前类加载器是指当前方法所在类的加载器。这个类加载器是运行时类解析使用的加载器，Class.forName(String)和Class.getResource(String)也使用该类加载器。代码中X.class的写法使用的类加载器也是这个类加载器。<br>
线程上下文类加载器在Java 2(J2SE)时引入。每个线程都有一个关联的上下文类加载器。如果你使用new Thread()方式生成新的线程，新线程将继承其父线程的上下文类加载器。如果程序对线程上下文类加载器没有任何改动的话，程序中所有的线程将都使用系统类加载器作为上下文类加载器。Web应用和Java企业级应用中，应用服务器经常要使用复杂的类加载器结构来实现JNDI（Java命名和目录接口)、线程池、组件热部署等功能，因此理解这一点尤其重要。<br>
为什么要引入线程的上下文类加载器？将它引入J2SE并不是纯粹的噱头，由于Sun没有提供充分的文档解释说明这一点，这使许多开发者很糊涂。实际上，上下文类加载器为同样在J2SE中引入的类加载代理机制提供了后门。通常JVM中的类加载器是按照层次结构组织的，目的是每个类加载器（除了启动整个JVM的原初类加载器）都有一个父类加载器。当类加载请求到来时，类加载器通常首先将请求代理给父类加载器。只有当父类加载器失败后，它才试图按照自己的算法查找并定义当前类。<br>
有时这种模式并不能总是奏效。这通常发生在JVM核心代码必须动态加载由应用程序动态提供的资源时。拿JNDI为例，它的核心是由JRE核心类(rt.jar)实现的。但这些核心JNDI类必须能加载由第三方厂商提供的JNDI实现。这种情况下调用父类加载器（原初类加载器）来加载只有其子类加载器可见的类，这种代理机制就会失效。解决办法就是让核心JNDI类使用线程上下文类加载器，从而有效的打通类加载器层次结构，逆着代理机制的方向使用类加载器。<br>
顺便提一下，XML解析API(JAXP)也是使用此种机制。当JAXP还是J2SE扩展时，XML解析器使用当前类加载器方法来加载解析器实现。但当JAXP成为J2SE核心代码后，类加载机制就换成了使用线程上下文加载器，这和JNDI的原因相似。<br>
好了，现在我们明白了问题的关键：这两种选择不可能适应所有情况。一些人认为线程上下文类加载器应成为新的标准。但这在不同JVM线程共享数据来沟通时，就会使类加载器的结构乱七八糟。除非所有线程都使用同一个上下文类加载器。而且，使用当前类加载器已成为缺省规则，它们广泛应用在类声明、Class.forName等情景中。即使你想尽可能只使用上下文类加载器，总是有这样那样的代码不是你所能控制的。这些代码都使用代理到当前类加载器的模式。混杂使用代理模式是很危险的。<br>
更为糟糕的是，某些应用服务器将当前类加载器和上下文类加器分别设置成不同的ClassLoader实例。虽然它们拥有相同的类路径，但是它们之间并不存在父子代理关系。想想这为什么可怕：记住加载并定义某个类的类加载器是虚拟机内部标识该类的组成部分，如果当前类加载器加载类X并接着执行它，如JNDI查找类型为Y的数据，上下文类加载器能够加载并定义Y，这个Y的定义和当前类加载器加载的相同名称的类就不是同一个，使用隐式类型转换就会造成异常。<br>
　　这种混乱的状况还将在Java中存在很长时间。在J2SE中还包括以下的功能使用不同的类加载器：<br>
1. JNDI使用线程上下文类加载器。
2. Class.getResource()和Class.forName()使用当前类加载器。
3. JAXP使用上下文类加载器。
4. java.util.ResourceBundle使用调用者的当前类加载器。
5. URL协议处理器使用java.protocol.handler.pkgs系统属性并只使用系统类加载器。
6. Java序列化API缺省使用调用者当前的类加载器。

这些类加载器非常混乱，没有在J2SE文档中给以清晰明确的说明。<br>
该如何选择类加载器？<br>
如若代码是限于某些特定框架，这些框架有着特定加载规则，则不要做任何改动，让框架开发者来保证其工作（比如应用服务器提供商，尽管他们并不能总是做对）。如在Web应用和EJB中，要使用Class.gerResource来加载资源。<br>

在其他情况下，我们可以自己来选择最合适的类加载器。可以使用策略模式来设计选择机制。其思想是将“总是使用上下文类加载器”或者“总是使用当前类加载器”的决策同具体实现逻辑分离开。往往设计之初是很难预测何种类加载策略是合适的，该设计能够让你可以后来修改类加载策略。<br>

考虑使用下面的代码，这是作者本人在工作中发现的经验。这儿有一个缺省实现，应该可以适应大部分工作场景：
```java
package classloader.context;
 
/**
 * 类加载上下文，持有要加载的类
 */
public class ClassLoadContext {
 
    private final Class m_caller;
 
    public final Class getCallerClass() {
        return m_caller;
    }
 
    ClassLoadContext(final Class caller) {
        m_caller = caller;
    }
}
```
```java
package classloader.context;
 
/**
 * 类加载策略接口
 */
public interface IClassLoadStrategy {
 
    ClassLoader getClassLoader(ClassLoadContext ctx);
}
```
```java

/**
 * 缺省的类加载策略，可以适应大部分工作场景
 */
public class DefaultClassLoadStrategy implements IClassLoadStrategy {
 
    /**
     * 为ctx返回最合适的类加载器，从系统类加载器、当前类加载器
     * 和当前线程上下文类加载中选择一个最底层的加载器
     * @param ctx
     * @return 
     */
    @Override
    public ClassLoader getClassLoader(final ClassLoadContext ctx) {
        final ClassLoader callerLoader = ctx.getCallerClass().getClassLoader();
        final ClassLoader contextLoader = Thread.currentThread().getContextClassLoader();
        ClassLoader result;
 
        // If 'callerLoader' and 'contextLoader' are in a parent-child
        // relationship, always choose the child:
        if (isChild(contextLoader, callerLoader)) {
            result = callerLoader;
        } else if (isChild(callerLoader, contextLoader)) {
            result = contextLoader;
        } else {
            // This else branch could be merged into the previous one,
            // but I show it here to emphasize the ambiguous case:
            result = contextLoader;
        }
        final ClassLoader systemLoader = ClassLoader.getSystemClassLoader();
        // Precaution for when deployed as a bootstrap or extension class:
        if (isChild(result, systemLoader)) {
            result = systemLoader;
        }
        
        return result;
    }
    
    // 判断anotherLoader是否是oneLoader的child
    private boolean isChild(ClassLoader oneLoader, ClassLoader anotherLoader){
        //...
    }
 
    // ... more methods 
}
```
决定应该使用何种类加载器的接口是IClassLoaderStrategy，为了帮助IClassLoadStrategy做决定，给它传递了个ClassLoadContext对象作为参数。ClassLoadContext持有要加载的类。<br>
上面代码的逻辑很简单：如调用类的当前类加载器和上下文类加载器是父子关系，则总是选择子类加载器。对子类加载器可见的资源通常是对父类可见资源的超集，因此如果每个开发者都遵循J2SE的代理规则，这样做大多数情况下是合适的。
<br>当前类加载器和上下文类加载器是兄弟关系时，决定使用哪一个是比较困难的。理想情况下，Java运行时不应产生这种模糊。但一旦发生，上面代码选择上下文类加载器。这是作者本人的实际经验，绝大多数情况下应该能正常工作。你可以修改这部分代码来适应具体需要。一般来说，上下文类加载器要比当前类加载器更适合于框架编程，而当前类加载器则更适合于业务逻辑编程。
<br>最后需要检查一下，以便保证所选类加载器不是系统类加载器的父亲，在开发标准扩展类库时这通常是个好习惯。
<br>注意作者故意没有检查要加载资源或类的名称。Java XML API成为J2SE核心的历程应该能让我们清楚过滤类名并不是好想法。作者也没有试图检查哪个类加载器加载首先成功，而是检查类加载器的父子关系，这是更好更有保证的方法。
<br>下面是类加载器的选择器：
```java

package classloader.context;
 
/**
 * 类加载解析器，获取最合适的类加载器
 */
public abstract class ClassLoaderResolver {
        
    private static IClassLoadStrategy s_strategy;  // initialized in <clinit>
    private static final int CALL_CONTEXT_OFFSET = 3;  // may need to change if this class is redesigned
    private static final CallerResolver CALLER_RESOLVER;  // set in <clinit>
    
    static {
        try {
            // This can fail if the current SecurityManager does not allow
            // RuntimePermission ("createSecurityManager"):
            CALLER_RESOLVER = new CallerResolver();
        } catch (SecurityException se) {
            throw new RuntimeException("ClassLoaderResolver: could not create CallerResolver: " + se);
        }
        s_strategy = new DefaultClassLoadStrategy();  //默认使用缺省加载策略
    }
 
    /**
     * This method selects the best classloader instance to be used for
     * class/resource loading by whoever calls this method. The decision
     * typically involves choosing between the caller's current, thread context,
     * system, and other classloaders in the JVM and is made by the {@link IClassLoadStrategy}
     * instance established by the last call to {@link #setStrategy}.
     * 
     * @return classloader to be used by the caller ['null' indicates the
     * primordial loader]
     */
    public static synchronized ClassLoader getClassLoader() {
        final Class caller = getCallerClass(0); // 获取执行当前方法的类
        final ClassLoadContext ctx = new ClassLoadContext(caller);  // 创建类加载上下文
        return s_strategy.getClassLoader(ctx);  // 获取最合适的类加载器
    }
 
    public static synchronized IClassLoadStrategy getStrategy() {
        return s_strategy;
    }
 
    public static synchronized IClassLoadStrategy setStrategy(final IClassLoadStrategy strategy) {
        final IClassLoadStrategy old = s_strategy;  // 设置类加载策略
        s_strategy = strategy;
        return old;
    }
 
    /**
     * A helper class to get the call context. It subclasses SecurityManager
     * to make getClassContext() accessible. An instance of CallerResolver
     * only needs to be created, not installed as an actual security manager.
     */
    private static final class CallerResolver extends SecurityManager {
        @Override
        protected Class[] getClassContext() {
            return super.getClassContext();  // 获取当执行栈的所有类，native方法
        }
 
    }
 
    /*
     * Indexes into the current method call context with a given
     * offset.
     */
    private static Class getCallerClass(final int callerOffset) {
        return CALLER_RESOLVER.getClassContext()[CALL_CONTEXT_OFFSET
                + callerOffset];  // 获取执行栈上某个方法所属的类
    }
}
```
可通过调用ClassLoaderResolver.getClassLoader()方法来获取类加载器对象，并使用其ClassLoader的接口如loadClass()等来加载类和资源。此外还可使用下面的ResourceLoader接口来取代ClassLoader接口：
```java
package classloader.context;
 
import java.net.URL;
 
public class ResourceLoader {
 
    /**
     * 加载一个类
     * 
     * @param name
     * @return 
     * @throws java.lang.ClassNotFoundException 
     * @see java.lang.ClassLoader#loadClass(java.lang.String)
     */
    public static Class<?> loadClass(final String name) throws ClassNotFoundException {
        //获取最合适的类加载器
        final ClassLoader loader = ClassLoaderResolver.getClassLoader();
        //用指定加载器加载类
        return Class.forName(name, false, loader);
    }
 
    /**
     * 加载一个资源
     * 
     * @param name
     * @return 
     * @see java.lang.ClassLoader#getResource(java.lang.String)
     */
    public static URL getResource(final String name) {
        //获取最合适的类加载器
        final ClassLoader loader = ClassLoaderResolver.getClassLoader();
        //查找指定的资源
        if (loader != null) {
            return loader.getResource(name);
        } else {
            return ClassLoader.getSystemResource(name);
        }
    }
 
    // ... more methods ...
}
```
ClassLoadContext.getCallerClass()返回的类在ClassLoaderResolver或ResourceLoader使用，这样做的目的是让其能找到调用类的类加载器（上下文加载器总是能通过Thread.currentThread().getContextClassLoader()来获得）。注意调用类是静态获得的，因此这个接口不需现有业务方法增加额外的Class参数，而且也适合于静态方法和类初始化代码。具体使用时，可以往这个上下文对象中添加具体部署环境中所需的其他属性。

## 类加载器与OSGi

OSGi是 Java 上的动态模块系统。它为开发人员提供了面向服务和基于组件的运行环境，并提供标准的方式用来管理软件的生命周期。OSGi 已经被实现和部署在很多产品上，在开源社区也得到了广泛的支持。Eclipse就是基于OSGi 技术来构建的。
<br>OSGi 中的每个模块（bundle）都包含 Java 包和类。模块可以声明它所依赖的需要导入（import）的其它模块的 Java 包和类（通过 Import-Package），也可以声明导出（export）自己的包和类，供其它模块使用（通过 Export-Package）。也就是说需要能够隐藏和共享一个模块中的某些 Java 包和类。这是通过 OSGi 特有的类加载器机制来实现的。OSGi 中的每个模块都有对应的一个类加载器。它负责加载模块自己包含的 Java 包和类。当它需要加载 Java 核心库的类时（以 java开头的包和类），它会代理给父类加载器（通常是启动类加载器）来完成。当它需要加载所导入的 Java 类时，它会代理给导出此 Java 类的模块来完成加载。模块也可以显式的声明某些 Java 包和类，必须由父类加载器来加载。只需要设置系统属性 org.osgi.framework.bootdelegation的值即可。
<br>假设有两个模块 bundleA 和 bundleB，它们都有自己对应的类加载器 classLoaderA 和 classLoaderB。在 bundleA 中包含类 com.bundleA.Sample，并且该类被声明为导出的，也就是说可以被其它模块所使用的。bundleB 声明了导入 bundleA 提供的类 com.bundleA.Sample，并包含一个类 com.bundleB.NewSample继承自 com.bundleA.Sample。在 bundleB 启动的时候，其类加载器 classLoaderB 需要加载类 com.bundleB.NewSample，进而需要加载类 com.bundleA.Sample。由于 bundleB 声明了类 com.bundleA.Sample是导入的，classLoaderB 把加载类 com.bundleA.Sample的工作代理给导出该类的 bundleA 的类加载器 classLoaderA。classLoaderA 在其模块内部查找类 com.bundleA.Sample并定义它，所得到的类 com.bundleA.Sample实例就可以被所有声明导入了此类的模块使用。对于以 java开头的类，都是由父类加载器来加载的。如果声明了系统属性 org.osgi.framework.bootdelegation=com.example.core.*，那么对于包 com.example.core中的类，都是由父类加载器来完成的。
<br>OSGi 模块的这种类加载器结构，使得一个类的不同版本可以共存在 Java 虚拟机中，带来了很大的灵活性。不过它的这种不同，也会给开发人员带来一些麻烦，尤其当模块需要使用第三方提供的库的时候。下面提供几条比较好的建议：
1. 如果一个类库只有一个模块使用，把该类库的 jar 包放在模块中，在 Bundle-ClassPath中指明即可。
2. 如果一个类库被多个模块共用，可以为这个类库单独的创建一个模块，把其它模块需要用到的 Java 包声明为导出的。其它模块声明导入这些类。
3. 如果类库提供了 SPI 接口，并且利用线程上下文类加载器来加载 SPI 实现的 Java 类，有可能会找不到 Java 类。如果出现了 NoClassDefFoundError异常，首先检查当前线程的上下文类加载器是否正确。通过 Thread.currentThread().getContextClassLoader()就可以得到该类加载器。该类加载器应该是该模块对应的类加载器。如果不是的话，可以首先通过 class.getClassLoader()来得到模块对应的类加载器，再通过 Thread.currentThread().setContextClassLoader()来设置当前线程的上下文类加载器。

## 总结

线程上下文类加载器的适用场景：

1. 当高层提供了统一接口让低层去实现，同时又要是在高层加载（或实例化）低层的类时，必须通过线程上下文类加载器来帮助高层的ClassLoader找到并加载该类。
2. 当使用本类托管类加载，然而加载本类的ClassLoader未知时，为了隔离不同的调用者，可以取调用者各自的线程上下文类加载器代为托管。


