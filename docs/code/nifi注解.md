# nifi 注解
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com**
***

阅读这篇文章之前如果对Java注解没有什么深入了解，建议看一哈[Java注解](../java-source-code/java注解.md)

开始之前，看一下源码结构，nifi的注解都是在nifi-api moudle中的。
![](./img/annotation/1.png)
从截图中可以看出，nifi自定义的注解主要有5类

* behavior 行为类，指明一个组件应该有什么样的行为
* configuration 配置类，对组件做一些默认的配置，比如说调度时间，惩罚时间等等
* documentation 文档类 注解的内容会形成文档
* lifecycle 生命周期类 用在方法上 指明什么时候该执行这些method
* notification 通知类 里面注解较少，用于集群变化时指明需要执行一些方法

以下每个分类中都举几个带源码的注解例子，然后其余注解我觉得没必要详细说的只是简单说明其作用。

## notification

### OnPrimaryNodeStateChange
只有一个注解 OnPrimaryNodeStateChange
```java
@Documented \\ 注解表明这个注解应该被 javadoc工具记录
@Target({ElementType.METHOD}) \\用于方法
@Retention(RetentionPolicy.RUNTIME) \\生命周期 运行时
@Inherited \\是集成的(子类继承父类时，注解也被继承)
public @interface OnPrimaryNodeStateChange {

}
```
标记注释，组件可以使用该注释指示在集群中的主节点状态发生更改时应调用某个方法。

#### 应用

比如GetHbase应该只运行在主节点中，其中就有一个方法,当主节点发生变化时正在重新选举时，justElectedPrimaryNode就是false，进而告诉执行查询数据的方法先不要执行查询逻辑，等集群主节点确定后再继续执行。
```java
@OnPrimaryNodeStateChange
    public void onPrimaryNodeChange(final PrimaryNodeState newState) {
        justElectedPrimaryNode = (newState == PrimaryNodeState.ELECTED_PRIMARY_NODE);
    }
```

#### 捕获处理

在FlowController.java中进行处理，其中有一个方法
```java
//设置集群主节点
public void setPrimary(final boolean primary) {
        final PrimaryNodeState nodeState = primary ? PrimaryNodeState.ELECTED_PRIMARY_NODE : PrimaryNodeState.PRIMARY_NODE_REVOKED;
        final ProcessGroup rootGroup = getGroup(getRootGroupId());
        //循环所有的Processor，执行被注解onPrimaryNodeChange标注的方法
        for (final ProcessorNode procNode : rootGroup.findAllProcessors()) {
            try (final NarCloseable narCloseable = NarCloseable.withComponentNarLoader(procNode.getProcessor().getClass(), procNode.getIdentifier())) {
                ReflectionUtils.quietlyInvokeMethodsWithAnnotation(OnPrimaryNodeStateChange.class, procNode.getProcessor(), nodeState);
            }
        }
        for (final ControllerServiceNode serviceNode : getAllControllerServices()) {
            try (final NarCloseable narCloseable = NarCloseable.withComponentNarLoader(serviceNode.getControllerServiceImplementation().getClass(), serviceNode.getIdentifier())) {
                ReflectionUtils.quietlyInvokeMethodsWithAnnotation(OnPrimaryNodeStateChange.class, serviceNode.getControllerServiceImplementation(), nodeState);
            }
        }
        for (final ReportingTaskNode reportingTaskNode : getAllReportingTasks()) {
            try (final NarCloseable narCloseable = NarCloseable.withComponentNarLoader(reportingTaskNode.getReportingTask().getClass(), reportingTaskNode.getIdentifier())) {
                ReflectionUtils.quietlyInvokeMethodsWithAnnotation(OnPrimaryNodeStateChange.class, reportingTaskNode.getReportingTask(), nodeState);
            }
        }

        // update primary
        eventDrivenWorkerQueue.setPrimary(primary);

        // update the heartbeat bean
        final HeartbeatBean oldBean = this.heartbeatBeanRef.getAndSet(new HeartbeatBean(rootGroup, primary));

        // Emit a bulletin detailing the fact that the primary node state has changed
        if (oldBean == null || oldBean.isPrimary() != primary) {
            final String message = primary ? "This node has been elected Primary Node" : "This node is no longer Primary Node";
            final Bulletin bulletin = BulletinFactory.createBulletin("Primary Node", Severity.INFO.name(), message);
            bulletinRepository.addBulletin(bulletin);
            LOG.info(message);
        }
    }
```

## documentation

### CapabilityDescription
在组件类上使用，说明这个组件的能力作用
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface CapabilityDescription {

    String value();
}
```

#### 应用
这个注解在nifi中很常见，比如上面提到的GetHbase
```java
@TriggerWhenEmpty//behavior中 即使工作队列为空也会触发调度，流程的起始组件
@TriggerSerially//behavior onTrigger()方法并发下不安全  GetHbase 拉取数据是单线程运行
@InputRequirement(InputRequirement.Requirement.INPUT_FORBIDDEN)//behavior 是否需要传入连接，这里是不需要
@Tags({"hbase", "get", "ingest","input"})
@CapabilityDescription("This Processor polls HBase for any records in the specified table. The processor keeps track of the timestamp of the cells that "
        + "it receives, so that as new records are pushed to HBase, they will automatically be pulled. Each record is output in JSON format, as "
        + "{\"row\": \"<row key>\", \"cells\": { \"<column 1 family>:<column 1 qualifier>\": \"<cell 1 value>\", \"<column 2 family>:<column 2 qualifier>\": \"<cell 2 value>\", ... }}. "
        + "For each record received, a Provenance RECEIVE event is emitted with the format hbase://<table name>/<row key>, where <row key> is the UTF-8 encoded value of the row's key.")
@WritesAttributes({//behavior 输出流中会额外写入的属性
    @WritesAttribute(attribute = "hbase.table", description = "The name of the HBase table that the data was pulled from"),
    @WritesAttribute(attribute = "mime.type", description = "Set to application/json to indicate that output is JSON")
})
//behavior 组件使用了StateManager，该注解解释此组件在State什么范围中存储了什么信息
@Stateful(scopes = Scope.CLUSTER, description = "After performing a fetching from HBase, stores a timestamp of the last-modified cell that was found. In addition, it stores the ID of the row(s) "
    + "and the value of each cell that has that timestamp as its modification date. This is stored across the cluster and allows the next fetch to avoid duplicating data, even if this Processor is "
    + "run on Primary Node only and the Primary Node changes.")
public class GetHBase extends AbstractProcessor implements VisibilityFetchSupport
```
#### 捕获处理
主要有三个捕获处理的地方

第一个是生成我们常见的文档里组件能力描述 

HtmlDocumentationWriter.java 为一个可配置的组件生成HTML文档。该类用于为ControllerService和ReportingTask生成文档，因为它们没有其他信息。
HtmlProcessorDocumentationWriter.java 为Processor生成文档
```java
public class HtmlDocumentationWriter implements DocumentationWriter {
     /**
     * Gets a description of the ConfigurableComponent using the
     * CapabilityDescription annotation.
     *
     * @param configurableComponent the component to describe
     * @return a description of the configurableComponent
     */
    protected String getDescription(final ConfigurableComponent configurableComponent) {
        final CapabilityDescription capabilityDescription = configurableComponent.getClass().getAnnotation(
                CapabilityDescription.class);

        final String description;
        if (capabilityDescription != null) {
            description = capabilityDescription.value();
        } else {
            description = "No description provided.";
        }

        return description;
    }
}
```
额外说一点，这个HTML文档是什么时候生成的呢?在启动jetty时，看JettyServer.java
```java
@Override
    public void start() {
        try {
            ExtensionManager.discoverExtensions(systemBundle, bundles);
            ExtensionManager.logClassLoaderMapping();
            //生成文档 extensionMapping里面有一系列组件class
            DocGenerator.generate(props, extensionMapping);
            ...
```
而在DocGenerator.java中
```java
/**
     * Generates documentation into the work/docs dir specified by
     * NiFiProperties.
     *
     * @param properties to lookup nifi properties
     * @param extensionMapping extension mapping
     */
    public static void generate(final NiFiProperties properties, final ExtensionMapping extensionMapping) {
        final File explodedNiFiDocsDir = properties.getComponentDocumentationWorkingDirectory();

        logger.debug("Generating documentation for: " + extensionMapping.size() + " components in: " + explodedNiFiDocsDir);
        //为每个组件生成文档
        documentConfigurableComponent(ExtensionManager.getExtensions(Processor.class), explodedNiFiDocsDir);
        documentConfigurableComponent(ExtensionManager.getExtensions(ControllerService.class), explodedNiFiDocsDir);
        documentConfigurableComponent(ExtensionManager.getExtensions(ReportingTask.class), explodedNiFiDocsDir);
    }
```
### DeprecationNotice

警告组件的弃用
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited

public @interface DeprecationNotice {
    Class<? extends ConfigurableComponent>[] alternatives() default {};

    String[] classNames() default {};

    String reason() default "";
}
```

### SeeAlso

表示此组件与列出的组件相关。
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface SeeAlso {

    Class<? extends ConfigurableComponent>[] value() default {};

    String[] classNames() default {};
}
```

### Tags

将标签(关键字)与组件关联。这些标记不影响任何方式的组件，但作为额外的文档，并可用于排序/过滤器处理器。

```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface Tags {

    String[] value();
}
```

## configuration

### DefaultSchedule

处理器可以使用它来配置调度策略、周期和并发任务数量的默认设置。ReportingTask可以使用该接口配置默认设置、计划策略和周期。注意，如果使用@TriggerSerialy注释，那么并发任务的数量将被忽略
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface DefaultSchedule {

    SchedulingStrategy strategy() default  SchedulingStrategy.TIMER_DRIVEN;
    String period() default "0 sec";
    int concurrentTasks() default 1;

}
```
### DefaultSettings

处理器可以用来配置产量持续时间、惩罚持续时间和公告日志级别。
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface DefaultSettings {
    String yieldDuration() default "1 sec";
    String penaltyDuration() default "30 sec";
    LogLevel bulletinLevel() default LogLevel.WARN;
}
```

## behavior

### DynamicProperties

指明组件有多个动态属性
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface DynamicProperties {

    DynamicProperty[] value();
}
```
### DynamicProperty
一个可以放在{@link ConfigurableComponent}上的注释，表明它支持动态属性。
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface DynamicProperty {

    String name();

    @Deprecated
    boolean supportsExpressionLanguage() default false;

    String value();

    String description();

    ExpressionLanguageScope expressionLanguageScope() default ExpressionLanguageScope.NONE;

}
```
### DynamicRelationship
支持动态Relationship
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface DynamicRelationship {

    String name();

    String description();
}
```
### EventDriven
可以放置在处理器上的注释，它向框架表明处理器可以根据“事件”的发生(例如，当一个流文件在一个传入连接中加入队列时)被调度来运行，而不是周期性地被触发。

此注释不应与{@link trigger串行}或{@link TriggerWhenEmpty}一起使用。如果此注释与这些其他注释中的任何一个一起使用，则处理器将不能以事件驱动模式调度。
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface EventDriven {

}
```
### InputRequirement
指明一个组价是否需要输入
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface InputRequirement {
    Requirement value();

    enum Requirement {
        //必须输入
        INPUT_REQUIRED,

        //允许输入
        INPUT_ALLOWED,

        //不许输入
        INPUT_FORBIDDEN;
    }
}
```
### PrimaryNodeOnly
只在集群主节点允许
```java
@Documented
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface PrimaryNodeOnly {
}
```
### ReadsAttribute
指明组件读取输入流的特点流属性
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface ReadsAttribute {

    public String attribute();

    public String description() default "";
}
```
### ReadsAttributes
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface ReadsAttributes {

    ReadsAttribute[] value();
}
```
### RequiresInstanceClassLoading
组件可以使用此注解来指示框架应该为组件的每个实例创建一个新的类加载器，将组件的NARClassLoader中的所有资源复制到一个新的类加载器中，这个类加载器只会被组件的给定实例使用。

如果将cloneAncestorResources设置为true，则实例类装入器将包含祖先资源，直到第一个包含由组件引用的控制器服务API的类装入器，或者直到Jetty NAR。 

示例#1 - PutHDFS将此标志设置为true，并且不引用任何控制器服务，因此它将包含来自nifi-hadoop-nar、nifi-hadoop-library-nar和nifi-standard-services-api-nar的资源，并停留在nifi-jetty-nar。

示例#2 - 如果PutHDFS引用了一个SSLContext并将该标志设置为true，那么它将包含来自nifi-hadoop-nar、nifi-hadoop-library-nar的资源，并在nifi-standard-services-api-nar之前停止。

示例#3 - HBaseClientService_1_1_2没有设置这个标志，因此它默认为false，因此只包含来自nifi-hbase-client-service-1_1_2-nar的资源。

注意:在使用该注释时，需要注意的是，组件的每个添加实例都会比不使用该注释的组件增加更多的内存占用。

```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface RequiresInstanceClassLoading {

    boolean cloneAncestorResources() default false;

}
```
### Restriction
组件的特定限制。指示所需的权限是什么以及为什么存在限制。
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface Restriction {

    /**
     * Provides a listing of RequiredPermissions.
     */
    RequiredPermission requiredPermission();

    /**
     * Provides a explanation of why the component usage is restricted
     */
    String explanation();

}
```

### Restricted

将组件的使用标记为仅限具有提升权限的用户使用。
{@code Restricted}组件可以用来执行操作员通过NiFi REST API/UI提供的任意未消毒的代码，也可以用来使用NiFi OS凭证获取或修改NiFi主机系统上的数据。这些组件可以由其他授权的NiFi用户使用，以超出应用程序的预期用途、升级特权，或者可以公开关于NiFi进程或主机系统内部的数据。所有这些功能都应该被认为是特权的，管理员应该知道这些功能，并为受信任用户的子集显式地启用它们。

```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface Restricted {
    /**
     * Provides a description of why the component usage is restricted. If using granular
     * restrictions, specific explanations should be set in the Restriction.
     */
    String value() default "";

    /**
     * Provides a listing of specific Restrictions. If unspecified, this component will
     * require access to restricted components regardless of restrictions.
     */
    Restriction[] restrictions() default {};

}

比如(顺便看看有没有忘记上文提到的这些注解是什么意思)
```java
@Tags({"script", "invoke", "groovy", "python", "jython", "jruby", "ruby", "javascript", "js", "lua", "luaj","transform"})
@CapabilityDescription("Experimental - Invokes a script engine for a Processor defined in the given script. The script must define "
        + "a valid class that implements the Processor interface, and it must set a variable 'processor' to an instance of "
        + "the class. Processor methods such as onTrigger() will be delegated to the scripted Processor instance. Also any "
        + "Relationships or PropertyDescriptors defined by the scripted processor will be added to the configuration dialog.  "
        + "Experimental: Impact of sustained usage not yet verified.")
@DynamicProperty(name = "A script engine property to update", value = "The value to set it to",
        expressionLanguageScope = ExpressionLanguageScope.FLOWFILE_ATTRIBUTES,
        description = "Updates a script engine property specified by the Dynamic Property's key with the value specified by the Dynamic Property's value")
@Stateful(scopes = {Scope.LOCAL, Scope.CLUSTER},
        description = "Scripts can store and retrieve state using the State Management APIs. Consult the State Manager section of the Developer's Guide for more details.")
@SeeAlso({ExecuteScript.class})
@Restricted(
        restrictions = {
                @Restriction(
                        requiredPermission = RequiredPermission.EXECUTE_CODE,
                        explanation = "Provides operator the ability to execute arbitrary code assuming all permissions that Intellin has.")
        }
)
public class InvokeScriptedProcessor extends AbstractSessionFactoryProcessor {
```
这类组件在UI上会有一个特殊的标记
![](./img/annotation/2.png)

### SupportsBatching

处理器实现可以使用此注解来指示用户应该能够为处理器提供批处理持续时间。如果一个处理器使用了这个注释，那么它就允许框架对ProcessSession进行批处理的提交，以及允许框架从后续对ProcessSessionFactory.createSession() 的调用中多次返回相同的ProcessSession 

使用此注释时，需要注意的是，对ProcessSession.commit()的调用可能无法保证数据已安全存储在NiFi的内容存储库或流文件存储库中。

因此，如果处理器是在从远程数据源删除数据之前调用ProcessSession.commit()来确保数据是持久性的，那么不适合使用这个注释。
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface SupportsBatching {

}
```
这里额外提一点，比如SplitText有这个注解，那么可以配置批处理持续时间来提高吞吐量
![](./img/annotation/3.png)


### SideEffectFree

标记注释Processor,实现可以用来指示它对flowfile的操作可以安全地跨进程会话重复。

如果处理器有这个注释，并且它允许框架管理会话提交和回滚，那么框架可以选择将处理器的onTrigger方法的ProcessSession赋给另一个处理器的onTrigger方法。

它可以知道如果失败以及一系列的处理器使用相同的会话都可以安全地回滚,没有任何不良影响的外部服务不能回滚,因此所有的流程可以安全地重复(隐含幂等行为)。
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface SideEffectFree {
}
```
这个注释使用的太多了，比如(顺便复习一下这里遇到过得注解)
```java
@EventDriven
@SideEffectFree
@SupportsBatching
@Tags({"json", "jolt", "transform", "shiftr", "chainr", "defaultr", "removr","cardinality","sort"})
@InputRequirement(InputRequirement.Requirement.INPUT_REQUIRED)
@WritesAttribute(attribute = "mime.type",description = "Always set to application/json")
@CapabilityDescription("Applies a list of Jolt specifications to the flowfile JSON payload. A new FlowFile is created "
        + "with transformed content and is routed to the 'success' relationship. If the JSON transform "
        + "fails, the original FlowFile is routed to the 'failure' relationship.")
public class JoltTransformJSON extends AbstractProcessor {
```
### Stateful
可以用来指示组件使用了StateManager的注释。该注释向用户提供了存储哪些信息的描述，以便用户能够理解显示给他们的内容，并知道如果他们选择清除状态，他们将清除哪些内容。此外，如果没有此注释，UI将不会向用户显示任何state信息。
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface Stateful {
    /**
     * Provides a description of what information is being stored in the {@link StateManager}
     */
    String description();

    /**
     * Indicates the Scope(s) associated with the State that is stored and retrieved.
     */
    Scope[] scopes();
}

```
### SystemResourceConsideration
描述组件系统资源占用，比如一个组件可能占用大内存，就可以使用这个注解
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
@Repeatable(SystemResourceConsiderations.class)
public @interface SystemResourceConsideration {

    String DEFAULT_DESCRIPTION = "An instance of this component can cause high usage of this system resource.  " +
            "Multiple instances or high concurrency settings may result a degradation of performance.";

    /**
     * The {@link SystemResource SystemResource} which may be affected by this component.
     */
    SystemResource resource();

    /**
     * A description of how this component and its configuration may affect system resource usage.
     */
    String description() default DEFAULT_DESCRIPTION;
}

```
### SystemResourceConsiderations

```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface SystemResourceConsiderations {
    SystemResourceConsideration[] value();
}
```
### TriggerSerially

指明该组件onTrigger()方法并发不安全

```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface TriggerSerially {
}
```
### TriggerWhenAnyDestinationAvailable
用于调整背压机制，指示如果某个处理器的目标中有传入流文件的可用空间，则该处理器将被触发。默认情况下，只有当所有的目的地都报告它们有可用空间才触发(即，所有对外连接均未满)。
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface TriggerWhenAnyDestinationAvailable {

}
```
实际上也只有DistributeLoad这个组件用了这个注解

### TriggerWhenEmpty
指明组件的工作队列(上游)及时没有数据，也正常调度
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface TriggerWhenEmpty {
}
```
比如那些List、Get组件等等

### WritesAttribute
告诉用户该组件向输出流写了那些属性
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface WritesAttribute {

    String attribute();

    String description() default "";
}
```
### WritesAttributes
```java
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface WritesAttributes {

    WritesAttribute[] value();
}

```
## lifecycle

### OnAdded
指示在将组件添加到画布时应该调用的方法。此方法将在组件实例的整个生命周期中调用一次。调用具有此注释的方法时不带任何参数，因为所有设置和属性都可以假定为默认值。
```java
@Documented
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface OnAdded {
}

```
暂时没什么组件使用到

### OnConfigurationRestored
指示在重新启动NiFi后，只要恢复组件的配置，就应该调用具有此注释的方法。

具有此注释的方法必须接受零参数。

每当向流中添加一个新组件时，都会立即调用此方法，因为没有要恢复的配置(这种情况所有配置都当做已恢复，因为没有要恢复的配置)。
```java
@Documented
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface OnConfigurationRestored {

}
```
比如在AbstractSessionFactoryProcessor.java
```java
@OnConfigurationRestored
    public final void updateConfiguredRestoredTrue() {
        configurationRestored = true;
    }
```

### OnDisabled
禁用组件时调用此注解标注的方法
```java
@Documented
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface OnDisabled {

}

```

### OnEnabled
解除禁用组件时调用此注解标注的方法
```java
@Documented
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface OnEnabled {

}
```

### OnRemoved
组件在画布中被删除时应该调用此注解标注的方法
```java
@Documented
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface OnRemoved {
}
```

### OnScheduled
指示在计划运行组件时应调用的方法。它将在任何对“onTrigger”的调用之前被调用，并且将在计划运行组件时被调用一次。

发生这种情况的方式有两种:一种是用户单击以调度组件运行，另一种是将“自动恢复状态”配置设置为true(默认值)重新启动NiFi，并且组件已经在运行。

使用此注释的方法必须接受0个参数或单个参数

```java
@Documented
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface OnScheduled {
}
```
比如GetHbase.java
```java
//做一些正常调度前的准备工作 ，触发机制  手动start时或者NIFI重启且该组件在运行态
 @OnScheduled
    public void parseColumns(final ProcessContext context) throws IOException {
        final StateMap stateMap = context.getStateManager().getState(Scope.CLUSTER);
        if (stateMap.getVersion() < 0) {
            // no state has been stored in the State Manager - check if we have state stored in the
            // DistributedMapCacheClient service and migrate it if so
            final DistributedMapCacheClient client = context.getProperty(DISTRIBUTED_CACHE_SERVICE).asControllerService(DistributedMapCacheClient.class);
            final ScanResult scanResult = getState(client);
            if (scanResult != null) {
                storeState(scanResult, context.getStateManager());
            }

            clearState(client);
        }

        final String columnsValue = context.getProperty(COLUMNS).getValue();
        final String[] columns = (columnsValue == null || columnsValue.isEmpty() ? new String[0] : columnsValue.split(","));

        this.columns.clear();
        for (final String column : columns) {
            if (column.contains(":"))  {
                final String[] parts = column.split(":");
                final byte[] cf = parts[0].getBytes(Charset.forName("UTF-8"));
                final byte[] cq = parts[1].getBytes(Charset.forName("UTF-8"));
                this.columns.add(new Column(cf, cq));
            } else {
                final byte[] cf = column.getBytes(Charset.forName("UTF-8"));
                this.columns.add(new Column(cf, null));
            }
        }
    }
```

### OnShutdown
指示在关闭系统时应调用的方法。在JVM生命周期中，对每个组件最多调用一次。但是，不能保证在关闭时调用此方法，因为服务可能会突然终止。
带有此注释的方法允许接受0或1参数
```java
@Documented
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface OnShutdown {
}
```
比如CaptureChangeMssql.java。多用于系统关闭时去关闭一些资源
``` java
 @OnShutdown
    public void onShutdown(ProcessContext context) {
        try {
            // In case we get shutdown while still running, save off the current state, disconnect, and shut down gracefully
            if (activeConnection != null) {
                JdbcUtils.closeResource(activeConnection);
                wasClosed = true;
            }
        } catch (Exception ioe) {
            throw new ProcessException(ioe);
        }
    }
```

### OnStopped
指示当组件不再计划运行时应调用某个方法。每次组件停止时，都将调用标记了此注释的方法，并且仅在从onTrigger方法返回最后一个线程后才调用

这意味着在这个方法中执行的线程将是处理器任何部分中唯一执行的线程。但是，由于其他线程以后可能会执行代码的其他部分，所以仍然必须适当地保护成员变量。但是，对多个变量的访问不必是原子性的。

要指示在不再调度组件运行时(而不是在所有线程从onTrigger方法返回后)应立即调用方法，请参见OnUnscheduled注释。

带有此注释的方法允许接受0或1参数。
```java
@Documented
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface OnStopped {

}
```
### OnUnscheduled

每次通知框架停止调度组件时，都将调用标记了此注释的方法。此方法在其他线程可能正在运行时调用。要在所有线程完成处理后调用一个方法请参见OnStopped注解.

使用此注释的方法必须接受0个参数或单个参数


```java
@Documented
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface OnUnscheduled {
}
```