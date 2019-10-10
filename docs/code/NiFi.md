# NiFi.java 源码解读 
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com** 
***
内容：

在RunNiFi.java源码解读中有提到，最终RunNiFi进程在主程序中启动了新的进程NiFi,并循环监听NIFI进程的状态，直到NIFI进程不在运行，RunNiFi主程序才结束。

以下便是NIFI进程的入口类，从main方法开始即可，关键地方有注释。(自己跟着源码逻辑读更好)

```java
package org.apache.nifi;

public class NiFi {

    private static final Logger LOGGER = LoggerFactory.getLogger(NiFi.class);
    private static final String KEY_FILE_FLAG = "-K";
    private final NiFiServer nifiServer;
    private final BootstrapListener bootstrapListener;
    // RunNiFi进程的Socket监听端口 进程间通信
    public static final String BOOTSTRAP_PORT_PROPERTY = "nifi.bootstrap.listen.port";
    //标记  是否关闭
    private volatile boolean shutdown = false;
    // nifi.properties
    public NiFi(final NiFiProperties properties)
            throws ClassNotFoundException, IOException, NoSuchMethodException, InstantiationException, IllegalAccessException, IllegalArgumentException, InvocationTargetException {

        this(properties, ClassLoader.getSystemClassLoader());

    }

    public NiFi(final NiFiProperties properties, ClassLoader rootClassLoader)
            throws ClassNotFoundException, IOException, NoSuchMethodException, InstantiationException, IllegalAccessException, IllegalArgumentException, InvocationTargetException {

        // 整个Java进程只能有一个krb5.conf，所以在启动期间全局设置它，这样处理器和Kerberos身份验证代码就不必设置它
        final File kerberosConfigFile = properties.getKerberosConfigurationFile();
        if (kerberosConfigFile != null) {
            final String kerberosConfigFilePath = kerberosConfigFile.getAbsolutePath();
            LOGGER.info("Setting java.security.krb5.conf to {}", new Object[]{kerberosConfigFilePath});
            System.setProperty("java.security.krb5.conf", kerberosConfigFilePath);
        }

        setDefaultUncaughtExceptionHandler();

        // 注册 shutdown hook
        addShutdownHook();
        //RunNiFi 启动NIFI时设置 RunNIFI进程 的Socket的监听端口  NIFI进程将本进程的Socket监听端口和pid传 给RunNIFI  ，RunNIFI便可以传达指令
        final String bootstrapPort = System.getProperty(BOOTSTRAP_PORT_PROPERTY);
        if (bootstrapPort != null) {
            try {
                final int port = Integer.parseInt(bootstrapPort);

                if (port < 1 || port > 65535) {
                    throw new RuntimeException("Failed to start NiFi because system property '" + BOOTSTRAP_PORT_PROPERTY + "' is not a valid integer in the range 1 - 65535");
                }

                bootstrapListener = new BootstrapListener(this, port);
                bootstrapListener.start();
            } catch (final NumberFormatException nfe) {
                throw new RuntimeException("Failed to start NiFi because system property '" + BOOTSTRAP_PORT_PROPERTY + "' is not a valid integer in the range 1 - 65535");
            }
        } else {
            LOGGER.info("NiFi started without Bootstrap Port information provided; will not listen for requests from Bootstrap");
            bootstrapListener = null;
        }

        //删除web工作目录——如果应用程序没有成功启动，web应用程序目录可能处于无效状态。
        //当这种情况发生时，jetty将不会尝试重新将war解压缩到目录中。
        //通过删除工作目录，我们可以确信它将尝试在每次应用程序启动时提取war。
        // nifi.web.jetty.working.directory=   默认值：./work/jetty
        File webWorkingDir = properties.getWebWorkingDirectory();
        FileUtils.deleteFilesInDirectory(webWorkingDir, null, LOGGER, true, true);
        FileUtils.deleteFile(webWorkingDir, LOGGER, 3);
        //确定我们运行的机器是否有时间问题。
        detectTimingIssues();

        // 重定向JUL日志事件
        initLogging();
        // 这里可以看另一篇讲解  【NIFI nar包加载机制源码解读】
        // nifi.nar.library.directory=./lib    获取lib bundle
        final Bundle systemBundle = SystemBundle.create(properties);

        // 期间过滤了非nar包的文件 解压nar到  /work/nar/framework   /work/nar/extending  /work/docs/components 
        // 解压doc file
        // 读取 各个JarFile META-INF/services/org.apache.nifi.processor.Processor META-INF/services/org.apache.nifi.reporting.ReportingTask META-INF/services/org.apache.nifi.controller.ControllerService
        // 返回的extensionMapping有三个 Map  分别存了Processor ControllerService ReportingTask
        final ExtensionMapping extensionMapping = NarUnpacker.unpackNars(properties, systemBundle);

        // 获取 extensions classloaders  (单例)
        NarClassLoaders narClassLoaders = NarClassLoaders.getInstance();

        //初始化   为所有的nar包创建唯一 的类加载器 
        // 
        narClassLoaders.init(rootClassLoader,
                properties.getFrameworkWorkingDirectory(), properties.getExtensionsWorkingDirectory());

        // load the framework classloader
        final ClassLoader frameworkClassLoader = narClassLoaders.getFrameworkBundle().getClassLoader();
        if (frameworkClassLoader == null) {
            throw new IllegalStateException("Unable to find the framework NAR ClassLoader.");
        }
        //此集合是有序的  首先是framework  其次其余nar包按 依赖，被依赖在先 ，Bundle中有此nar包各种信息以及nar的类加载器  
        final Set<Bundle> narBundles = narClassLoaders.getBundles();

        // frameworkClassLoader类加载器加载framework bundle(nifi-framework-nar) 
        Thread.currentThread().setContextClassLoader(frameworkClassLoader);
        //  顾名思义  其中启用 了Jetty
        Class<?> jettyServer = Class.forName("org.apache.nifi.web.server.JettyServer", true, frameworkClassLoader);
        Constructor<?> jettyConstructor = jettyServer.getConstructor(NiFiProperties.class, Set.class);

        final long startTime = System.nanoTime();
        nifiServer = (NiFiServer) jettyConstructor.newInstance(properties, narBundles);
        nifiServer.setExtensionMapping(extensionMapping);
        nifiServer.setBundles(systemBundle, narBundles);

        if (shutdown) {
            LOGGER.info("NiFi has been shutdown via NiFi Bootstrap. Will not start Controller");
        } else {
            //余下的启动就交给JettyServer了
            nifiServer.start();

            if (bootstrapListener != null) {
                bootstrapListener.sendStartedStatus(true);
            }

            final long duration = System.nanoTime() - startTime;
            LOGGER.info("Controller initialization took " + duration + " nanoseconds "
                    + "(" + (int) TimeUnit.SECONDS.convert(duration, TimeUnit.NANOSECONDS) + " seconds).");
        }
    }

    protected void setDefaultUncaughtExceptionHandler() {
        Thread.setDefaultUncaughtExceptionHandler(new UncaughtExceptionHandler() {
            @Override
            public void uncaughtException(final Thread t, final Throwable e) {
                LOGGER.error("An Unknown Error Occurred in Thread {}: {}", t, e.toString());
                LOGGER.error("", e);
            }
        });
    }

    protected void addShutdownHook() {
        Runtime.getRuntime().addShutdownHook(new Thread(new Runnable() {
            @Override
            public void run() {
                // shutdown the jetty server
                shutdownHook();
            }
        }));
    }

    protected void initLogging() {
        SLF4JBridgeHandler.removeHandlersForRootLogger();
        SLF4JBridgeHandler.install();
    }

    private static ClassLoader createBootstrapClassLoader() {
        //获取lib文件夹中的文件列表
        final List<URL> urls = new ArrayList<>();
        try {
            Files.list(Paths.get("lib/bootstrap")).forEach(p -> {
                try {
                    urls.add(p.toUri().toURL());
                } catch (final MalformedURLException mef) {
                    LOGGER.warn("Unable to load " + p.getFileName() + " due to " + mef, mef);
                }
            });
        } catch (IOException ioe) {
            LOGGER.warn("Unable to access lib/bootstrap to create bootstrap classloader", ioe);
        }
        //创建bootstrap classloader
        return new URLClassLoader(urls.toArray(new URL[0]), Thread.currentThread().getContextClassLoader());
    }

    protected void shutdownHook() {
        try {
            shutdown();
        } catch (final Throwable t) {
            LOGGER.warn("Problem occurred ensuring Jetty web server was properly terminated due to " + t);
        }
    }

    protected void shutdown() {
        this.shutdown = true;

        LOGGER.info("Initiating shutdown of Jetty web server...");
        if (nifiServer != null) {
            nifiServer.stop();
        }
        if (bootstrapListener != null) {
            bootstrapListener.stop();
        }
        LOGGER.info("Jetty web server shutdown completed (nicely or otherwise).");
    }

    /**
     * 确定我们运行的机器是否有时间问题。
     */
    private void detectTimingIssues() {
        final int minRequiredOccurrences = 25;
        final int maxOccurrencesOutOfRange = 15;
        final AtomicLong lastTriggerMillis = new AtomicLong(System.currentTimeMillis());

        final ScheduledExecutorService service = Executors.newScheduledThreadPool(1, new ThreadFactory() {
            private final ThreadFactory defaultFactory = Executors.defaultThreadFactory();

            @Override
            public Thread newThread(final Runnable r) {
                final Thread t = defaultFactory.newThread(r);
                t.setDaemon(true);
                t.setName("Detect Timing Issues");
                return t;
            }
        });

        final AtomicInteger occurrencesOutOfRange = new AtomicInteger(0);
        final AtomicInteger occurrences = new AtomicInteger(0);
        final Runnable command = new Runnable() {
            @Override
            public void run() {
                final long curMillis = System.currentTimeMillis();
                final long difference = curMillis - lastTriggerMillis.get();
                final long millisOff = Math.abs(difference - 2000L);
                occurrences.incrementAndGet();
                if (millisOff > 500L) {
                    occurrencesOutOfRange.incrementAndGet();
                }
                lastTriggerMillis.set(curMillis);
            }
        };

        final ScheduledFuture<?> future = service.scheduleWithFixedDelay(command, 2000L, 2000L, TimeUnit.MILLISECONDS);

        final TimerTask timerTask = new TimerTask() {
            @Override
            public void run() {
                future.cancel(true);
                service.shutdownNow();

                if (occurrences.get() < minRequiredOccurrences || occurrencesOutOfRange.get() > maxOccurrencesOutOfRange) {
                    LOGGER.warn("NiFi has detected that this box is not responding within the expected timing interval, which may cause "
                            + "Processors to be scheduled erratically. Please see the NiFi documentation for more information.");
                }
            }
        };
        final Timer timer = new Timer(true);
        timer.schedule(timerTask, 60000L);
    }

    /**
     * 应用程序的主要入口点。
     */
    public static void main(String[] args) {
        LOGGER.info("Launching NiFi...");
        try {
            NiFiProperties properties = convertArgumentsToValidatedNiFiProperties(args);
            new NiFi(properties);
        } catch (final Throwable t) {
            LOGGER.error("Failure to launch NiFi due to " + t, t);
        }
    }

    protected static NiFiProperties convertArgumentsToValidatedNiFiProperties(String[] args) {
        final ClassLoader bootstrap = createBootstrapClassLoader();
        NiFiProperties properties = initializeProperties(args, bootstrap);
        properties.validate();
        return properties;
    }

    private static NiFiProperties initializeProperties(final String[] args, final ClassLoader boostrapLoader) {
        // Try to get key
        // If key doesn't exist, instantiate without
        // Load properties
        // If properties are protected and key missing, throw RuntimeException

        final ClassLoader contextClassLoader = Thread.currentThread().getContextClassLoader();
        final String key;
        try {
            key = loadFormattedKey(args);
            // The key might be empty or null when it is passed to the loader
        } catch (IllegalArgumentException e) {
            final String msg = "The bootstrap process did not provide a valid key";
            throw new IllegalArgumentException(msg, e);
        }
        Thread.currentThread().setContextClassLoader(boostrapLoader);

        try {
            final Class<?> propsLoaderClass = Class.forName("org.apache.nifi.properties.NiFiPropertiesLoader", true, boostrapLoader);
            final Method withKeyMethod = propsLoaderClass.getMethod("withKey", String.class);
            final Object loaderInstance = withKeyMethod.invoke(null, key);
            final Method getMethod = propsLoaderClass.getMethod("get");
            final NiFiProperties properties = (NiFiProperties) getMethod.invoke(loaderInstance);
            LOGGER.info("Loaded {} properties", properties.size());
            return properties;
        } catch (InvocationTargetException wrappedException) {
            final String msg = "There was an issue decrypting protected properties";
            throw new IllegalArgumentException(msg, wrappedException.getCause() == null ? wrappedException : wrappedException.getCause());
        } catch (final IllegalAccessException | NoSuchMethodException | ClassNotFoundException reex) {
            final String msg = "Unable to access properties loader in the expected manner - apparent classpath or build issue";
            throw new IllegalArgumentException(msg, reex);
        } catch (final RuntimeException e) {
            final String msg = "There was an issue decrypting protected properties";
            throw new IllegalArgumentException(msg, e);
        } finally {
            Thread.currentThread().setContextClassLoader(contextClassLoader);
        }
    }

    private static String loadFormattedKey(String[] args) {
        String key = null;
        List<String> parsedArgs = parseArgs(args);
        // Check if args contain protection key
        if (parsedArgs.contains(KEY_FILE_FLAG)) {
            key = getKeyFromKeyFileAndPrune(parsedArgs);
            // Format the key (check hex validity and remove spaces)
            key = formatHexKey(key);

        }

        if (null == key) {
            return "";
        } else if (!isHexKeyValid(key)) {
            throw new IllegalArgumentException("The key was not provided in valid hex format and of the correct length");
        } else {
            return key;
        }
    }

    private static String getKeyFromKeyFileAndPrune(List<String> parsedArgs) {
        String key = null;
        LOGGER.debug("The bootstrap process provided the " + KEY_FILE_FLAG + " flag");
        int i = parsedArgs.indexOf(KEY_FILE_FLAG);
        if (parsedArgs.size() <= i + 1) {
            LOGGER.error("The bootstrap process passed the {} flag without a filename", KEY_FILE_FLAG);
            throw new IllegalArgumentException("The bootstrap process provided the " + KEY_FILE_FLAG + " flag but no key");
        }
        try {
          String passwordfile_path = parsedArgs.get(i + 1);
          // Slurp in the contents of the file:
          byte[] encoded = Files.readAllBytes(Paths.get(passwordfile_path));
          key = new String(encoded,StandardCharsets.UTF_8);
          if (0 == key.length())
            throw new IllegalArgumentException("Key in keyfile " + passwordfile_path + " yielded an empty key");

          LOGGER.info("Now overwriting file in "+passwordfile_path);

          // Overwrite the contents of the file (to avoid littering file system
          // unlinked with key material):
          File password_file = new File(passwordfile_path);
          FileWriter overwriter = new FileWriter(password_file,false);

          // Construe a random pad:
          Random r = new Random();
          StringBuffer sb = new StringBuffer();
          // Note on correctness: this pad is longer, but equally sufficient.
          while(sb.length() < encoded.length){
            sb.append(Integer.toHexString(r.nextInt()));
          }
          String pad = sb.toString();
          LOGGER.info("Overwriting key material with pad: "+pad);
          overwriter.write(pad);
          overwriter.close();

          LOGGER.info("Removing/unlinking file: "+passwordfile_path);
          password_file.delete();

        } catch (IOException e) {
          LOGGER.error("Caught IOException while retrieving the "+KEY_FILE_FLAG+"-passed keyfile; aborting: "+e.toString());
          System.exit(1);
        }

        LOGGER.info("Read property protection key from key file provided by bootstrap process");
        return key;
    }

    private static List<String> parseArgs(String[] args) {
        List<String> parsedArgs = new ArrayList<>(Arrays.asList(args));
        for (int i = 0; i < parsedArgs.size(); i++) {
            if (parsedArgs.get(i).startsWith(KEY_FILE_FLAG + " ")) {
                String[] split = parsedArgs.get(i).split(" ", 2);
                parsedArgs.set(i, split[0]);
                parsedArgs.add(i + 1, split[1]);
                break;
            }
        }
        return parsedArgs;
    }

    private static String formatHexKey(String input) {
        if (input == null || input.trim().isEmpty()) {
            return "";
        }
        return input.replaceAll("[^0-9a-fA-F]", "").toLowerCase();
    }

    private static boolean isHexKeyValid(String key) {
        if (key == null || key.trim().isEmpty()) {
            return false;
        }
        // Key length is in "nibbles" (i.e. one hex char = 4 bits)
        return Arrays.asList(128, 196, 256).contains(key.length() * 4) && key.matches("^[0-9a-fA-F]*$");
    }
}

```