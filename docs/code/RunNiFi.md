# RunNiFi.java 源码解读 
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com** 
***
内容：

RunNiFi类是由 nifi.sh脚本执行java命令指定的主类，RunNiFi类主要是干一些 查找文件，接受脚本指令，启动停止NIFI进程(主类 org.apache.nifi.NiFi)，自动重启NIFI，发送NIFI通知等等操作；
关于代码的详细解读都在注释当中，可以从 main方法下自行跟踪阅读(自己跟着源码逻辑读更好)：

```java

package org.apache.nifi.bootstrap;

/**
 * 这个类通过查找以下位置来查找bootstrap.conf文件:
 * java系统变量 org.apache.nifi.bootstrap.config.file
 * 环境变量(脚本中设置)${NIFI_HOME}/./conf/bootstrap.conf
 * ./conf/bootstrap.conf ./ 是当前类所在目录
 * 如果bootstrap.conf找不到，抛出FileNotFoundException
 */
public class RunNiFi {

    public static final String DEFAULT_CONFIG_FILE = "./conf/bootstrap.conf";
    public static final String DEFAULT_JAVA_CMD = "java";
    public static final String DEFAULT_PID_DIR = "bin";
    public static final String DEFAULT_LOG_DIR = "./logs";

    public static final String GRACEFUL_SHUTDOWN_PROP = "graceful.shutdown.seconds";
    public static final String DEFAULT_GRACEFUL_SHUTDOWN_VALUE = "20";

    public static final String NOTIFICATION_SERVICES_FILE_PROP = "notification.services.file";
    public static final String NOTIFICATION_ATTEMPTS_PROP = "notification.max.attempts";

    public static final String NIFI_START_NOTIFICATION_SERVICE_IDS_PROP = "nifi.start.notification.services";
    public static final String NIFI_STOP_NOTIFICATION_SERVICE_IDS_PROP = "nifi.stop.notification.services";
    public static final String NIFI_DEAD_NOTIFICATION_SERVICE_IDS_PROP = "nifi.dead.notification.services";

    public static final String NIFI_PID_DIR_PROP = "org.apache.nifi.bootstrap.config.pid.dir";

    public static final String NIFI_PID_FILE_NAME = "nifi.pid";
    public static final String NIFI_STATUS_FILE_NAME = "nifi.status";
    public static final String NIFI_LOCK_FILE_NAME = "nifi.lock";
    public static final String NIFI_BOOTSTRAP_SENSITIVE_KEY = "nifi.bootstrap.sensitive.key";

    public static final String PID_KEY = "pid";

    public static final int STARTUP_WAIT_SECONDS = 60;

    public static final String SHUTDOWN_CMD = "SHUTDOWN";
    public static final String PING_CMD = "PING";
    public static final String DUMP_CMD = "DUMP";

    private volatile boolean autoRestartNiFi = true;
    private volatile int ccPort = -1;
    private volatile long nifiPid = -1L;
    private volatile String secretKey;
    private volatile ShutdownHook shutdownHook;
    private volatile boolean nifiStarted;

    private final Lock startedLock = new ReentrantLock();
    private final Lock lock = new ReentrantLock();
    private final Condition startupCondition = lock.newCondition();

    private final File bootstrapConfigFile;

    // 默认情况下，当应用程序启动时，这些将被记录到控制台(就是我们nifi.sh start 时看到的日志)
    private final Logger cmdLogger = LoggerFactory.getLogger("org.apache.nifi.bootstrap.Command");
    // 默认情况下，这些将被写入日志文件
    private final Logger defaultLogger = LoggerFactory.getLogger(RunNiFi.class);


    private final ExecutorService loggingExecutor;
    private volatile Set<Future<?>> loggingFutures = new HashSet<>(2);
    // nifi启动 停止 异常结束的通知服务
    private final NotificationServiceManager serviceManager;

    public RunNiFi(final File bootstrapConfigFile, final boolean verbose) throws IOException {
        this.bootstrapConfigFile = bootstrapConfigFile;

        //设置日志线程池 大小为2 一个写 文件  一个输出控制台 ，都是守护线程
        loggingExecutor = Executors.newFixedThreadPool(2, new ThreadFactory() {
            @Override
            public Thread newThread(final Runnable runnable) {
                final Thread t = Executors.defaultThreadFactory().newThread(runnable);
                t.setDaemon(true);
                t.setName("NiFi logging handler");
                return t;
            }
        });

        serviceManager = loadServices();
    }

    private static void printUsage() {
        System.out.println("Usage:");
        System.out.println();
        System.out.println("java org.apache.nifi.bootstrap.RunNiFi [<-verbose>] <command> [options]");
        System.out.println();
        System.out.println("Valid commands include:");
        System.out.println("");
        System.out.println("Start : Start a new instance of Apache NiFi");
        System.out.println("Stop : Stop a running instance of Apache NiFi");
        System.out.println("Restart : Stop Apache NiFi, if it is running, and then start a new instance");
        System.out.println("Status : Determine if there is a running instance of Apache NiFi");
        System.out.println("Dump : Write a Thread Dump to the file specified by [options], or to the log if no file is given");
        System.out.println("Run : Start a new instance of Apache NiFi and monitor the Process, restarting if the instance dies");
        System.out.println();
    }

    private static String[] shift(final String[] orig) {
        return Arrays.copyOfRange(orig, 1, orig.length);
    }

    // 比如传入参数  start
    public static void main(String[] args) throws IOException, InterruptedException {
        if (args.length < 1 || args.length > 3) {
            printUsage();
            return;
        }

        File dumpFile = null;
        boolean verbose = false;
        //检测是否是多参数  传入start 显然false 
        if (args[0].equals("-verbose")) {
            verbose = true;
            //如果参数冗余，取第一个参数 copy过来
            args = shift(args);
        }

        final String cmd = args[0];
        if (cmd.equals("dump")) {
            if (args.length > 1) {
                dumpFile = new File(args[1]);
            } else {
                dumpFile = null;
            }
        }

        //检测第一个参数是否合规 不合规就打印提示
        switch (cmd.toLowerCase()) {
            case "start":
            case "run":
            case "stop":
            case "status":
            case "dump":
            case "restart":
            case "env":
                break;
            default:
                printUsage();
                return;
        }

        //获取bootsrap.conf -> ${NIFI_HOME}/./conf/bootstrap.conf
        final File configFile = getDefaultBootstrapConfFile();
        // 实例化 RunNiFi
        final RunNiFi runNiFi = new RunNiFi(configFile, verbose);

        Integer exitStatus = null;
        // 判断参数  先看 start  
        switch (cmd.toLowerCase()) {
            case "start":
                runNiFi.start();
                break;
            case "run":
                runNiFi.start();
                break;
            case "stop":
                runNiFi.stop();
                break;
            case "status":
                exitStatus = runNiFi.status();
                break;
            case "restart":
                runNiFi.stop();
                runNiFi.start();
                break;
            case "dump":
                runNiFi.dump(dumpFile);
                break;
            case "env":
                runNiFi.env();
                break;
        }
        if (exitStatus != null) {
            System.exit(exitStatus);
        }
    }

    /**
    * 返回  ${NIFI_HOME}/./conf/bootstrap.conf  NIFI_HOME这个环境变量在启动脚本中就设置好了
    */
    private static File getDefaultBootstrapConfFile() {
        String configFilename = System.getProperty("org.apache.nifi.bootstrap.config.file");

        if (configFilename == null) {
            final String nifiHome = System.getenv("NIFI_HOME");
            if (nifiHome != null) {
                final File nifiHomeFile = new File(nifiHome.trim());
                final File configFile = new File(nifiHomeFile, DEFAULT_CONFIG_FILE);
                configFilename = configFile.getAbsolutePath();
            }
        }

        if (configFilename == null) {
            configFilename = DEFAULT_CONFIG_FILE;
        }

        final File configFile = new File(configFilename);
        return configFile;
    }

    /*
    * 装载通知服务  NIFI 启动 停止 死掉的通知
    **/
    private NotificationServiceManager loadServices() throws IOException {
        //读取 bootstrap.conf配置文件
        final File bootstrapConfFile = this.bootstrapConfigFile;
        final Properties properties = new Properties();
        try (final FileInputStream fis = new FileInputStream(bootstrapConfFile)) {
            properties.load(fis);
        }

        final NotificationServiceManager manager = new NotificationServiceManager();
        // notification.max.attempts 最大尝试次数
        final String attemptProp = properties.getProperty(NOTIFICATION_ATTEMPTS_PROP);
        if (attemptProp != null) {
            try {
                // 转int
                final int maxAttempts = Integer.parseInt(attemptProp.trim());
                if (maxAttempts >= 0) {
                    manager.setMaxNotificationAttempts(maxAttempts);
                }
            } catch (final NumberFormatException nfe) {
                defaultLogger.error("Maximum number of attempts to send notification email is set to an invalid value of {}; will use default value", attemptProp);
            }
        }
        // 获取 notification.services.file   通知服务的配置文件名称
        final String notificationServicesXmlFilename = properties.getProperty(NOTIFICATION_SERVICES_FILE_PROP);
        if (notificationServicesXmlFilename == null) {
            defaultLogger.info("No Bootstrap Notification Services configured.");
            return manager;
        }

        // 解析通知服务的xml配置文件
        final File xmlFile = new File(notificationServicesXmlFilename);
        final File servicesFile;

        if (xmlFile.isAbsolute()) {
            servicesFile = xmlFile;
        } else {
            final File confDir = bootstrapConfigFile.getParentFile();
            final File nifiHome = confDir.getParentFile();
            servicesFile = new File(nifiHome, notificationServicesXmlFilename);
        }

        if (!servicesFile.exists()) {
            defaultLogger.error("Bootstrap Notification Services file configured as " + servicesFile + " but could not find file; will not load notification services");
            return manager;
        }

        try {
            // 装载通知服务配置
            manager.loadNotificationServices(servicesFile);
        } catch (final Exception e) {
            defaultLogger.error("Bootstrap Notification Services file configured as " + servicesFile + " but failed to load notification services", e);
        }
        // 注册 start stop dead 的通知服务
        registerNotificationServices(manager, NotificationType.NIFI_STARTED, properties.getProperty(NIFI_START_NOTIFICATION_SERVICE_IDS_PROP));
        registerNotificationServices(manager, NotificationType.NIFI_STOPPED, properties.getProperty(NIFI_STOP_NOTIFICATION_SERVICE_IDS_PROP));
        registerNotificationServices(manager, NotificationType.NIFI_DIED, properties.getProperty(NIFI_DEAD_NOTIFICATION_SERVICE_IDS_PROP));

        return manager;
    }
    /*
    * 注册通知服务 
    **/
    private void registerNotificationServices(final NotificationServiceManager manager, final NotificationType type, final String serviceIds) {
        if (serviceIds == null) {
            defaultLogger.info("Registered no Notification Services for Notification Type {}", type);
            return;
        }

        int registered = 0;
        for (final String id : serviceIds.split(",")) {
            final String trimmed = id.trim();
            if (trimmed.isEmpty()) {
                continue;
            }

            try {
                manager.registerNotificationService(type, trimmed);
                registered++;
            } catch (final Exception e) {
                defaultLogger.warn("Failed to register Notification Service with ID {} for Notifications of type {} due to {}", trimmed, type, e.toString());
                defaultLogger.error("", e);
            }
        }

        defaultLogger.info("Registered {} Notification Services for Notification Type {}", registered, type);
    }

    /**根据参数，读取相应的文件*/
    protected File getBootstrapFile(final Logger logger, String directory, String defaultDirectory, String fileName) throws IOException {

        final File confDir = bootstrapConfigFile.getParentFile();
        final File nifiHome = confDir.getParentFile();

        String confFileDir = System.getProperty(directory);

        final File fileDir;

        if (confFileDir != null) {
            fileDir = new File(confFileDir.trim());
        } else {
            fileDir = new File(nifiHome, defaultDirectory);
        }

        FileUtils.ensureDirectoryExistAndCanAccess(fileDir);
        final File statusFile = new File(fileDir, fileName);
        logger.debug("Status File: {}", statusFile);
        return statusFile;
    }
    
    /**读取run目录下nifi.pid文件*/
    protected File getPidFile(final Logger logger) throws IOException {
        return getBootstrapFile(logger, NIFI_PID_DIR_PROP, DEFAULT_PID_DIR, NIFI_PID_FILE_NAME);
    }

    /**读取run目录下nifi.status文件*/
    protected File getStatusFile(final Logger logger) throws IOException {
        return getBootstrapFile(logger, NIFI_PID_DIR_PROP, DEFAULT_PID_DIR, NIFI_STATUS_FILE_NAME);
    }

    /**读取run目录下nifi.lock文件*/
    protected File getLockFile(final Logger logger) throws IOException {
        return getBootstrapFile(logger, NIFI_PID_DIR_PROP, DEFAULT_PID_DIR, NIFI_LOCK_FILE_NAME);
    }

    protected File getStatusFile() throws IOException {
        return getStatusFile(defaultLogger);
    }
     /**loadrun目录下nifi.status文件内容*/
    private Properties loadProperties(final Logger logger) throws IOException {
        final Properties props = new Properties();
        final File statusFile = getStatusFile(logger);
        if (statusFile == null || !statusFile.exists()) {
            logger.debug("No status file to load properties from");
            return props;
        }

        try (final FileInputStream fis = new FileInputStream(getStatusFile(logger))) {
            props.load(fis);
        }

        final Map<Object, Object> modified = new HashMap<>(props);
        modified.remove("secret.key");
        logger.debug("Properties: {}", modified);

        return props;
    }
    /**
     * 将获取到的pid值写入run目录下的nifi.pid nifi.status文件中
    */
    private synchronized void savePidProperties(final Properties pidProperties, final Logger logger) throws IOException {
        final String pid = pidProperties.getProperty(PID_KEY);
        if (!StringUtils.isBlank(pid)) {
            writePidFile(pid, logger);
        }

        final File statusFile = getStatusFile(logger);
        if (statusFile.exists() && !statusFile.delete()) {
            logger.warn("Failed to delete {}", statusFile);
        }

        if (!statusFile.createNewFile()) {
            throw new IOException("Failed to create file " + statusFile);
        }

        try {
            final Set<PosixFilePermission> perms = new HashSet<>();
            perms.add(PosixFilePermission.OWNER_READ);
            perms.add(PosixFilePermission.OWNER_WRITE);
            Files.setPosixFilePermissions(statusFile.toPath(), perms);
        } catch (final Exception e) {
            logger.warn("Failed to set permissions so that only the owner can read status file {}; "
                    + "this may allows others to have access to the key needed to communicate with NiFi. "
                    + "Permissions should be changed so that only the owner can read this file", statusFile);
        }

        try (final FileOutputStream fos = new FileOutputStream(statusFile)) {
            pidProperties.store(fos, null);
            fos.getFD().sync();
        }

        logger.debug("Saved Properties {} to {}", new Object[]{pidProperties, statusFile});
    }
     /**
     * 将获取到的pid值写入run目录下的nifi.pid文件中
    */
    private synchronized void writePidFile(final String pid, final Logger logger) throws IOException {
        final File pidFile = getPidFile(logger);
        if (pidFile.exists() && !pidFile.delete()) {
            logger.warn("Failed to delete {}", pidFile);
        }

        if (!pidFile.createNewFile()) {
            throw new IOException("Failed to create file " + pidFile);
        }

        try {
            final Set<PosixFilePermission> perms = new HashSet<>();
            perms.add(PosixFilePermission.OWNER_WRITE);
            perms.add(PosixFilePermission.OWNER_READ);
            perms.add(PosixFilePermission.GROUP_READ);
            perms.add(PosixFilePermission.OTHERS_READ);
            Files.setPosixFilePermissions(pidFile.toPath(), perms);
        } catch (final Exception e) {
            logger.warn("Failed to set permissions so that only the owner can read pid file {}; "
                    + "this may allows others to have access to the key needed to communicate with NiFi. "
                    + "Permissions should be changed so that only the owner can read this file", pidFile);
        }

        try (final FileOutputStream fos = new FileOutputStream(pidFile)) {
            fos.write(pid.getBytes(StandardCharsets.UTF_8));
            fos.getFD().sync();
        }

        logger.debug("Saved Pid {} to {}", new Object[]{pid, pidFile});
    }

    private boolean isPingSuccessful(final int port, final String secretKey, final Logger logger) {
        logger.debug("Pinging {}", port);

        try (final Socket socket = new Socket("localhost", port)) {
            final OutputStream out = socket.getOutputStream();
            out.write((PING_CMD + " " + secretKey + "\n").getBytes(StandardCharsets.UTF_8));
            out.flush();

            logger.debug("Sent PING command");
            socket.setSoTimeout(5000);
            final InputStream in = socket.getInputStream();
            final BufferedReader reader = new BufferedReader(new InputStreamReader(in));
            final String response = reader.readLine();
            logger.debug("PING response: {}", response);
            out.close();
            reader.close();

            return PING_CMD.equals(response);
        } catch (final IOException ioe) {
            return false;
        }
    }

    /**
    *读取run目录下 nifi.status 返回其中port值  
    *nifi.status中的值是每次执行RunNIFI.start后写进去的，stop后清除
    */
    private Integer getCurrentPort(final Logger logger) throws IOException {
        final Properties props = loadProperties(logger);
        final String portVal = props.getProperty("port");
        if (portVal == null) {
            logger.debug("No Port found in status file");
            return null;
        } else {
            logger.debug("Port defined in status file: {}", portVal);
        }

        final int port = Integer.parseInt(portVal);
        final boolean success = isPingSuccessful(port, props.getProperty("secret.key"), logger);
        if (success) {
            logger.debug("Successful PING on port {}", port);
            return port;
        }

        final String pid = props.getProperty(PID_KEY);
        logger.debug("PID in status file is {}", pid);
        if (pid != null) {
            final boolean procRunning = isProcessRunning(pid, logger);
            if (procRunning) {
                return port;
            } else {
                return null;
            }
        }

        return null;
    }

    private boolean isProcessRunning(final String pid, final Logger logger) {
        try {
            // We use the "ps" command to check if the process is still running.
            final ProcessBuilder builder = new ProcessBuilder();

            builder.command("ps", "-p", pid);
            final Process proc = builder.start();

            // Look for the pid in the output of the 'ps' command.
            boolean running = false;
            String line;
            try (final InputStream in = proc.getInputStream();
                 final Reader streamReader = new InputStreamReader(in);
                 final BufferedReader reader = new BufferedReader(streamReader)) {

                while ((line = reader.readLine()) != null) {
                    if (line.trim().startsWith(pid)) {
                        running = true;
                    }
                }
            }

            // If output of the ps command had our PID, the process is running.
            if (running) {
                logger.debug("Process with PID {} is running", pid);
            } else {
                logger.debug("Process with PID {} is not running", pid);
            }

            return running;
        } catch (final IOException ioe) {
            System.err.println("Failed to determine if Process " + pid + " is running; assuming that it is not");
            return false;
        }
    }

    private Status getStatus(final Logger logger) {
        final Properties props;
        try {
            props = loadProperties(logger);
        } catch (final IOException ioe) {
            return new Status(null, null, false, false);
        }

        if (props == null) {
            return new Status(null, null, false, false);
        }

        final String portValue = props.getProperty("port");
        final String pid = props.getProperty(PID_KEY);
        final String secretKey = props.getProperty("secret.key");

        if (portValue == null && pid == null) {
            return new Status(null, null, false, false);
        }

        Integer port = null;
        boolean pingSuccess = false;
        if (portValue != null) {
            try {
                port = Integer.parseInt(portValue);
                pingSuccess = isPingSuccessful(port, secretKey, logger);
            } catch (final NumberFormatException nfe) {
                return new Status(null, null, false, false);
            }
        }

        if (pingSuccess) {
            return new Status(port, pid, true, true);
        }

        final boolean alive = pid != null && isProcessRunning(pid, logger);
        return new Status(port, pid, pingSuccess, alive);
    }

    public int status() throws IOException {
        final Logger logger = cmdLogger;
        final Status status = getStatus(logger);
        if (status.isRespondingToPing()) {
            logger.info("Apache NiFi is currently running, listening to Bootstrap on port {}, PID={}",
                    new Object[]{status.getPort(), status.getPid() == null ? "unknown" : status.getPid()});
            return 0;
        }

        if (status.isProcessRunning()) {
            logger.info("Apache NiFi is running at PID {} but is not responding to ping requests", status.getPid());
            return 4;
        }

        if (status.getPort() == null) {
            logger.info("Apache NiFi is not running");
            return 3;
        }

        if (status.getPid() == null) {
            logger.info("Apache NiFi is not responding to Ping requests. The process may have died or may be hung");
        } else {
            logger.info("Apache NiFi is not running");
        }
        return 3;
    }

    public void env() {
        final Logger logger = cmdLogger;
        final Status status = getStatus(logger);
        if (status.getPid() == null) {
            logger.info("Apache NiFi is not running");
            return;
        }
        final Class<?> virtualMachineClass;
        try {
            virtualMachineClass = Class.forName("com.sun.tools.attach.VirtualMachine");
        } catch (final ClassNotFoundException cnfe) {
            logger.error("Seems tools.jar (Linux / Windows JDK) or classes.jar (Mac OS) is not available in classpath");
            return;
        }
        final Method attachMethod;
        final Method detachMethod;

        try {
            attachMethod = virtualMachineClass.getMethod("attach", String.class);
            detachMethod = virtualMachineClass.getDeclaredMethod("detach");
        } catch (final Exception e) {
            logger.error("Methods required for getting environment not available", e);
            return;
        }

        final Object virtualMachine;
        try {
            virtualMachine = attachMethod.invoke(null, status.getPid());
        } catch (final Throwable t) {
            logger.error("Problem attaching to NiFi", t);
            return;
        }

        try {
            final Method getSystemPropertiesMethod = virtualMachine.getClass().getMethod("getSystemProperties");

            final Properties sysProps = (Properties) getSystemPropertiesMethod.invoke(virtualMachine);
            for (Entry<Object, Object> syspropEntry : sysProps.entrySet()) {
                logger.info(syspropEntry.getKey().toString() + " = " + syspropEntry.getValue().toString());
            }
        } catch (Throwable t) {
            throw new RuntimeException(t);
        } finally {
            try {
                detachMethod.invoke(virtualMachine);
            } catch (final Exception e) {
                logger.warn("Caught exception detaching from process", e);
            }
        }
    }

    /**
     * 将NiFi线程dump写入给定文件;如果文件为空，则记录在INFO级别。
     *
     * @param dumpFile 要将dump内容写入其中的文件
     * @throws IOException 如果在编写dump文件时发生任何问题
     */
    public void dump(final File dumpFile) throws IOException {
        final Logger logger = defaultLogger;    // 默认写到nifi-bootstrap.log中
        final Integer port = getCurrentPort(logger);
        if (port == null) {
            logger.info("Apache NiFi is not currently running");
            return;
        }

        final Properties nifiProps = loadProperties(logger);
        final String secretKey = nifiProps.getProperty("secret.key");

        final StringBuilder sb = new StringBuilder();
        try (final Socket socket = new Socket()) {
            logger.debug("Connecting to NiFi instance");
            socket.setSoTimeout(60000);
            socket.connect(new InetSocketAddress("localhost", port));
            logger.debug("Established connection to NiFi instance.");
            socket.setSoTimeout(60000);

            logger.debug("Sending DUMP Command to port {}", port);
            final OutputStream out = socket.getOutputStream();
            out.write((DUMP_CMD + " " + secretKey + "\n").getBytes(StandardCharsets.UTF_8));
            out.flush();

            final InputStream in = socket.getInputStream();
            try (final BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append("\n");
                }
            }
        }

        final String dump = sb.toString();
        if (dumpFile == null) {
            logger.info(dump);
        } else {
            try (final FileOutputStream fos = new FileOutputStream(dumpFile)) {
                fos.write(dump.getBytes(StandardCharsets.UTF_8));
            }
            // 我们希望(默认情况下)登录到将线程转储写入指定文件的控制台
            cmdLogger.info("Successfully wrote thread dump to {}", dumpFile.getAbsolutePath());
        }
    }
    /** nifi stop 通知*/
    public void notifyStop() {
        final String hostname = getHostname();
        final SimpleDateFormat sdf = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss.SSS");
        final String now = sdf.format(System.currentTimeMillis());
        String user = System.getProperty("user.name");
        if (user == null || user.trim().isEmpty()) {
            user = "Unknown User";
        }

        serviceManager.notify(NotificationType.NIFI_STOPPED, "NiFi Stopped on Host " + hostname,
                "Hello,\n\nApache NiFi has been told to initiate a shutdown on host " + hostname + " at " + now + " by user " + user);
    }
    /** nifi stop 命令*/
    public void stop() throws IOException {
        final Logger logger = cmdLogger;
        final Integer port = getCurrentPort(logger);
        if (port == null) {
            logger.info("Apache NiFi is not currently running");
            return;
        }

        // 指示正在执行停止命令
        final File lockFile = getLockFile(logger);
        if (!lockFile.exists()) {
            lockFile.createNewFile();
        }

        final Properties nifiProps = loadProperties(logger);
        final String secretKey = nifiProps.getProperty("secret.key");
        final String pid = nifiProps.getProperty(PID_KEY);
        final File statusFile = getStatusFile(logger);
        final File pidFile = getPidFile(logger);

        try (final Socket socket = new Socket()) {
            logger.debug("Connecting to NiFi instance");
            socket.setSoTimeout(10000);
            socket.connect(new InetSocketAddress("localhost", port));
            logger.debug("Established connection to NiFi instance.");
            socket.setSoTimeout(10000);
            // BootstrapListener 监听接受命令 进行nifi关闭动作
            logger.debug("Sending SHUTDOWN Command to port {}", port);
            final OutputStream out = socket.getOutputStream();
            out.write((SHUTDOWN_CMD + " " + secretKey + "\n").getBytes(StandardCharsets.UTF_8));
            out.flush();
            socket.shutdownOutput();

            final InputStream in = socket.getInputStream();
            int lastChar;
            final StringBuilder sb = new StringBuilder();
            while ((lastChar = in.read()) > -1) {
                sb.append((char) lastChar);
            }
            final String response = sb.toString().trim();

            logger.debug("Received response to SHUTDOWN command: {}", response);

            if (SHUTDOWN_CMD.equals(response)) {
                logger.info("Apache NiFi has accepted the Shutdown Command and is shutting down now");

                if (pid != null) {
                    final Properties bootstrapProperties = new Properties();
                    try (final FileInputStream fis = new FileInputStream(bootstrapConfigFile)) {
                        bootstrapProperties.load(fis);
                    }

                    String gracefulShutdown = bootstrapProperties.getProperty(GRACEFUL_SHUTDOWN_PROP, DEFAULT_GRACEFUL_SHUTDOWN_VALUE);
                    int gracefulShutdownSeconds;
                    try {
                        gracefulShutdownSeconds = Integer.parseInt(gracefulShutdown);
                    } catch (final NumberFormatException nfe) {
                        gracefulShutdownSeconds = Integer.parseInt(DEFAULT_GRACEFUL_SHUTDOWN_VALUE);
                    }

                    notifyStop();
                    final long startWait = System.nanoTime();
                    while (isProcessRunning(pid, logger)) {
                        logger.info("Waiting for Apache NiFi to finish shutting down...");
                        final long waitNanos = System.nanoTime() - startWait;
                        final long waitSeconds = TimeUnit.NANOSECONDS.toSeconds(waitNanos);
                        if (waitSeconds >= gracefulShutdownSeconds && gracefulShutdownSeconds > 0) {
                            if (isProcessRunning(pid, logger)) {
                                logger.warn("NiFi has not finished shutting down after {} seconds. Killing process.", gracefulShutdownSeconds);
                                try {
                                    killProcessTree(pid, logger);
                                } catch (final IOException ioe) {
                                    logger.error("Failed to kill Process with PID {}", pid);
                                }
                            }
                            break;
                        } else {
                            try {
                                Thread.sleep(2000L);
                            } catch (final InterruptedException ie) {
                            }
                        }
                    }

                    if (statusFile.exists() && !statusFile.delete()) {
                        logger.error("Failed to delete status file {}; this file should be cleaned up manually", statusFile);
                    }

                    if (pidFile.exists() && !pidFile.delete()) {
                        logger.error("Failed to delete pid file {}; this file should be cleaned up manually", pidFile);
                    }

                    logger.info("NiFi has finished shutting down.");
                }
            } else {
                logger.error("When sending SHUTDOWN command to NiFi, got unexpected response {}", response);
            }
        } catch (final IOException ioe) {
            if (pid == null) {
                logger.error("Failed to send shutdown command to port {} due to {}. No PID found for the NiFi process, so unable to kill process; "
                        + "the process should be killed manually.", new Object[]{port, ioe.toString()});
            } else {
                logger.error("Failed to send shutdown command to port {} due to {}. Will kill the NiFi Process with PID {}.", port, ioe.toString(), pid);
                notifyStop();
                killProcessTree(pid, logger);
                if (statusFile.exists() && !statusFile.delete()) {
                    logger.error("Failed to delete status file {}; this file should be cleaned up manually", statusFile);
                }
            }
        } finally {
            if (lockFile.exists() && !lockFile.delete()) {
                logger.error("Failed to delete lock file {}; this file should be cleaned up manually", lockFile);
            }
        }
    }
    /**获取当前进程的子进程*/
    private static List<String> getChildProcesses(final String ppid) throws IOException {
        final Process proc = Runtime.getRuntime().exec(new String[]{"ps", "-o", "pid", "--no-headers", "--ppid", ppid});
        final List<String> childPids = new ArrayList<>();
        try (final InputStream in = proc.getInputStream();
             final BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {

            String line;
            while ((line = reader.readLine()) != null) {
                childPids.add(line.trim());
            }
        }

        return childPids;
    }
    /**kill -9 全部杀死*/
    private void killProcessTree(final String pid, final Logger logger) throws IOException {
        logger.debug("Killing Process Tree for PID {}", pid);

        final List<String> children = getChildProcesses(pid);
        logger.debug("Children of PID {}: {}", new Object[]{pid, children});

        for (final String childPid : children) {
            killProcessTree(childPid, logger);
        }
        // 直接kill -9 全部杀死
        Runtime.getRuntime().exec(new String[]{"kill", "-9", pid});
    }
    /**判断进程是否在运行*/
    public static boolean isAlive(final Process process) {
        try {
            process.exitValue();
            return false;
        } catch (final IllegalStateException | IllegalThreadStateException itse) {
            return true;
        }
    }
    /**获取本机地址 */
    private String getHostname() {
        String hostname = "Unknown Host";
        String ip = "Unknown IP Address";
        try {
            final InetAddress localhost = InetAddress.getLocalHost();
            hostname = localhost.getHostName();
            ip = localhost.getHostAddress();
        } catch (final Exception e) {
            defaultLogger.warn("Failed to obtain hostname for notification due to:", e);
        }

        return hostname + " (" + ip + ")";
    }
    /**nifi.sh start 命令*/
    @SuppressWarnings({"rawtypes", "unchecked"})
    public void start() throws IOException, InterruptedException {
        // 读取run目录下的nifi.status文件  查看port是否有值  有值说明当前nifi正在运行中
        final Integer port = getCurrentPort(cmdLogger);
        if (port != null) {
            cmdLogger.info("Apache NiFi is already running, listening to Bootstrap on port " + port);
            return;
        }
        // 查找run目录下nifi.lock文件 如果存在 则尝试删除  删除失败则发出警告
        final File prevLockFile = getLockFile(cmdLogger);
        if (prevLockFile.exists() && !prevLockFile.delete()) {
            cmdLogger.warn("Failed to delete previous lock file {}; this file should be cleaned up manually", prevLockFile);
        }
        // 作启动进程使用
        final ProcessBuilder builder = new ProcessBuilder();

        if (!bootstrapConfigFile.exists()) {
            throw new FileNotFoundException(bootstrapConfigFile.getAbsolutePath());
        }
        // load bootstratp.conf 文件
        final Properties properties = new Properties();
        try (final FileInputStream fis = new FileInputStream(bootstrapConfigFile)) {
            properties.load(fis);
        }
        //bootstrap.con的配置 转map 作启动下一个进程的启动参数
        final Map<String, String> props = new HashMap<>();
        props.putAll((Map) properties);

        //从bootstrap.conf 读取working.dir (默认配置文件里是没有的)
        final String specifiedWorkingDir = props.get("working.dir");
        if (specifiedWorkingDir != null) {
            builder.directory(new File(specifiedWorkingDir));
        }
        // NiFi-HOME/conf/bootstrap.conf
        final File bootstrapConfigAbsoluteFile = bootstrapConfigFile.getAbsoluteFile();
        // NiFi-HOME/conf
        final File binDir = bootstrapConfigAbsoluteFile.getParentFile();
        // NiFi-HOME
        final File workingDir = binDir.getParentFile();

        if (specifiedWorkingDir == null) {
            builder.directory(workingDir);
        }
        // logs目录
        final String nifiLogDir = replaceNull(System.getProperty("org.apache.nifi.bootstrap.config.log.dir"), DEFAULT_LOG_DIR).trim();
        // lib.dir=./lib
        final String libFilename = replaceNull(props.get("lib.dir"), "./lib").trim();
        File libDir = getFile(libFilename, workingDir);
        //conf.dir=./conf
        final String confFilename = replaceNull(props.get("conf.dir"), "./conf").trim();
        File confDir = getFile(confFilename, workingDir);

        // 获取nifi配置文件名  默认为 nifi.properties
        String nifiPropsFilename = props.get("props.file");
        if (nifiPropsFilename == null) {
            if (confDir.exists()) {
                nifiPropsFilename = new File(confDir, "nifi.properties").getAbsolutePath();
            } else {
                nifiPropsFilename = DEFAULT_CONFIG_FILE;
            }
        }

        nifiPropsFilename = nifiPropsFilename.trim();

        //  组装 java 启动参数  将bootstrap.conf中的java.arg开头的值添加进去
        final List<String> javaAdditionalArgs = new ArrayList<>();
        for (final Map.Entry<String, String> entry : props.entrySet()) {
            final String key = entry.getKey();
            final String value = entry.getValue();

            if (key.startsWith("java.arg")) {
                javaAdditionalArgs.add(value);
            }
        }
        // 将lib目录下的jar包  文件筛选出来
        final File[] libFiles = libDir.listFiles(new FilenameFilter() {
            @Override
            public boolean accept(final File dir, final String filename) {
                return filename.toLowerCase().endsWith(".jar");
            }
        });

        if (libFiles == null || libFiles.length == 0) {
            throw new RuntimeException("Could not find lib directory at " + libDir.getAbsolutePath());
        }
        // 列出conf下的配置文件
        final File[] confFiles = confDir.listFiles();
        if (confFiles == null || confFiles.length == 0) {
            throw new RuntimeException("Could not find conf directory at " + confDir.getAbsolutePath());
        }
        //  java classpath(java -cp) 参数列表
        final List<String> cpFiles = new ArrayList<>(confFiles.length + libFiles.length);
        cpFiles.add(confDir.getAbsolutePath());
        for (final File file : libFiles) {
            cpFiles.add(file.getAbsolutePath());
        }
        // list 转 字符串
        final StringBuilder classPathBuilder = new StringBuilder();
        for (int i = 0; i < cpFiles.size(); i++) {
            final String filename = cpFiles.get(i);
            classPathBuilder.append(filename);
            if (i < cpFiles.size() - 1) {
                classPathBuilder.append(File.pathSeparatorChar);
            }
        }

        final String classPath = classPathBuilder.toString();
        //    java=java
        String javaCmd = props.get("java");
        if (javaCmd == null) {
            javaCmd = DEFAULT_JAVA_CMD;
        }
        // File.separatorChar 斜杠/
        if (javaCmd.equals(DEFAULT_JAVA_CMD)) {
            String javaHome = System.getenv("JAVA_HOME");
            if (javaHome != null) {
                String fileExtension = isWindows() ? ".exe" : "";
                File javaFile = new File(javaHome + File.separatorChar + "bin"
                        + File.separatorChar + "java" + fileExtension);
                if (javaFile.exists() && javaFile.canExecute()) {
                    javaCmd = javaFile.getAbsolutePath();
                }
            }
        }
        //监听RunNIFI进程，内部有一个监听serverSocket，随机了一个端口监听，里面把NIFI进程(RunNiFi启动的)的端口号和pid写进文件 
        final NiFiListener listener = new NiFiListener();
        //这个监听端口作为启动NIFI进程的变量，然后在NIFI进程中向RunNIFI 进行的serverSocket通信，发送数据(NiFi 进程的Port和随机生成的secretKey)
        final int listenPort = listener.start(this);

        final List<String> cmd = new ArrayList<>();

        cmd.add(javaCmd);
        cmd.add("-classpath");
        cmd.add(classPath);
        cmd.addAll(javaAdditionalArgs);
        cmd.add("-Dnifi.properties.file.path=" + nifiPropsFilename);
        cmd.add("-Dnifi.bootstrap.listen.port=" + listenPort);
        cmd.add("-Dapp=NiFi");
        cmd.add("-Dorg.apache.nifi.bootstrap.config.log.dir=" + nifiLogDir);
        if (!System.getProperty("java.version").startsWith("1.")) {
            // running on Java 9+, java.xml.bind module must be made available
            cmd.add("--add-modules=java.xml.bind");
        }
        cmd.add("org.apache.nifi.NiFi");
        if (isSensitiveKeyPresent(props)) {
            Path sensitiveKeyFile = createSensitiveKeyFile(confDir);
            writeSensitiveKeyFile(props, sensitiveKeyFile);
            cmd.add("-K " + sensitiveKeyFile.toFile().getAbsolutePath());
        }

        builder.command(cmd);

        final StringBuilder cmdBuilder = new StringBuilder();
        for (final String s : cmd) {
          cmdBuilder.append(s).append(" ");
        }
        //控制台输出日志
        cmdLogger.info("Starting Apache NiFi...");
        cmdLogger.info("Working Directory: {}", workingDir.getAbsolutePath());
        cmdLogger.info("Command: {}", cmdBuilder.toString());
        // graceful.shutdown.seconds=20 bootstrap.conf中的默认配置  关闭的默认时间
        String gracefulShutdown = props.get(GRACEFUL_SHUTDOWN_PROP);
        if (gracefulShutdown == null) {
            gracefulShutdown = DEFAULT_GRACEFUL_SHUTDOWN_VALUE;
        }

        final int gracefulShutdownSeconds;
        try {
            gracefulShutdownSeconds = Integer.parseInt(gracefulShutdown);
        } catch (final NumberFormatException nfe) {
            throw new NumberFormatException("The '" + GRACEFUL_SHUTDOWN_PROP + "' property in Bootstrap Config File "
                    + bootstrapConfigAbsoluteFile.getAbsolutePath() + " has an invalid value. Must be a non-negative integer");
        }

        if (gracefulShutdownSeconds < 0) {
            throw new NumberFormatException("The '" + GRACEFUL_SHUTDOWN_PROP + "' property in Bootstrap Config File "
                    + bootstrapConfigAbsoluteFile.getAbsolutePath() + " has an invalid value. Must be a non-negative integer");
        }
        // 启动进程
        Process process = builder.start();
        handleLogging(process);
        //返回进程在系统中的pid
        Long pid = OSUtils.getProcessId(process, cmdLogger);
        if (pid == null) {
            cmdLogger.warn("Launched Apache NiFi but could not determined the Process ID");
        } else {
            // 将pid写入run目录下的nifi.pid中
            nifiPid = pid;
            final Properties pidProperties = new Properties();
            pidProperties.setProperty(PID_KEY, String.valueOf(nifiPid));
            savePidProperties(pidProperties, cmdLogger);
            cmdLogger.info("Launched Apache NiFi with Process ID " + pid);
        }
        //  实例化 shutdownHook 执行NIFI关闭时的一些操作
        shutdownHook = new ShutdownHook(process, this, secretKey, gracefulShutdownSeconds, loggingExecutor);
        final Runtime runtime = Runtime.getRuntime();
        runtime.addShutdownHook(shutdownHook);
        // 获取主机地址
        final String hostname = getHostname();
        final SimpleDateFormat sdf = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss.SSS");
        String now = sdf.format(System.currentTimeMillis());
        String user = System.getProperty("user.name");
        if (user == null || user.trim().isEmpty()) {
            user = "Unknown User";
        }
        // NIFI 启动通知(如果配置了的话)
        serviceManager.notify(NotificationType.NIFI_STARTED, "NiFi Started on Host " + hostname, "Hello,\n\nApache NiFi has been started on host " + hostname + " at " + now + " by user " + user);
        // 循环监听NIFI进程状态 NIFI Died 重启以及通知 
        while (true) {
            final boolean alive = isAlive(process);
            // 如果进程还在运行 则继续循环 
            if (alive) {
                try {
                    Thread.sleep(1000L);
                } catch (final InterruptedException ie) {
                }
            }
            // 进程不在运行  
            else {
                try {
                    runtime.removeShutdownHook(shutdownHook);
                } catch (final IllegalStateException ise) {
                    // 在已经关闭时发生
                }

                now = sdf.format(System.currentTimeMillis());
                //  默认会自动重启  nifi
                if (autoRestartNiFi) {
                    final File statusFile = getStatusFile(defaultLogger);
                    if (!statusFile.exists()) {
                        defaultLogger.info("Status File no longer exists. Will not restart NiFi");
                        return;
                    }

                    final File lockFile = getLockFile(defaultLogger);
                    if (lockFile.exists()) {
                        defaultLogger.info("A shutdown was initiated. Will not restart NiFi");
                        return;
                    }
                    // 如果nifi之前没有启动过  那么也就没有重启一说
                    final boolean previouslyStarted = getNifiStarted();
                    if (!previouslyStarted) {
                        defaultLogger.info("NiFi never started. Will not restart NiFi");
                        return;
                    } else {
                        //如果到这一步，说明没啥问题，应该执行重启动作，设置NIFI启动状态为false
                        setNiFiStarted(false);
                    }
                    // nifi.bootstrap.sensitive.key  主键为十六进制格式，用于加密的敏感配置值  默认为空 
                    // 否则会在conf下生成sensitive.key文件
                    if (isSensitiveKeyPresent(props)) {
                        Path sensitiveKeyFile = createSensitiveKeyFile(confDir);
                        writeSensitiveKeyFile(props, sensitiveKeyFile);
                    }

                    defaultLogger.warn("Apache NiFi appears to have died. Restarting...");
                    process = builder.start();
                    handleLogging(process);

                    pid = OSUtils.getProcessId(process, defaultLogger);
                    if (pid == null) {
                        cmdLogger.warn("Launched Apache NiFi but could not obtain the Process ID");
                    } else {
                        nifiPid = pid;
                        final Properties pidProperties = new Properties();
                        pidProperties.setProperty(PID_KEY, String.valueOf(nifiPid));
                        savePidProperties(pidProperties, defaultLogger);
                        cmdLogger.info("Launched Apache NiFi with Process ID " + pid);
                    }

                    shutdownHook = new ShutdownHook(process, this, secretKey, gracefulShutdownSeconds, loggingExecutor);
                    runtime.addShutdownHook(shutdownHook);
                    //判断预期的时间内 nifi是否启动成功
                    final boolean started = waitForStart();

                    if (started) {
                        defaultLogger.info("Successfully started Apache NiFi{}", (pid == null ? "" : " with PID " + pid));
                        serviceManager.notify(NotificationType.NIFI_DIED, "NiFi Died on Host " + hostname,
                                "Hello,\n\nIt appears that Apache NiFi has died on host " + hostname + " at " + now + "; automatically restarting NiFi");
                    } else {
                        defaultLogger.error("Apache NiFi does not appear to have started");
                        // 我们希望重新启动nifi，因此发送一个通知，说明它已经死亡。如果我们不重新启动nifi，那么这意味着我们故意停止服务。
                        serviceManager.notify(NotificationType.NIFI_DIED, "NiFi Died on Host " + hostname,
                                "Hello,\n\nIt appears that Apache NiFi has died on host " + hostname + " at " + now +
                                        ". Attempted to restart NiFi but the services does not appear to have restarted!");
                    }
                } else {
                    return;
                }
            }
        }
    }
    /**写sensitive.key值*/
    private void writeSensitiveKeyFile(Map<String, String> props, Path sensitiveKeyFile) throws IOException {
        BufferedWriter sensitiveKeyWriter = Files.newBufferedWriter(sensitiveKeyFile, StandardCharsets.UTF_8);
        sensitiveKeyWriter.write(props.get(NIFI_BOOTSTRAP_SENSITIVE_KEY));
        sensitiveKeyWriter.close();
    }
    /**生成sensitive.key文件*/
    private Path createSensitiveKeyFile(File confDir) {
        Path sensitiveKeyFile = Paths.get(confDir+"/sensitive.key");

        final boolean isPosixSupported = FileSystems.getDefault().supportedFileAttributeViews().contains("posix");
        try {
            if (isPosixSupported) {
                // Initially create file with the empty permission set (so nobody can get a file descriptor on it):
                Set<PosixFilePermission> perms = new HashSet<PosixFilePermission>();
                FileAttribute<Set<PosixFilePermission>> attr = PosixFilePermissions.asFileAttribute(perms);
                sensitiveKeyFile = Files.createFile(sensitiveKeyFile, attr);

                // Then, once created, add owner-only rights:
                perms.add(PosixFilePermission.OWNER_WRITE);
                perms.add(PosixFilePermission.OWNER_READ);
                attr = PosixFilePermissions.asFileAttribute(perms);
                Files.setPosixFilePermissions(sensitiveKeyFile, perms);
            } else {
                // If Posix is not supported (e.g. Windows) then create the key file without permission settings.
                cmdLogger.info("Current file system does not support Posix, using default permission settings.");
                sensitiveKeyFile = Files.createFile(sensitiveKeyFile);
            }

        } catch (final FileAlreadyExistsException faee) {
            cmdLogger.error("The sensitive.key file {} already exists. That shouldn't have been. Aborting.", sensitiveKeyFile);
            System.exit(1);
        } catch (final Exception e) {
            cmdLogger.error("Other failure relating to setting permissions on {}. "
                    + "(so that only the owner can read it). "
                    + "This is fatal to the bootstrap process for security reasons. Exception was: {}", sensitiveKeyFile, e);
            System.exit(1);
        }
        return sensitiveKeyFile;
    }
    /**在bootstrap.conf中判断sensitive.key是否配置了*/
    private boolean isSensitiveKeyPresent(Map<String, String> props) {
        return props.containsKey(NIFI_BOOTSTRAP_SENSITIVE_KEY) && !StringUtils.isBlank(props.get(NIFI_BOOTSTRAP_SENSITIVE_KEY));
    }
    /**日志*/
    private void handleLogging(final Process process) {
        final Set<Future<?>> existingFutures = loggingFutures;
        if (existingFutures != null) {
            for (final Future<?> future : existingFutures) {
                future.cancel(false);
            }
        }

        final Future<?> stdOutFuture = loggingExecutor.submit(new Runnable() {
            @Override
            public void run() {
                final Logger stdOutLogger = LoggerFactory.getLogger("org.apache.nifi.StdOut");
                final InputStream in = process.getInputStream();
                try (final BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        stdOutLogger.info(line);
                    }
                } catch (IOException e) {
                    defaultLogger.error("Failed to read from NiFi's Standard Out stream", e);
                }
            }
        });

        final Future<?> stdErrFuture = loggingExecutor.submit(new Runnable() {
            @Override
            public void run() {
                final Logger stdErrLogger = LoggerFactory.getLogger("org.apache.nifi.StdErr");
                final InputStream in = process.getErrorStream();
                try (final BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        stdErrLogger.error(line);
                    }
                } catch (IOException e) {
                    defaultLogger.error("Failed to read from NiFi's Standard Error stream", e);
                }
            }
        });

        final Set<Future<?>> futures = new HashSet<>();
        futures.add(stdOutFuture);
        futures.add(stdErrFuture);
        this.loggingFutures = futures;
    }

    /**启动脚本中判断了本机系统，并设置到了环境变量当中，判断当前系统是否是windows*/
    private boolean isWindows() {
        final String osName = System.getProperty("os.name");
        return osName != null && osName.toLowerCase().contains("win");
    }
    /**启动等待*/
    private boolean waitForStart() {
        lock.lock();
        try {
            final long startTime = System.nanoTime();
            //ccPort NiFiCommandControlPort 启动前值为-1，由NiFiListener再次进行设置 1-65535  
            while (ccPort < 1) {
                try {
                    startupCondition.await(1, TimeUnit.SECONDS);
                } catch (final InterruptedException ie) {
                    return false;
                }

                final long waitNanos = System.nanoTime() - startTime;
                final long waitSeconds = TimeUnit.NANOSECONDS.toSeconds(waitNanos);
                if (waitSeconds > STARTUP_WAIT_SECONDS) {
                    return false;
                }
            }
        } finally {
            lock.unlock();
        }
        return true;
    }

    private File getFile(final String filename, final File workingDir) {
        File file = new File(filename);
        if (!file.isAbsolute()) {
            file = new File(workingDir, filename);
        }

        return file;
    }

    private String replaceNull(final String value, final String replacement) {
        return (value == null) ? replacement : value;
    }

    void setAutoRestartNiFi(final boolean restart) {
        this.autoRestartNiFi = restart;
    }

    /**NiFiListener 调用BootstrapCodec的communicate方法，中再调用次方法，设置ccport并 写入nifi.status文件中*/
    void setNiFiCommandControlPort(final int port, final String secretKey) throws IOException {
        this.ccPort = port;
        this.secretKey = secretKey;

        if (shutdownHook != null) {
            shutdownHook.setSecretKey(secretKey);
        }

        final File statusFile = getStatusFile(defaultLogger);

        final Properties nifiProps = new Properties();
        if (nifiPid != -1) {
            nifiProps.setProperty(PID_KEY, String.valueOf(nifiPid));
        }
        nifiProps.setProperty("port", String.valueOf(ccPort));
        nifiProps.setProperty("secret.key", secretKey);

        try {
            savePidProperties(nifiProps, defaultLogger);
        } catch (final IOException ioe) {
            defaultLogger.warn("Apache NiFi has started but failed to persist NiFi Port information to {} due to {}", new Object[]{statusFile.getAbsolutePath(), ioe});
        }

        defaultLogger.info("Apache NiFi now running and listening for Bootstrap requests on port {}", port);
    }

    int getNiFiCommandControlPort() {
        return this.ccPort;
    }

    void setNiFiStarted(final boolean nifiStarted) {
        startedLock.lock();
        try {
            this.nifiStarted = nifiStarted;
        } finally {
            startedLock.unlock();
        }
    }

    boolean getNifiStarted() {
        startedLock.lock();
        try {
            return nifiStarted;
        } finally {
            startedLock.unlock();
        }
    }

    private static class Status {

        private final Integer port;
        private final String pid;

        private final Boolean respondingToPing;
        private final Boolean processRunning;

        public Status(final Integer port, final String pid, final Boolean respondingToPing, final Boolean processRunning) {
            this.port = port;
            this.pid = pid;
            this.respondingToPing = respondingToPing;
            this.processRunning = processRunning;
        }

        public String getPid() {
            return pid;
        }

        public Integer getPort() {
            return port;
        }

        public boolean isRespondingToPing() {
            return Boolean.TRUE.equals(respondingToPing);
        }

        public boolean isProcessRunning() {
            return Boolean.TRUE.equals(processRunning);
        }
    }
}

```