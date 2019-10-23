
package org.apache.nifi.web.server;

/**
 * Encapsulates the Jetty instance.
 */
public class JettyServer implements NiFiServer {

    private static final Logger logger = LoggerFactory.getLogger(JettyServer.class);
    private static final String WEB_DEFAULTS_XML = "org/apache/nifi/web/webdefault.xml";
    //文件过滤  从lib下过滤出war包
    private static final FileFilter WAR_FILTER = new FileFilter() {
        @Override
        public boolean accept(File pathname) {
            final String nameToTest = pathname.getName().toLowerCase();
            return nameToTest.endsWith(".war") && pathname.isFile();
        }
    };
    // jetty-server
    private final Server server;
    // nifi.properties
    private final NiFiProperties props;

    private Bundle systemBundle;
    private Set<Bundle> bundles;
    private ExtensionMapping extensionMapping;

    private WebAppContext webApiContext;
    private WebAppContext webDocsContext;

    // content viewer and mime type specific extensions
    private WebAppContext webContentViewerContext;
    private Collection<WebAppContext> contentViewerWebContexts;

    // component (processor, controller service, reporting task) ui extensions
    private UiExtensionMapping componentUiExtensions;
    private Collection<WebAppContext> componentUiExtensionWebContexts;
    //bundles是lib下有序的tar war及其类加载器。。。
    public JettyServer(final NiFiProperties props, final Set<Bundle> bundles) {
        //Jetty的线程池
        final QueuedThreadPool threadPool = new QueuedThreadPool(props.getWebThreads());
        threadPool.setName("NiFi Web Server");

        // 创建Jetty Server
        this.server = new Server(threadPool);
        this.props = props;

        // Jetty支持JSP必须增加以下配置
        final Configuration.ClassList classlist = Configuration.ClassList.setServerDefault(server);
        classlist.addBefore(JettyWebXmlConfiguration.class.getName(), AnnotationConfiguration.class.getName());

        // 配置Jetty Server
        configureConnectors(server);

        // load wars from the bundle
        Handler warHandlers = loadWars(bundles);

        HandlerList allHandlers = new HandlerList();

        // Only restrict the host header if running in HTTPS mode
        if (props.isHTTPSConfigured()) {
            // Create a handler for the host header and add it to the server
            HostHeaderHandler hostHeaderHandler = new HostHeaderHandler(props);
            logger.info("Created HostHeaderHandler [" + hostHeaderHandler.toString() + "]");

            // Add this before the WAR handlers
            allHandlers.addHandler(hostHeaderHandler);
        } else {
            logger.info("Running in HTTP mode; host headers not restricted");
        }

        allHandlers.addHandler(warHandlers);
        server.setHandler(allHandlers);
    }

    /**
     * Instantiates this object but does not perform any configuration. Used for unit testing.
     */
     JettyServer(Server server, NiFiProperties properties) {
        this.server = server;
        this.props = properties;
    }

    private Handler loadWars(final Set<Bundle> bundles) {

        // 找出所有nar里的war包，从nar的解压目录中查找
        final Map<File, Bundle> warToBundleLookup = findWars(bundles);

        // 定位每一个将要部署的war
        File webUiWar = null;
        File webApiWar = null;
        File webErrorWar = null;
        File webDocsWar = null;
        File webContentViewerWar = null;
        List<File> otherWars = new ArrayList<>();
        for (File war : warToBundleLookup.keySet()) {
            if (war.getName().toLowerCase().startsWith("nifi-web-api")) {
                webApiWar = war;
            } else if (war.getName().toLowerCase().startsWith("nifi-web-error")) {
                webErrorWar = war;
            } else if (war.getName().toLowerCase().startsWith("nifi-web-docs")) {
                webDocsWar = war;
            } else if (war.getName().toLowerCase().startsWith("nifi-web-content-viewer")) {
                webContentViewerWar = war;
            } else if (war.getName().toLowerCase().startsWith("nifi-web")) {
                webUiWar = war;
            } else {
                otherWars.add(war);
            }
        }

        // 检测必要的war包
        if (webUiWar == null) {
            throw new RuntimeException("Unable to load nifi-web WAR");
        } else if (webApiWar == null) {
            throw new RuntimeException("Unable to load nifi-web-api WAR");
        } else if (webDocsWar == null) {
            throw new RuntimeException("Unable to load nifi-web-docs WAR");
        } else if (webErrorWar == null) {
            throw new RuntimeException("Unable to load nifi-web-error WAR");
        } else if (webContentViewerWar == null) {
            throw new RuntimeException("Unable to load nifi-web-content-viewer WAR");
        }

        // handlers for each war and init params for the web api
        final HandlerCollection handlers = new HandlerCollection();
        final Map<String, String> mimeMappings = new HashMap<>();
        final ClassLoader frameworkClassLoader = getClass().getClassLoader();
        final ClassLoader jettyClassLoader = frameworkClassLoader.getParent();

        // 部署其他的war
        if (CollectionUtils.isNotEmpty(otherWars)) {
            // 将所有 的UI扩展 war保存到context里 
            componentUiExtensionWebContexts = new ArrayList<>();
            contentViewerWebContexts = new ArrayList<>();

            // 按 组件类型 存UI扩展war
            final Map<String, List<UiExtension>> componentUiExtensionsByType = new HashMap<>();
            for (File war : otherWars) {
                // 识别出已知类型的war  ContentViewer ProcessorConfiguration ControllerServiceConfiguration ReportingTaskConfiguration
                final Map<UiExtensionType, List<String>> uiExtensionInWar = new HashMap<>();
                // 找出已知类型war并存到uiExtensionInWar
                identifyUiExtensionsForComponents(uiExtensionInWar, war);

                
                if (!uiExtensionInWar.isEmpty()) {
                    // nifi-standard-content-viewer-1.8.0.war -> nifi-standard-content-viewer-1.8.0
                    String warName = StringUtils.substringBeforeLast(war.getName(), ".");
                    // /nifi-standard-content-viewer-1.8.0
                    String warContextPath = String.format("/%s", warName);

                    // 通过war获取bundle，通过bundle获取ClassLoader
                    ClassLoader narClassLoaderForWar = warToBundleLookup.get(war).getClassLoader();

                    // 理论上 narClassLoaderForWar 不会为null
                    if (narClassLoaderForWar == null) {
                        narClassLoaderForWar = jettyClassLoader;
                    }

                    // 创建WebAppContext
                    WebAppContext extensionUiContext = loadWar(war, warContextPath, narClassLoaderForWar);

                    // create the ui extensions
                    for (final Map.Entry<UiExtensionType, List<String>> entry : uiExtensionInWar.entrySet()) {
                        final UiExtensionType extensionType = entry.getKey();
                        final List<String> types = entry.getValue();

                        if (UiExtensionType.ContentViewer.equals(extensionType)) {
                            // consider each content type identified
                            for (final String contentType : types) {
                                // map the content type to the context path
                                mimeMappings.put(contentType, warContextPath);
                            }

                            // this ui extension provides a content viewer
                            contentViewerWebContexts.add(extensionUiContext);
                        } else {
                            // consider each component type identified
                            for (final String componentTypeCoordinates : types) {
                                logger.info(String.format("Loading UI extension [%s, %s] for %s", extensionType, warContextPath, componentTypeCoordinates));

                                // record the extension definition
                                final UiExtension uiExtension = new UiExtension(extensionType, warContextPath);

                                // create if this is the first extension for this component type
                                List<UiExtension> componentUiExtensionsForType = componentUiExtensionsByType.get(componentTypeCoordinates);
                                if (componentUiExtensionsForType == null) {
                                    componentUiExtensionsForType = new ArrayList<>();
                                    componentUiExtensionsByType.put(componentTypeCoordinates, componentUiExtensionsForType);
                                }

                                // see if there is already a ui extension of this same time
                                if (containsUiExtensionType(componentUiExtensionsForType, extensionType)) {
                                    throw new IllegalStateException(String.format("Encountered duplicate UI for %s", componentTypeCoordinates));
                                }

                                // record this extension
                                componentUiExtensionsForType.add(uiExtension);
                            }

                            // this ui extension provides a component custom ui
                            componentUiExtensionWebContexts.add(extensionUiContext);
                        }
                    }

                    // include custom ui web context in the handlers
                    handlers.addHandler(extensionUiContext);
                }

            }

            // record all ui extensions to give to the web api
            componentUiExtensions = new UiExtensionMapping(componentUiExtensionsByType);
        } else {
            componentUiExtensions = new UiExtensionMapping(Collections.EMPTY_MAP);
        }

        // load the web ui app
        final WebAppContext webUiContext = loadWar(webUiWar, "/nifi", frameworkClassLoader);
        webUiContext.getInitParams().put("oidc-supported", String.valueOf(props.isOidcEnabled()));
        webUiContext.getInitParams().put("knox-supported", String.valueOf(props.isKnoxSsoEnabled()));
        webUiContext.getInitParams().put("whitelistedContextPaths", props.getWhitelistedContextPaths());
        handlers.addHandler(webUiContext);

        // load the web api app
        webApiContext = loadWar(webApiWar, "/nifi-api", frameworkClassLoader);
        handlers.addHandler(webApiContext);

        // load the content viewer app
        webContentViewerContext = loadWar(webContentViewerWar, "/nifi-content-viewer", frameworkClassLoader);
        webContentViewerContext.getInitParams().putAll(mimeMappings);
        handlers.addHandler(webContentViewerContext);

        // create a web app for the docs
        final String docsContextPath = "/nifi-docs";

        // load the documentation war
        webDocsContext = loadWar(webDocsWar, docsContextPath, frameworkClassLoader);

        // add the servlets which serve the HTML documentation within the documentation web app
        addDocsServlets(webDocsContext);

        handlers.addHandler(webDocsContext);

        // load the web error app
        final WebAppContext webErrorContext = loadWar(webErrorWar, "/", frameworkClassLoader);
        webErrorContext.getInitParams().put("whitelistedContextPaths", props.getWhitelistedContextPaths());
        handlers.addHandler(webErrorContext);

        // deploy the web apps
        return gzip(handlers);
    }

    /**
     * Returns whether or not the specified ui extensions already contains an extension of the specified type.
     *
     * @param componentUiExtensionsForType ui extensions for the type
     * @param extensionType                type of ui extension
     * @return whether or not the specified ui extensions already contains an extension of the specified type
     */
    private boolean containsUiExtensionType(final List<UiExtension> componentUiExtensionsForType, final UiExtensionType extensionType) {
        for (final UiExtension uiExtension : componentUiExtensionsForType) {
            if (extensionType.equals(uiExtension.getExtensionType())) {
                return true;
            }
        }

        return false;
    }

    /**
     * Enables compression for the specified handler.
     *
     * @param handler handler to enable compression for
     * @return compression enabled handler
     */
    private Handler gzip(final Handler handler) {
        final GzipHandler gzip = new GzipHandler();
        gzip.setIncludedMethods("GET", "POST", "PUT", "DELETE");
        gzip.setHandler(handler);
        return gzip;
    }
    /**从所有的nar包中过滤出war包*/
    private Map<File, Bundle> findWars(final Set<Bundle> bundles) {
        final Map<File, Bundle> wars = new HashMap<>();

        // 循环每一个bundle(每个nar包)
        bundles.forEach(bundle -> {
            final BundleDetails details = bundle.getBundleDetails();
            final File narDependencies = new File(details.getWorkingDirectory(), "NAR-INF/bundled-dependencies");
            if (narDependencies.isDirectory()) {
                // 列出nar下的每一个war包
                final File[] narDependencyDirs = narDependencies.listFiles(WAR_FILTER);
                if (narDependencyDirs == null) {
                    throw new IllegalStateException(String.format("Unable to access working directory for NAR dependencies in: %s", narDependencies.getAbsolutePath()));
                }

                // 记录找到的每一个war包
                for (final File war : narDependencyDirs) {
                    wars.put(war, bundle);
                }
            }
        });

        return wars;
    }

    private void readUiExtensions(final Map<UiExtensionType, List<String>> uiExtensions, final UiExtensionType uiExtensionType, final JarFile jarFile, final JarEntry jarEntry) throws IOException {
        if (jarEntry == null) {
            return;
        }

        // get an input stream for the nifi-processor configuration file
        try (BufferedReader in = new BufferedReader(new InputStreamReader(jarFile.getInputStream(jarEntry)))) {

            // read in each configured type
            String rawComponentType;
            while ((rawComponentType = in.readLine()) != null) {
                // extract the component type
                final String componentType = extractComponentType(rawComponentType);
                if (componentType != null) {
                    List<String> extensions = uiExtensions.get(uiExtensionType);

                    // if there are currently no extensions for this type create it
                    if (extensions == null) {
                        extensions = new ArrayList<>();
                        uiExtensions.put(uiExtensionType, extensions);
                    }

                    // add the specified type
                    extensions.add(componentType);
                }
            }
        }
    }

    /**
     * 找出已知类型的UI war
     *
     * @param uiExtensions extensions
     * @param warFile      war
     */
    private void identifyUiExtensionsForComponents(final Map<UiExtensionType, List<String>> uiExtensions, final File warFile) {
        try (final JarFile jarFile = new JarFile(warFile)) {
            // 找到ui war
            readUiExtensions(uiExtensions, UiExtensionType.ContentViewer, jarFile, jarFile.getJarEntry("META-INF/nifi-content-viewer"));
            readUiExtensions(uiExtensions, UiExtensionType.ProcessorConfiguration, jarFile, jarFile.getJarEntry("META-INF/nifi-processor-configuration"));
            readUiExtensions(uiExtensions, UiExtensionType.ControllerServiceConfiguration, jarFile, jarFile.getJarEntry("META-INF/nifi-controller-service-configuration"));
            readUiExtensions(uiExtensions, UiExtensionType.ReportingTaskConfiguration, jarFile, jarFile.getJarEntry("META-INF/nifi-reporting-task-configuration"));
        } catch (IOException ioe) {
            logger.warn(String.format("Unable to inspect %s for a UI extensions.", warFile));
        }
    }

    /**
     * Extracts the component type. Trims the line and considers comments.
     * Returns null if no type was found.
     *
     * @param line line
     * @return type
     */
    private String extractComponentType(final String line) {
        final String trimmedLine = line.trim();
        if (!trimmedLine.isEmpty() && !trimmedLine.startsWith("#")) {
            final int indexOfPound = trimmedLine.indexOf("#");
            return (indexOfPound > 0) ? trimmedLine.substring(0, indexOfPound) : trimmedLine;
        }
        return null;
    }

    private WebAppContext loadWar(final File warFile, final String contextPath, final ClassLoader parentClassLoader) {
        final WebAppContext webappContext = new WebAppContext(warFile.getPath(), contextPath);
        webappContext.setContextPath(contextPath);
        webappContext.setDisplayName(contextPath);

        // instruction jetty to examine these jars for tlds, web-fragments, etc
        webappContext.setAttribute("org.eclipse.jetty.server.webapp.ContainerIncludeJarPattern", ".*/[^/]*servlet-api-[^/]*\\.jar$|.*/javax.servlet.jsp.jstl-.*\\\\.jar$|.*/[^/]*taglibs.*\\.jar$");

        // remove slf4j server class to allow WAR files to have slf4j dependencies in WEB-INF/lib
        List<String> serverClasses = new ArrayList<>(Arrays.asList(webappContext.getServerClasses()));
        serverClasses.remove("org.slf4j.");
        webappContext.setServerClasses(serverClasses.toArray(new String[0]));
        webappContext.setDefaultsDescriptor(WEB_DEFAULTS_XML);

        // get the temp directory for this webapp
        File tempDir = new File(props.getWebWorkingDirectory(), warFile.getName());
        if (tempDir.exists() && !tempDir.isDirectory()) {
            throw new RuntimeException(tempDir.getAbsolutePath() + " is not a directory");
        } else if (!tempDir.exists()) {
            final boolean made = tempDir.mkdirs();
            if (!made) {
                throw new RuntimeException(tempDir.getAbsolutePath() + " could not be created");
            }
        }
        if (!(tempDir.canRead() && tempDir.canWrite())) {
            throw new RuntimeException(tempDir.getAbsolutePath() + " directory does not have read/write privilege");
        }

        // configure the temp dir
        webappContext.setTempDirectory(tempDir);

        // configure the max form size (3x the default)
        webappContext.setMaxFormContentSize(600000);

        // add a filter to set the X-Frame-Options filter
        webappContext.addFilter(new FilterHolder(FRAME_OPTIONS_FILTER), "/*", EnumSet.allOf(DispatcherType.class));

        // add a filter to set the Content Security Policy frame-ancestors directive
        FilterHolder cspFilter = new FilterHolder(new ContentSecurityPolicyFilter());
        cspFilter.setName(ContentSecurityPolicyFilter.class.getSimpleName());
        webappContext.addFilter(cspFilter, "/*", EnumSet.allOf(DispatcherType.class));

        try {
            // configure the class loader - webappClassLoader -> jetty nar -> web app's nar -> ...
            webappContext.setClassLoader(new WebAppClassLoader(parentClassLoader, webappContext));
        } catch (final IOException ioe) {
            startUpFailure(ioe);
        }

        logger.info("Loading WAR: " + warFile.getAbsolutePath() + " with context path set to " + contextPath);
        return webappContext;
    }

    private void addDocsServlets(WebAppContext docsContext) {
        try {
            // Load the nifi/docs directory
            final File docsDir = getDocsDir("docs");

            // load the component documentation working directory
            final File componentDocsDirPath = props.getComponentDocumentationWorkingDirectory();
            final File workingDocsDirectory = getWorkingDocsDirectory(componentDocsDirPath);

            // Load the API docs
            final File webApiDocsDir = getWebApiDocsDir();

            // Create the servlet which will serve the static resources
            ServletHolder defaultHolder = new ServletHolder("default", DefaultServlet.class);
            defaultHolder.setInitParameter("dirAllowed", "false");

            ServletHolder docs = new ServletHolder("docs", DefaultServlet.class);
            docs.setInitParameter("resourceBase", docsDir.getPath());

            ServletHolder components = new ServletHolder("components", DefaultServlet.class);
            components.setInitParameter("resourceBase", workingDocsDirectory.getPath());

            ServletHolder restApi = new ServletHolder("rest-api", DefaultServlet.class);
            restApi.setInitParameter("resourceBase", webApiDocsDir.getPath());

            docsContext.addServlet(docs, "/html/*");
            docsContext.addServlet(components, "/components/*");
            docsContext.addServlet(restApi, "/rest-api/*");

            docsContext.addServlet(defaultHolder, "/");

            logger.info("Loading documents web app with context path set to " + docsContext.getContextPath());

        } catch (Exception ex) {
            logger.error("Unhandled Exception in createDocsWebApp: " + ex.getMessage());
            startUpFailure(ex);
        }
    }


    /**
     * Returns a File object for the directory containing NIFI documentation.
     * <p>
     * Formerly, if the docsDirectory did not exist NIFI would fail to start
     * with an IllegalStateException and a rather unhelpful log message.
     * NIFI-2184 updates the process such that if the docsDirectory does not
     * exist an attempt will be made to create the directory. If that is
     * successful NIFI will no longer fail and will start successfully barring
     * any other errors. The side effect of the docsDirectory not being present
     * is that the documentation links under the 'General' portion of the help
     * page will not be accessible, but at least the process will be running.
     *
     * @param docsDirectory Name of documentation directory in installation directory.
     * @return A File object to the documentation directory; else startUpFailure called.
     */
    private File getDocsDir(final String docsDirectory) {
        File docsDir;
        try {
            docsDir = Paths.get(docsDirectory).toRealPath().toFile();
        } catch (IOException ex) {
            logger.info("Directory '" + docsDirectory + "' is missing. Some documentation will be unavailable.");
            docsDir = new File(docsDirectory).getAbsoluteFile();
            final boolean made = docsDir.mkdirs();
            if (!made) {
                logger.error("Failed to create 'docs' directory!");
                startUpFailure(new IOException(docsDir.getAbsolutePath() + " could not be created"));
            }
        }
        return docsDir;
    }

    private File getWorkingDocsDirectory(final File componentDocsDirPath) {
        File workingDocsDirectory = null;
        try {
            workingDocsDirectory = componentDocsDirPath.toPath().toRealPath().getParent().toFile();
        } catch (IOException ex) {
            logger.error("Failed to load :" + componentDocsDirPath.getAbsolutePath());
            startUpFailure(ex);
        }
        return workingDocsDirectory;
    }

    private File getWebApiDocsDir() {
        // load the rest documentation
        final File webApiDocsDir = new File(webApiContext.getTempDirectory(), "webapp/docs");
        if (!webApiDocsDir.exists()) {
            final boolean made = webApiDocsDir.mkdirs();
            if (!made) {
                logger.error("Failed to create " + webApiDocsDir.getAbsolutePath());
                startUpFailure(new IOException(webApiDocsDir.getAbsolutePath() + " could not be created"));
            }
        }
        return webApiDocsDir;
    }

    private void configureConnectors(final Server server) throws ServerConfigurationException {
        // create the http configuration
        final HttpConfiguration httpConfiguration = new HttpConfiguration();
        final int headerSize = DataUnit.parseDataSize(props.getWebMaxHeaderSize(), DataUnit.B).intValue();
        httpConfiguration.setRequestHeaderSize(headerSize);
        httpConfiguration.setResponseHeaderSize(headerSize);

        // Check if both HTTP and HTTPS connectors are configured and fail if both are configured
        if (bothHttpAndHttpsConnectorsConfigured(props)) {
            logger.error("NiFi only supports one mode of HTTP or HTTPS operation, not both simultaneously. " +
                    "Check the nifi.properties file and ensure that either the HTTP hostname and port or the HTTPS hostname and port are empty");
            startUpFailure(new IllegalStateException("Only one of the HTTP and HTTPS connectors can be configured at one time"));
        }

        if (props.getSslPort() != null) {
            configureHttpsConnector(server, httpConfiguration);
        } else if (props.getPort() != null) {
            configureHttpConnector(server, httpConfiguration);
        } else {
            logger.error("Neither the HTTP nor HTTPS connector was configured in nifi.properties");
            startUpFailure(new IllegalStateException("Must configure HTTP or HTTPS connector"));
        }
    }

    /**
     * Configures an HTTPS connector and adds it to the server.
     *
     * @param server            the Jetty server instance
     * @param httpConfiguration the configuration object for the HTTPS protocol settings
     */
    private void configureHttpsConnector(Server server, HttpConfiguration httpConfiguration) {
        String hostname = props.getProperty(NiFiProperties.WEB_HTTPS_HOST);
        final Integer port = props.getSslPort();
        String connectorLabel = "HTTPS";
        final Map<String, String> httpsNetworkInterfaces = props.getHttpsNetworkInterfaces();
        ServerConnectorCreator<Server, HttpConfiguration, ServerConnector> scc = (s, c) -> createUnconfiguredSslServerConnector(s, c, port);

        configureGenericConnector(server, httpConfiguration, hostname, port, connectorLabel, httpsNetworkInterfaces, scc);
    }

    /**
     * Configures an HTTP connector and adds it to the server.
     *
     * @param server            the Jetty server instance
     * @param httpConfiguration the configuration object for the HTTP protocol settings
     */
    private void configureHttpConnector(Server server, HttpConfiguration httpConfiguration) {
        String hostname = props.getProperty(NiFiProperties.WEB_HTTP_HOST);
        final Integer port = props.getPort();
        String connectorLabel = "HTTP";
        final Map<String, String> httpNetworkInterfaces = props.getHttpNetworkInterfaces();
        ServerConnectorCreator<Server, HttpConfiguration, ServerConnector> scc = (s, c) -> new ServerConnector(s, new HttpConnectionFactory(c));

        configureGenericConnector(server, httpConfiguration, hostname, port, connectorLabel, httpNetworkInterfaces, scc);
    }

    /**
     * Configures an HTTP(S) connector for the server given the provided parameters. The functionality between HTTP and HTTPS connectors is largely similar.
     * Here the common behavior has been extracted into a shared method and the respective calling methods obtain the right values and a lambda function for the differing behavior.
     *
     * @param server                 the Jetty server instance
     * @param configuration          the HTTP/HTTPS configuration instance
     * @param hostname               the hostname from the nifi.properties file
     * @param port                   the port to expose
     * @param connectorLabel         used for log output (e.g. "HTTP" or "HTTPS")
     * @param networkInterfaces      the map of network interfaces from nifi.properties
     * @param serverConnectorCreator a function which accepts a {@code Server} and {@code HttpConnection} instance and returns a {@code ServerConnector}
     */
    private void configureGenericConnector(Server server, HttpConfiguration configuration, String hostname, Integer port, String connectorLabel, Map<String, String> networkInterfaces,
                                           ServerConnectorCreator<Server, HttpConfiguration, ServerConnector> serverConnectorCreator) {
        if (port < 0 || (int) Math.pow(2, 16) <= port) {
            throw new ServerConfigurationException("Invalid " + connectorLabel + " port: " + port);
        }

        logger.info("Configuring Jetty for " + connectorLabel + " on port: " + port);

        final List<Connector> serverConnectors = Lists.newArrayList();

        // Calculate Idle Timeout as twice the auto-refresh interval. This ensures that even with some variance in timing,
        // we are able to avoid closing connections from users' browsers most of the time. This can make a significant difference
        // in HTTPS connections, as each HTTPS connection that is established must perform the SSL handshake.
        final String autoRefreshInterval = props.getAutoRefreshInterval();
        final long autoRefreshMillis = autoRefreshInterval == null ? 30000L : FormatUtils.getTimeDuration(autoRefreshInterval, TimeUnit.MILLISECONDS);
        final long idleTimeout = autoRefreshMillis * 2;

        // If the interfaces collection is empty or each element is empty
        if (networkInterfaces.isEmpty() || networkInterfaces.values().stream().filter(value -> !Strings.isNullOrEmpty(value)).collect(Collectors.toList()).isEmpty()) {
            final ServerConnector serverConnector = serverConnectorCreator.create(server, configuration);

            // Set host and port
            if (StringUtils.isNotBlank(hostname)) {
                serverConnector.setHost(hostname);
            }
            serverConnector.setPort(port);
            serverConnector.setIdleTimeout(idleTimeout);
            serverConnectors.add(serverConnector);
        } else {
            // Add connectors for all IPs from network interfaces
            serverConnectors.addAll(Lists.newArrayList(networkInterfaces.values().stream().map(ifaceName -> {
                NetworkInterface iface = null;
                try {
                    iface = NetworkInterface.getByName(ifaceName);
                } catch (SocketException e) {
                    logger.error("Unable to get network interface by name {}", ifaceName, e);
                }
                if (iface == null) {
                    logger.warn("Unable to find network interface named {}", ifaceName);
                }
                return iface;
            }).filter(Objects::nonNull).flatMap(iface -> Collections.list(iface.getInetAddresses()).stream())
                    .map(inetAddress -> {
                        final ServerConnector serverConnector = serverConnectorCreator.create(server, configuration);

                        // Set host and port
                        serverConnector.setHost(inetAddress.getHostAddress());
                        serverConnector.setPort(port);
                        serverConnector.setIdleTimeout(idleTimeout);

                        return serverConnector;
                    }).collect(Collectors.toList())));
        }
        // Add all connectors
        serverConnectors.forEach(server::addConnector);
    }

    /**
     * Returns true if there are configured properties for both HTTP and HTTPS connectors (specifically port because the hostname can be left blank in the HTTP connector).
     * Prints a warning log message with the relevant properties.
     *
     * @param props the NiFiProperties
     * @return true if both ports are present
     */
    static boolean bothHttpAndHttpsConnectorsConfigured(NiFiProperties props) {
        Integer httpPort = props.getPort();
        String httpHostname = props.getProperty(NiFiProperties.WEB_HTTP_HOST);

        Integer httpsPort = props.getSslPort();
        String httpsHostname = props.getProperty(NiFiProperties.WEB_HTTPS_HOST);

        if (httpPort != null && httpsPort != null) {
            logger.warn("Both the HTTP and HTTPS connectors are configured in nifi.properties. Only one of these connectors should be configured. See the NiFi Admin Guide for more details");
            logger.warn("HTTP connector:   http://" + httpHostname + ":" + httpPort);
            logger.warn("HTTPS connector: https://" + httpsHostname + ":" + httpsPort);
            return true;
        }

        return false;
    }

    private ServerConnector createUnconfiguredSslServerConnector(Server server, HttpConfiguration httpConfiguration, int port) {
        // add some secure config
        final HttpConfiguration httpsConfiguration = new HttpConfiguration(httpConfiguration);
        httpsConfiguration.setSecureScheme("https");
        httpsConfiguration.setSecurePort(port);
        httpsConfiguration.addCustomizer(new SecureRequestCustomizer());

        // build the connector
        return new ServerConnector(server,
                new SslConnectionFactory(createSslContextFactory(), "http/1.1"),
                new HttpConnectionFactory(httpsConfiguration));
    }

    private SslContextFactory createSslContextFactory() {
        final SslContextFactory contextFactory = new SslContextFactory();
        configureSslContextFactory(contextFactory, props);
        return contextFactory;
    }

    protected static void configureSslContextFactory(SslContextFactory contextFactory, NiFiProperties props) {
        // require client auth when not supporting login, Kerberos service, or anonymous access
        if (props.isClientAuthRequiredForRestApi()) {
            contextFactory.setNeedClientAuth(true);
        } else {
            contextFactory.setWantClientAuth(true);
        }

        /* below code sets JSSE system properties when values are provided */
        // keystore properties
        if (StringUtils.isNotBlank(props.getProperty(NiFiProperties.SECURITY_KEYSTORE))) {
            contextFactory.setKeyStorePath(props.getProperty(NiFiProperties.SECURITY_KEYSTORE));
        }
        String keyStoreType = props.getProperty(NiFiProperties.SECURITY_KEYSTORE_TYPE);
        if (StringUtils.isNotBlank(keyStoreType)) {
            contextFactory.setKeyStoreType(keyStoreType);
            String keyStoreProvider = KeyStoreUtils.getKeyStoreProvider(keyStoreType);
            if (StringUtils.isNoneEmpty(keyStoreProvider)) {
                contextFactory.setKeyStoreProvider(keyStoreProvider);
            }
        }
        final String keystorePassword = props.getProperty(NiFiProperties.SECURITY_KEYSTORE_PASSWD);
        final String keyPassword = props.getProperty(NiFiProperties.SECURITY_KEY_PASSWD);
        if (StringUtils.isNotBlank(keystorePassword)) {
            // if no key password was provided, then assume the keystore password is the same as the key password.
            final String defaultKeyPassword = (StringUtils.isBlank(keyPassword)) ? keystorePassword : keyPassword;
            contextFactory.setKeyStorePassword(keystorePassword);
            contextFactory.setKeyManagerPassword(defaultKeyPassword);
        } else if (StringUtils.isNotBlank(keyPassword)) {
            // since no keystore password was provided, there will be no keystore integrity check
            contextFactory.setKeyManagerPassword(keyPassword);
        }

        // truststore properties
        if (StringUtils.isNotBlank(props.getProperty(NiFiProperties.SECURITY_TRUSTSTORE))) {
            contextFactory.setTrustStorePath(props.getProperty(NiFiProperties.SECURITY_TRUSTSTORE));
        }
        String trustStoreType = props.getProperty(NiFiProperties.SECURITY_TRUSTSTORE_TYPE);
        if (StringUtils.isNotBlank(trustStoreType)) {
            contextFactory.setTrustStoreType(trustStoreType);
            String trustStoreProvider = KeyStoreUtils.getKeyStoreProvider(trustStoreType);
            if (StringUtils.isNoneEmpty(trustStoreProvider)) {
                contextFactory.setTrustStoreProvider(trustStoreProvider);
            }
        }
        if (StringUtils.isNotBlank(props.getProperty(NiFiProperties.SECURITY_TRUSTSTORE_PASSWD))) {
            contextFactory.setTrustStorePassword(props.getProperty(NiFiProperties.SECURITY_TRUSTSTORE_PASSWD));
        }
    }

    @Override
    public void start() {
        try {
            ExtensionManager.discoverExtensions(systemBundle, bundles);
            ExtensionManager.logClassLoaderMapping();

            DocGenerator.generate(props, extensionMapping);

            //add some properties to JVM
            String nifiPath = System.getProperty("nifi.properties.file.path");
            if (nifiPath.contains("nifi.properties")) {
                String sdk = nifiPath.replace("nifi.properties", "sdk.properties");
                System.setProperty("YHT_SDK_FILEPATH", sdk);
                System.setProperty("TENANT_SDK_FILEPATH", sdk);
                System.setProperty("iuap-sdk-filepath", sdk);
            }
            // start the server
            server.start();

            // ensure everything started successfully
            for (Handler handler : server.getChildHandlers()) {
                // see if the handler is a web app
                if (handler instanceof WebAppContext) {
                    WebAppContext context = (WebAppContext) handler;

                    // see if this webapp had any exceptions that would
                    // cause it to be unavailable
                    if (context.getUnavailableException() != null) {
                        startUpFailure(context.getUnavailableException());
                    }
                }
            }

            // ensure the appropriate wars deployed successfully before injecting the NiFi context and security filters
            // this must be done after starting the server (and ensuring there were no start up failures)
            if (webApiContext != null) {
                // give the web api the component ui extensions
                final ServletContext webApiServletContext = webApiContext.getServletHandler().getServletContext();
                webApiServletContext.setAttribute("nifi-ui-extensions", componentUiExtensions);

                // get the application context
                final WebApplicationContext webApplicationContext = WebApplicationContextUtils.getRequiredWebApplicationContext(webApiServletContext);

                // component ui extensions
                if (CollectionUtils.isNotEmpty(componentUiExtensionWebContexts)) {
                    final NiFiWebConfigurationContext configurationContext = webApplicationContext.getBean("nifiWebConfigurationContext", NiFiWebConfigurationContext.class);

                    for (final WebAppContext customUiContext : componentUiExtensionWebContexts) {
                        // set the NiFi context in each custom ui servlet context
                        final ServletContext customUiServletContext = customUiContext.getServletHandler().getServletContext();
                        customUiServletContext.setAttribute("nifi-web-configuration-context", configurationContext);

                        // add the security filter to any ui extensions wars
                        final FilterHolder securityFilter = webApiContext.getServletHandler().getFilter("springSecurityFilterChain");
                        if (securityFilter != null) {
                            customUiContext.addFilter(securityFilter, "/*", EnumSet.allOf(DispatcherType.class));
                        }
                    }
                }

                // content viewer extensions
                if (CollectionUtils.isNotEmpty(contentViewerWebContexts)) {
                    for (final WebAppContext contentViewerContext : contentViewerWebContexts) {
                        // add the security filter to any content viewer  wars
                        final FilterHolder securityFilter = webApiContext.getServletHandler().getFilter("springSecurityFilterChain");
                        if (securityFilter != null) {
                            contentViewerContext.addFilter(securityFilter, "/*", EnumSet.allOf(DispatcherType.class));
                        }
                    }
                }

                // content viewer controller
                if (webContentViewerContext != null) {
                    final ContentAccess contentAccess = webApplicationContext.getBean("contentAccess", ContentAccess.class);

                    // add the content access
                    final ServletContext webContentViewerServletContext = webContentViewerContext.getServletHandler().getServletContext();
                    webContentViewerServletContext.setAttribute("nifi-content-access", contentAccess);

                    final FilterHolder securityFilter = webApiContext.getServletHandler().getFilter("springSecurityFilterChain");
                    if (securityFilter != null) {
                        webContentViewerContext.addFilter(securityFilter, "/*", EnumSet.allOf(DispatcherType.class));
                    }
                }
            }

            // ensure the web document war was loaded and provide the extension mapping
            if (webDocsContext != null) {
                final ServletContext webDocsServletContext = webDocsContext.getServletHandler().getServletContext();
                webDocsServletContext.setAttribute("nifi-extension-mapping", extensionMapping);
            }

            // if this nifi is a node in a cluster, start the flow service and load the flow - the
            // flow service is loaded here for clustered nodes because the loading of the flow will
            // initialize the connection between the node and the NCM. if the node connects (starts
            // heartbeating, etc), the NCM may issue web requests before the application (wars) have
            // finished loading. this results in the node being disconnected since its unable to
            // successfully respond to the requests. to resolve this, flow loading was moved to here
            // (after the wars have been successfully deployed) when this nifi instance is a node
            // in a cluster
            if (props.isNode()) {

                FlowService flowService = null;
                try {

                    logger.info("Loading Flow...");

                    ApplicationContext ctx = WebApplicationContextUtils.getWebApplicationContext(webApiContext.getServletContext());
                    flowService = ctx.getBean("flowService", FlowService.class);

                    // start and load the flow
                    flowService.start();
                    flowService.load(null);

                    logger.info("Flow loaded successfully.");

                } catch (BeansException | LifeCycleStartException | IOException | FlowSerializationException | FlowSynchronizationException | UninheritableFlowException e) {
                    // ensure the flow service is terminated
                    if (flowService != null && flowService.isRunning()) {
                        flowService.stop(false);
                    }
                    logger.error("Unable to load flow due to: " + e, e);
                    throw new Exception("Unable to load flow due to: " + e); // cannot wrap the exception as they are not defined in a classloader accessible to the caller
                }
            }

            // dump the application url after confirming everything started successfully
            dumpUrls();
        } catch (Exception ex) {
            startUpFailure(ex);
        }
    }

    private void dumpUrls() throws SocketException {
        final List<String> urls = new ArrayList<>();

        for (Connector connector : server.getConnectors()) {
            if (connector instanceof ServerConnector) {
                final ServerConnector serverConnector = (ServerConnector) connector;

                Set<String> hosts = new HashSet<>();

                // determine the hosts
                if (StringUtils.isNotBlank(serverConnector.getHost())) {
                    hosts.add(serverConnector.getHost());
                } else {
                    Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();
                    if (networkInterfaces != null) {
                        for (NetworkInterface networkInterface : Collections.list(networkInterfaces)) {
                            for (InetAddress inetAddress : Collections.list(networkInterface.getInetAddresses())) {
                                hosts.add(inetAddress.getHostAddress());
                            }
                        }
                    }
                }

                // ensure some hosts were found
                if (!hosts.isEmpty()) {
                    String scheme = "http";
                    if (props.getSslPort() != null && serverConnector.getPort() == props.getSslPort()) {
                        scheme = "https";
                    }

                    // dump each url
                    for (String host : hosts) {
                        urls.add(String.format("%s://%s:%s", scheme, host, serverConnector.getPort()));
                    }
                }
            }
        }

        if (urls.isEmpty()) {
            logger.warn("NiFi has started, but the UI is not available on any hosts. Please verify the host properties.");
        } else {
            // log the ui location
            logger.info("NiFi has started. The UI is available at the following URLs:");
            for (final String url : urls) {
                logger.info(String.format("%s/nifi", url));
            }
        }
    }

    private void startUpFailure(Throwable t) {
        System.err.println("Failed to start web server: " + t.getMessage());
        System.err.println("Shutting down...");
        logger.warn("Failed to start web server... shutting down.", t);
        System.exit(1);
    }

    @Override
    public void setExtensionMapping(ExtensionMapping extensionMapping) {
        this.extensionMapping = extensionMapping;
    }

    @Override
    public void setBundles(Bundle systemBundle, Set<Bundle> bundles) {
        this.systemBundle = systemBundle;
        this.bundles = bundles;
    }

    @Override
    public void stop() {
        try {
            server.stop();
        } catch (Exception ex) {
            logger.warn("Failed to stop web server", ex);
        }
    }

    private static final Filter FRAME_OPTIONS_FILTER = new Filter() {
        private static final String FRAME_OPTIONS = "X-Frame-Options";
        private static final String SAME_ORIGIN = "SAMEORIGIN";

        @Override
        public void doFilter(final ServletRequest req, final ServletResponse resp, final FilterChain filterChain)
                throws IOException, ServletException {

            // set frame options accordingly
            final HttpServletResponse response = (HttpServletResponse) resp;
            response.setHeader(FRAME_OPTIONS, SAME_ORIGIN);

            filterChain.doFilter(req, resp);
        }

        @Override
        public void init(final FilterConfig config) {
        }

        @Override
        public void destroy() {
        }
    };
}

@FunctionalInterface
interface ServerConnectorCreator<Server, HttpConfiguration, ServerConnector> {
    ServerConnector create(Server server, HttpConfiguration httpConfiguration);
}

