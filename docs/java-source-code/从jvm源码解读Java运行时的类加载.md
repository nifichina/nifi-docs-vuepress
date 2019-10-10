# 从jvm源码解读Java运行时的类加载（转）
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com**
***
内容：

对于Java项目在运行的时候是如何工作的，这个问题我一直比较模糊，虽然知道是那三种类加载机制（bootstrapClassLoader，extendsionClassLoader和systemAppClassLoader）,但具体是怎么实现的呢？

Java在加载JVM的时候会先加载jdk的一些环境变量，例如jre的路径、jvm的路径等，这些过程都是由C语言实现的。代码位于hotspot\src\share\tools\launcher下面java.c



```java
main(int argc, char ** argv)  
{  
    char *jarfile = 0;  
    char *classname = 0;  
    char *s = 0;  
    char *main_class = NULL;  
    int ret;  
    InvocationFunctions ifn;  
    jlong start, end;  
    char jrepath[MAXPATHLEN], jvmpath[MAXPATHLEN];  
    char ** original_argv = argv;  

    if (getenv("_JAVA_LAUNCHER_DEBUG") != 0) {  
        _launcher_debug = JNI_TRUE;  
        printf("----_JAVA_LAUNCHER_DEBUG----\n");  
    }  
    {  
      int i;  
      original_argv = (char**)JLI_MemAlloc(sizeof(char*)*(argc+1));  
      for(i = 0; i < argc+1; i++)  
        original_argv[i] = argv[i];  
    }  

    CreateExecutionEnvironment(&argc, &argv,  
                               jrepath, sizeof(jrepath),  
                               jvmpath, sizeof(jvmpath),  
                               original_argv);  

    printf("Using java runtime at: %s\n", jrepath);  

    ifn.CreateJavaVM = 0;  
    ifn.GetDefaultJavaVMInitArgs = 0;  

    if (_launcher_debug)  
      start = CounterGet();  
    if (!LoadJavaVM(jvmpath, &ifn)) {  
      exit(6);  
    }  
    if (_launcher_debug) {  
      end   = CounterGet();  
      printf("%ld micro seconds to LoadJavaVM\n",  
             (long)(jint)Counter2Micros(end-start));  
    }  
}
```



当加载完jvm后接下来会设置ClassPath，jvm的堆栈大小



```java
/*     \* If user doesn't specify stack size, check if VM has a preference.
     \* Note that HotSpot no longer supports JNI_VERSION_1_1 but it will
     \* return its default stack size through the init args structure.
     \*/
    if (threadStackSize == 0) {
      struct JDK1_1InitArgs args1_1;
      memset((void*)&args1_1, 0, sizeof(args1_1));
      args1_1.version = JNI_VERSION_1_1;
      ifn.GetDefaultJavaVMInitArgs(&args1_1);  /* ignore return value \*/
      if (args1_1.javaStackSize > 0) {
         threadStackSize = args1_1.javaStackSize;
      }
    }
```



这些准备工作完成后，接下来就开始调用我们Java项目的main方法了（源码见java.c的JavaMain函数）



```java
int JNICALL
JavaMain(void * _args)
{
    struct JavaMainArgs *args = (struct JavaMainArgs *)_args;
    int argc = args->argc;
    char **argv = args->argv;
    char *jarfile = args->jarfile;
    char *classname = args->classname;
    InvocationFunctions ifn = args->ifn;

    JavaVM *vm = 0;
    JNIEnv *env = 0;
    jstring mainClassName;
    jclass mainClass;
    jmethodID mainID;
    jobjectArray mainArgs;
    int ret = 0;
    jlong start, end;
...
}
```



首先会初始化一大批参数，Java程序有两种方式一种是jar包，一种是class. 运行jar,Java -jar  
XXX.jar运行的时候，Java.exe调用GetMainClassName函数，该函数先获得JNIEnv实例然后调用Java类Java.util.jar.JarFileJNIEnv中方法getManifest()并从返回的Manifest对象中取getAttributes("Main-Class")的值即jar包中文件：META-INF/MANIFEST.MF指定的Main-Class的主类名作为运行的主类。之后main函数会调用Java.c中LoadClass方法装载该主类（使用JNIEnv实例的FindClass）。



```java
/*     \* Get the application's main class.
     \*
     \* See bugid 5030265.  The Main-Class name has already been parsed
     \* from the manifest, but not parsed properly for UTF-8 support.
     \* Hence the code here ignores the value previously extracted and
     \* uses the pre-existing code to reextract the value.  This is
     \* possibly an end of release cycle expedient.  However, it has
     \* also been discovered that passing some character sets through
     \* the environment has "strange" behavior on some variants of
     \* Windows.  Hence, maybe the manifest parsing code local to the
     \* launcher should never be enhanced.
     \*
     \* Hence, future work should either:
     \*     1)   Correct the local parsing code and verify that the
     \*          Main-Class attribute gets properly passed through
     \*          all environments,
     \*     2)   Remove the vestages of maintaining main_class through
     \*          the environment (and remove these comments).
     \*/
    if (jarfile != 0) {
        mainClassName = GetMainClassName(env, jarfile);
        if ((*env)->ExceptionOccurred(env)) {
            ReportExceptionDescription(env);
            goto leave;
        }
        if (mainClassName == NULL) {
          const char * format = "Failed to load Main-Class manifest "
                                "attribute from\n%s";
          message = (char*)JLI_MemAlloc((strlen(format) + strlen(jarfile)) *
                                    sizeof(char));
          sprintf(message, format, jarfile);
          messageDest = JNI_TRUE;
          goto leave;
        }
        classname = (char *)(*env)->GetStringUTFChars(env, mainClassName, 0);
        if (classname == NULL) {
            ReportExceptionDescription(env);
            goto leave;
        }
        mainClass = LoadClass(env, classname);
        if(mainClass == NULL) { /* exception occured \*/
            const char * format = "Could not find the main class: %s. Program will exit.";
            ReportExceptionDescription(env);
            message = (char *)JLI_MemAlloc((strlen(format) +                                            strlen(classname)) * sizeof(char) );
            messageDest = JNI_TRUE;
            sprintf(message, format, classname);
            goto leave;
        }
        (*env)->ReleaseStringUTFChars(env, mainClassName, classname);
    } else {
      mainClassName = NewPlatformString(env, classname);
      if (mainClassName == NULL) {
        const char * format = "Failed to load Main Class: %s";
        message = (char *)JLI_MemAlloc((strlen(format) + strlen(classname)) *
                                   sizeof(char) );
        sprintf(message, format, classname);
        messageDest = JNI_TRUE;
        goto leave;
      }
      classname = (char *)(*env)->GetStringUTFChars(env, mainClassName, 0);
      if (classname == NULL) {
        ReportExceptionDescription(env);
        goto leave;
      }
      mainClass = LoadClass(env, classname);
      if(mainClass == NULL) { /* exception occured \*/
        const char * format = "Could not find the main class: %s.  Program will exit.";
        ReportExceptionDescription(env);
        message = (char *)JLI_MemAlloc((strlen(format) +                                        strlen(classname)) * sizeof(char) );
        messageDest = JNI_TRUE;
        sprintf(message, format, classname);
        goto leave;
      }
      (*env)->ReleaseStringUTFChars(env, mainClassName, classname);
    }

    /* Get the application's main method \*/    mainID = (*env)->GetStaticMethodID(env, mainClass, "main",
                                       "([Ljava/lang/String;)V");
    if (mainID == NULL) {
        if ((*env)->ExceptionOccurred(env)) {
            ReportExceptionDescription(env);
        } else {
          message = "No main method found in specified class.";
          messageDest = JNI_TRUE;
        }
        goto leave;
    }

    {    /* Make sure the main method is public \*/        jint mods;
        jmethodID mid;
        jobject obj = (*env)->ToReflectedMethod(env, mainClass,
                                                mainID, JNI_TRUE);

        if( obj == NULL) { /* exception occurred \*/            ReportExceptionDescription(env);
            goto leave;
        }

        mid =          (*env)->GetMethodID(env,
                              (*env)->GetObjectClass(env, obj),
                              "getModifiers", "()I");
        if ((*env)->ExceptionOccurred(env)) {
            ReportExceptionDescription(env);
            goto leave;
        }

        mods = (*env)->CallIntMethod(env, obj, mid);
        if ((mods & 1) == 0) { /* if (!Modifier.isPublic(mods)) ... \*/            message = "Main method not public.";
            messageDest = JNI_TRUE;
            goto leave;
        }
    }
```



GetMainClassName()函数的实现过程如下：



```java
static jstring
GetMainClassName(JNIEnv *env, char *jarname)
{\#define MAIN_CLASS "Main-Class"    jclass cls;
    jmethodID mid;
    jobject jar, man, attr;
    jstring str, result = 0;

    NULL_CHECK0(cls = (*env)->FindClass(env, "java/util/jar/JarFile"));
    NULL_CHECK0(mid = (*env)->GetMethodID(env, cls, "<init>",
                                          "(Ljava/lang/String;)V"));
    NULL_CHECK0(str = NewPlatformString(env, jarname));
    NULL_CHECK0(jar = (*env)->NewObject(env, cls, mid, str));
    NULL_CHECK0(mid = (*env)->GetMethodID(env, cls, "getManifest",
                                          "()Ljava/util/jar/Manifest;"));
    man = (*env)->CallObjectMethod(env, jar, mid);
    if (man != 0) {
        NULL_CHECK0(mid = (*env)->GetMethodID(env,
                                    (*env)->GetObjectClass(env, man),
                                    "getMainAttributes",
                                    "()Ljava/util/jar/Attributes;"));
        attr = (*env)->CallObjectMethod(env, man, mid);
        if (attr != 0) {
            NULL_CHECK0(mid = (*env)->GetMethodID(env,
                                    (*env)->GetObjectClass(env, attr),
                                    "getValue",
                                    "(Ljava/lang/String;)Ljava/lang/String;"));
            NULL_CHECK0(str = NewPlatformString(env, MAIN_CLASS));
            result = (*env)->CallObjectMethod(env, attr, mid, str);
        }
    }
    return result;
}
```



如果是执行class方法。则先调用NewPlatformString(env, classname)获取mainClassName，然后直接调用LoadClass(env, classname)来加载该类。NewPlatformString()函数如下：



```java
/* \* Returns a new Java string object for the specified platform string.
 \*/
static jstring
NewPlatformString(JNIEnv *env, char *s)
{
    int len = (int)strlen(s);
    jclass cls;
    jmethodID mid;
    jbyteArray ary;
    jstring enc;

    if (s == NULL)
        return 0;
    enc = getPlatformEncoding(env);

    ary = (*env)->NewByteArray(env, len);
    if (ary != 0) {
        jstring str = 0;
        (*env)->SetByteArrayRegion(env, ary, 0, len, (jbyte *)s);
        if (!(*env)->ExceptionOccurred(env)) {
            if (isEncodingSupported(env, enc) == JNI_TRUE) {
                NULL_CHECK0(cls = (*env)->FindClass(env, "java/lang/String"));
                NULL_CHECK0(mid = (*env)->GetMethodID(env, cls, "<init>",
                                          "([BLjava/lang/String;)V"));
                str = (*env)->NewObject(env, cls, mid, ary, enc);
            } else {
                /*If the encoding specified in sun.jnu.encoding is not
                  endorsed by "Charset.isSupported" we have to fall back
                  to use String(byte[]) explicitly here without specifying
                  the encoding name, in which the StringCoding class will
                  pickup the iso-8859-1 as the fallback converter for us.
                \*/                NULL_CHECK0(cls = (*env)->FindClass(env, "java/lang/String"));
                NULL_CHECK0(mid = (*env)->GetMethodID(env, cls, "<init>",
                                          "([B)V"));
                str = (*env)->NewObject(env, cls, mid, ary);
            }
            (*env)->DeleteLocalRef(env, ary);
            return str;
        }
    }
    return 0;
}
```



至于加载类方法，直接将类名的指针压入JVM的堆栈中，过程如下：



```java
/* \* Loads a class, convert the '.' to '/'.
 \*/
static jclass
LoadClass(JNIEnv *env, char *name)
{
    char *buf = JLI_MemAlloc(strlen(name) + 1);
    char *s = buf, *t = name, c;
    jclass cls;
    jlong start, end;

    if (_launcher_debug)
        start = CounterGet();

    do {
        c = *t++;
        *s++ = (c == '.') ? '/' : c;
    } while (c != '\0');
    cls = (*env)->FindClass(env, buf);
    JLI_MemFree(buf);

    if (_launcher_debug) {
        end   = CounterGet();
        printf("%ld micro seconds to load main class\n",
               (long)(jint)Counter2Micros(end-start));
        printf("----_JAVA_LAUNCHER_DEBUG----\n");
    }

    return cls;
}
```



之后就是JNI_ENTRY实例调用main方法了

```java
/* Invoke main method. \*/    (*env)->CallStaticVoidMethod(env, mainClass, mainID, mainArgs);
```

```java
CallStaticVoidMethod是C++实现的，位于\hotspot\src\share\vm\prims下的jni.cpp
```



```java
JNI_ENTRY(void, jni_CallStaticVoidMethod(JNIEnv *env, jclass cls, jmethodID methodID, ...))
  JNIWrapper("CallStaticVoidMethod");
  DTRACE_PROBE3(hotspot_jni, CallStaticVoidMethod__entry, env, cls, methodID);
  DT_VOID_RETURN_MARK(CallStaticVoidMethod);

  va_list args;
  va_start(args, methodID);
  JavaValue jvalue(T_VOID);
  JNI_ArgumentPusherVaArg ap(methodID, args);
  jni_invoke_static(env, &jvalue, NULL, JNI_STATIC, methodID, &ap, CHECK);
  va_end(args);
JNI_END
```



这样jvm就开始执行我们的java代码了。

在hotspot\src\share\vm\prims\jvm.cpp中有大量的JVM_ENTRY实例的内部方法，例如从根加载器中获取类JVM_FindClassFromBootLoader



```java
// Returns a class loaded by the bootstrap class loader; or null// if not found.  ClassNotFoundException is not thrown.//// Rationale behind JVM_FindClassFromBootLoader// a> JVM_FindClassFromClassLoader was never exported in the export tables.// b> because of (a) java.dll has a direct dependecy on the  unexported//    private symbol "_JVM_FindClassFromClassLoader@20".// c> the launcher cannot use the private symbol as it dynamically opens//    the entry point, so if something changes, the launcher will fail//    unexpectedly at runtime, it is safest for the launcher to dlopen a//    stable exported interface.// d> re-exporting JVM_FindClassFromClassLoader as public, will cause its//    signature to change from _JVM_FindClassFromClassLoader@20 to//    JVM_FindClassFromClassLoader and will not be backward compatible//    with older JDKs.// Thus a public/stable exported entry point is the right solution,// public here means public in linker semantics, and is exported only// to the JDK, and is not intended to be a public API.
JVM_ENTRY(jclass, JVM_FindClassFromBootLoader(JNIEnv* env,
                                              const char* name))
  JVMWrapper2("JVM_FindClassFromBootLoader %s", name);

  // Java libraries should ensure that name is never null...
  if (name == NULL || (int)strlen(name) > Symbol::max_length()) {
    // It's impossible to create this class;  the name cannot fit
    // into the constant pool.
    return NULL;
  }

  TempNewSymbol h_name = SymbolTable::new_symbol(name, CHECK_NULL);
  klassOop k = SystemDictionary::resolve_or_null(h_name, CHECK_NULL);
  if (k == NULL) {
    return NULL;
  }

  if (TraceClassResolution) {
    trace_class_resolution(k);
  }
  return (jclass) JNIHandles::make_local(env, Klass::cast(k)->java_mirror());
JVM_END
```



关于ClassLoader这个类，位于\jdk\src\share\classes\java\lang下面，这是一个抽象类；而在\jdk\src\share\classes\java\security\下面有一个类SecureClassLoader继承ClassLoader；另外在\jdk\src\share\classes\java\net\下面有一个类URLClassLoader继承SecureClassLoader；这里来看一下sun对这三个类的功能描述：

URLClassLoader：This class loader is used to load classes and resources from a search path of URLs referring to both JAR files and directories. Any URL that ends with a '/' is assumed to refer to a directory. Otherwise, the URL is assumed to refer to a JAR file which will be opened as needed.

大致意思是：这个类加载器是用于从一个引用JAR包和目录的URL搜索路径加载类和资源的。对于任何以'/'结尾的URL都被认为是一个目录。否则这个URL被认为是一个根据需要打开的jar包。

也就是说URLClassLoader这个类用来加载jar包和我们项目中自己实现的类，Extension ClassLoader 和 App ClassLoader都是java.net.URLClassLoader的子类。

SecureClassLoader：This class extends ClassLoader with additional support for defining classes with an associated code source and permissions which are retrieved by the system policy by default.

大致意思是：这个类定义与相关的源代码和权限是由默认情况下，系统策略检索类的其他支持扩展类加载器。

ClassLoader：A class loader is an object that is responsible for loading classes. The class <tt>ClassLoader</tt> is an abstract class.  Given the <a href="#name">binary name</a> of a class, a class loader should attempt to locate or generate data that constitutes a definition for the class.  A typical strategy is to transform the name into a file name and then read a "class file" of that name from a file system.

ClassLoader是一个负责加载类的对象，他是一个抽象类。需要给出类的二进制名称，class loader尝试定位或者产生一个class的数据，一个典型的策略是把二进制名字转换成文件名然后到文件系统中找到该文件。

这是它的构造器



```java
private ClassLoader(Void unused, ClassLoader parent) {
        this.parent = parent;
        if (ParallelLoaders.isRegistered(this.getClass())) {
            parallelLockMap = new ConcurrentHashMap<>();
            package2certs = new ConcurrentHashMap<>();
            domains =                Collections.synchronizedSet(new HashSet<ProtectionDomain>());
            assertionLock = new Object();
        } else {
            // no finer-grained lock; lock on the classloader instance
            parallelLockMap = null;
            package2certs = new Hashtable<>();
            domains = new HashSet<>();
            assertionLock = this;
        }
    }
```



根据ParallelLoaders.isRegistered的状态给parallelLockMap、package2certs、domains和assertionLock赋值。

对于关键的加载类方法loadClass()



```java
protected Class<?> loadClass(String name, boolean resolve)
        throws ClassNotFoundException
    {
        synchronized (getClassLoadingLock(name)) {
            // First, check if the class has already been loaded
            Class c = findLoadedClass(name);
            if (c == null) {
                long t0 = System.nanoTime();
                try {
                    if (parent != null) {
                        c = parent.loadClass(name, false);
                    } else {
                        c = findBootstrapClassOrNull(name);
                    }
                } catch (ClassNotFoundException e) {
                    // ClassNotFoundException thrown if class not found
                    // from the non-null parent class loader
                }

                if (c == null) {
                    // If still not found, then invoke findClass in order
                    // to find the class.
                    long t1 = System.nanoTime();
                    c = findClass(name);

                    // this is the defining class loader; record the stats
                    sun.misc.PerfCounter.getParentDelegationTime().addTime(t1 - t0);
                    sun.misc.PerfCounter.getFindClassTime().addElapsedTimeFrom(t1);
                    sun.misc.PerfCounter.getFindClasses().increment();
                }
            }
            if (resolve) {
                resolveClass(c);
            }
            return c;
        }
    }
```
先判断父加载器是否为空，如果存在父加载器，则让父加载器去加载类，传入resolve为false，表示未找到类；如果不存在父加载器，则表明已经是父加载器了也就是bootstrapClassLoader，直接调用上面说到的findBootstrapClassOrNull()来加载类，这里由于findBootstrapClassOrNull调用的方法是之前jvm初始化的时候C++实现的方法，这里如果调用它会返回null，所以如果c为null则调用之前jvm中的findClass方法来获取类，然后记录状态。最后如果成功找到该类，则返回resolve为true，调用resolveClass。