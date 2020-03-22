# NIFI创建Processor代码分析
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com**
***
内容：

## 创建一个Processor

在[Processor组件类的一些方法](./Processor方法.md)一文中我们开篇简单的讲述了创建一个Processor的过程，当时我们的关注点是创建的过程中调用的Processor的那些方法，这里我们想知道创建后的Processor被放到了哪里？都干了些什么事情？

我们从 **flowController.createProcessor(...)**开始看起

```java
    /**
     * 根据给的类型和ID创建一个新的Processor
     *
     * @param type 全类名
     * @param id Processor ID
     * @param coordinate 坐标
     * @param firstTimeAdded 第一次添加 调用@OnAdded注解标注的方法，Processor组件类的一些方法一文中有说明
     * @return new processor node
     * @throws NullPointerException if either arg is null
     * @throws ProcessorInstantiationException if the processor cannot be
     * instantiated for any reason
     */
    public ProcessorNode createProcessor(final String type, String id, final BundleCoordinate coordinate, final Set<URL> additionalUrls,
                                         final boolean firstTimeAdded, final boolean registerLogObserver) throws ProcessorInstantiationException {
        //常量池中创建引用                                     
        id = id.intern();
        boolean creationSuccessful;
        LoggableComponent<Processor> processor;
        // 确保LogRepository的第一个引用发生在NarCloseable之外，这样我们就可以使用framework的类加载器，日志bullet监控
        final LogRepository logRepository = LogRepositoryFactory.getRepository(id);
        try {
            //核心代码创建Processor
            processor = instantiateProcessor(type, id, coordinate, additionalUrls);
            //没有异常就是创建成功了
            creationSuccessful = true;
        } catch (final ProcessorInstantiationException pie) {
            //异常处理，创建一个GhostProcessor代替
            LOG.error("Could not create Processor of type " + type + " for ID " + id + "; creating \"Ghost\" implementation", pie);
            final GhostProcessor ghostProc = new GhostProcessor();
            ghostProc.setIdentifier(id);
            ghostProc.setCanonicalClassName(type);
            processor = new LoggableComponent<>(ghostProc, coordinate, null);
            creationSuccessful = false;
        }

        final ComponentVariableRegistry componentVarRegistry = new StandardComponentVariableRegistry(this.variableRegistry);
        final ValidationContextFactory validationContextFactory = new StandardValidationContextFactory(controllerServiceProvider, componentVarRegistry);
        final ProcessorNode procNode;
        if (creationSuccessful) {
            procNode = new StandardProcessorNode(processor, id, validationContextFactory, processScheduler, controllerServiceProvider,
                nifiProperties, componentVarRegistry, this, validationTrigger);
        } else {
            final String simpleClassName = type.contains(".") ? StringUtils.substringAfterLast(type, ".") : type;
            final String componentType = "(Missing) " + simpleClassName;
            procNode = new StandardProcessorNode(processor, id, validationContextFactory, processScheduler, controllerServiceProvider,
                componentType, type, nifiProperties, componentVarRegistry, this, validationTrigger, true);
        }

        if (registerLogObserver) {
            logRepository.addObserver(StandardProcessorNode.BULLETIN_OBSERVER_ID, LogLevel.WARN, new ProcessorLogObserver(getBulletinRepository(), procNode));
        }

        try {
            final Class<?> procClass = procNode.getProcessor().getClass();
            if(procClass.isAnnotationPresent(DefaultSettings.class)) {
                DefaultSettings ds = procClass.getAnnotation(DefaultSettings.class);
                try {
                    procNode.setYieldPeriod(ds.yieldDuration());
                } catch(Throwable ex) {
                    LOG.error(String.format("Error while setting yield period from DefaultSettings annotation:%s",ex.getMessage()),ex);
                }
                try {

                    procNode.setPenalizationPeriod(ds.penaltyDuration());
                } catch(Throwable ex) {
                    LOG.error(String.format("Error while setting penalty duration from DefaultSettings annotation:%s",ex.getMessage()),ex);
                }

                // calling setBulletinLevel changes the level in the LogRepository so we only want to do this when
                // the caller said to register the log observer, otherwise we could be changing the level when we didn't mean to
                if (registerLogObserver) {
                    try {
                        procNode.setBulletinLevel(ds.bulletinLevel());
                    } catch (Throwable ex) {
                        LOG.error(String.format("Error while setting bulletin level from DefaultSettings annotation:%s", ex.getMessage()), ex);
                    }
                }
            }
        } catch (Throwable ex) {
            LOG.error(String.format("Error while setting default settings from DefaultSettings annotation: %s",ex.getMessage()),ex);
        }

        if (firstTimeAdded) {
            try (final NarCloseable x = NarCloseable.withComponentNarLoader(procNode.getProcessor().getClass(), procNode.getProcessor().getIdentifier())) {
                ReflectionUtils.invokeMethodsWithAnnotation(OnAdded.class, procNode.getProcessor());
            } catch (final Exception e) {
                if (registerLogObserver) {
                    logRepository.removeObserver(StandardProcessorNode.BULLETIN_OBSERVER_ID);
                }
                throw new ComponentLifeCycleException("Failed to invoke @OnAdded methods of " + procNode.getProcessor(), e);
            }

            if (firstTimeAdded) {
                try (final NarCloseable nc = NarCloseable.withComponentNarLoader(procNode.getProcessor().getClass(), procNode.getProcessor().getIdentifier())) {
                    ReflectionUtils.quietlyInvokeMethodsWithAnnotation(OnConfigurationRestored.class, procNode.getProcessor());
                }
            }
        }

        return procNode;
    }
```



