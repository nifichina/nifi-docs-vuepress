# NIFI-NAR 包概述
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com** 
***
内容：nifi nar 包概览

以下表格现有版本1.8为基础，同时参照 1.9、1.10版本，概述了nifi nar包作用，部分在国内不适用，合理的删减nar包能明显的减少安装包体积；删减nar包的方式很简便，直接在nifi-assembly 的pom.xml注释掉相关的依赖就可以了

|nar 包|Type|组件及大致用途|建议|
|:-|:-|:-|:-|
|nifi-ambari-nar |ReportingTask|AmbariReportingTask：将NIFI metrics 定时推送AMS，每60秒推一次数据|如不用Ambari，则建议可以去掉|
|nifi-amqp-nar|Processor|PublishAMQP，ConsumeAMQP：生产消费AMQP（消息队列）|如没有涉及AMQP，建议去掉|
|nifi-atlas-nar（1.10还未发版）|ReportingTask|ReportLineageToAtlas:数据血缘发送到Atlas(1.10 还未发版)|如不用Atlas，则建议可以去掉|
|nifi-avro-nar|Processor|ConvertAvroToJSON:avro转json<br>ExtractAvroMetadata:提取元数据信息<br>SplitAvro:切割|保留|
|nifi-aws-nar|Processor，ControllerService|FetchS3Object、PutS3Object、DeleteS3Object、<br>TagS3Object、ListS3：S3PutSNS：<br>给亚马逊发消息提醒<br>GetSQS、PutSQS、DeleteSQS<br>：亚马逊消息队列<br>PutLambda：将json发送到指定的Amazon Lamba函数<br>PutKinesisFirehose：发送内容到指定的亚马逊Kinesis<br>FirehoseGetDynamoDB、PutDynamoDB、DeleteDynamoDB<br>：亚马逊NoSQL<br>PutKinesisStream：发送内容到指定的亚马逊Kinesis<br>PutCloudWatchMetric：发送metrics 到亚马逊CloudWatch<br>InvokeAWSGatewayApi：AWS网关API端点客户<br>AWSCredentialsProviderControllerService：亚马逊身份验证|去掉|
|nifi-aws-service-api-nar|ControllerService|AWSCredentialsProviderService：<br>AWSCredentialsProviderControllerService的接口|去掉|
|nifi-azure-nar|Processor|PutAzureEventHub、GetAzureEventHub、ConsumeAzureEventHub、<br>FetchAzureBlobStorage、ListAzureBlobStorage、PutAzureBlobStorage、<br>DeleteAzureBlobStorage、PutAzureQueueStorage、<br>GetAzureQueueStorage：微软Azure|去掉|
|nifi-beats-nar|Processor|ListenBeats：(ELK的)使用libbeat的'output.logstash'侦听libbeat<br>所兼容的客户端发送的消息(例如filebeats、metricbeats等)|去掉|
|nifi-cassandra-nar|Processor|QueryCassandra、PutCassandraQL、PutCassandraRecord：<br>cassandra  Apache 开源NoSQL|如无使用到，则可以去掉；|
|nifi-cassandra-services-api-nar（1.9版本发版）|ControllerService|CassandraSessionProviderService：CassandraSessionProvider的接口（1.9版本发版）||
|nifi-cassandra-services-nar（1.9版本发版）|ControllerService|CassandraSessionProvider：（1.9版本发版）||
|nifi-ccda-nar|Processor|ExtractCCDAAttributes：统一的CDA格式数据中提取attribute|如无涉及cda，则可以去掉|
|nifi-cdc-mysql-nar|Processor|CaptureChangeMySQL：MySQL binlog|保留|
|nifi-confluent-platform-nar|ControllerService|ConfluentSchemaRegistry：<br>连接Confluent Schema Registry（需外部server，存储schema）|如无需要则去掉|
|nifi-couchbase-nar|Processor,ControllerService|GetCouchbaseKey,PutCouchbaseKey: Couchbase **NOSQL** <br>CouchbaseClusterService,CouchbaseMapCacheClient,<br>CouchbaseKeyValueLookupService,CouchbaseRecordLookupService|保留|
|nifi-couchbase-services-api-nar|ControllerService|CouchbaseClusterControllerService:CouchbaseClusterService的接口|保留|
|nifi-cybersecurity-nar|Processor|FuzzyHashContent:模糊哈希<br>CompareFuzzyHash：匹配模糊哈希相似度|属算法系列，保留|
|nifi-datadog-nar|ReportingTask|DataDogReportingTask：将metrics数据发送到datadog| 数据狗，不用则去掉|
|nifi-dbcp-service-nar|ControllerService|DBCPConnectionPool，DBCPConnectionPoolLookup:关系型数据库|保留|
|nifi-distributed-cache-services-nar|ControllerService|DistributedSetCacheServer,DistributedMapCacheServer,<br>DistributedSetCacheClientService,DistributedMapCacheClientService：<br>分布式缓存|保留|
|nifi-druid-nar|Processor,ControllerService|PutDruidRecord,DruidTranquilityController:Tranquility方式向Apache Druid推数据|Apache Druid，不用可去掉|
|nifi-druid-controller-service-api-nar|ControllerService|DruidTranquilityService：DruidTranquilityController:Tranquility的接口|Apache Druid，可去掉|
|nifi-elasticsearch-nar|Processor|FetchElasticsearch，PutElasticsearch，FetchElasticsearchHttp，<br>PutElasticsearchHttp，PutElasticsearchHttpRecord，QueryElasticsearchHttp，<br>ScrollElasticsearchHttp|保留|
|nifi-elasticsearch-5-nar|Processor|FetchElasticsearch5，PutElasticsearch5，DeleteElasticsearch5|保留|
|nifi-elasticsearch-client-service-api-nar|ControllerService|ElasticSearchClientService：ElasticSearchClientServiceImpl的接口|保留|
|nifi-elasticsearch-client-service-nar|ControllerService| ElasticSearchLookupService，ElasticSearchStringLookupService，<br>ElasticSearchClientServiceImpl|保留|
|nifi-elasticsearch-restapi-nar|Processor|JsonQueryElasticsearch，DeleteByQueryElasticsearch|保留|
|nifi-email-nar|Processor|ExtractTNEFAttachments,ExtractEmailAttachments,<br>ExtractEmailHeaders:对右键结构的FlowFIle 提取内容<br>ListenSMTP,ConsumeIMAP,ConsumePOP3,<br>ConsumeEWS：监听 消费|如未使用，可去掉|
|nifi-enrich-nar|Processor|GeoEnrichIP，GeoEnrichIPRecord，ISPEnrichIP，<br>QueryDNS，QueryWhois：<br>需要MaxMind数据库（http://www.MaxMind.com）|如未使用，可去掉|
|nifi-evtx-nar|Processor|ParseEvtx： Windows Event Log file(Evtx),input evtx格式，output xml|去掉|
|nifi-flume-nar|Processor|ExecuteFlumeSource，ExecuteFlumeSink:Flume source sink|如未使用，可去掉|
|nifi-framework-nar|核心||保留|
|nifi-gcp-nar|Processor,ControllerService|PutGCSObject，FetchGCSObject，DeleteGCSObject，<br>ListGCSBucket：**Google Cloud Bucket**<br>PublishGCPubSub，ConsumeGCPubSub：**Google Cloud PubSub**<br>PutBigQueryBatch： **Google BigQuery table**<br>GCPCredentialsControllerService|去掉|
|nifi-gcp-services-api-nar|ControllerService|GCPCredentialsService：GCPCredentialsControllerService的接口|去掉|
|nifi-graph-nar（1.9发版）|Processor|ExecuteGraphQuery|去掉|
|nifi-http-context-map-nar|ControllerService|StandardHttpContextMap(与HandleHttpRequest, HandleHttpResponse一起使用)|保留|
|nifi-hwx-schema-registry-nar|ControllerService|**Hortonworks**SchemaRegistry|去掉|
|nifi-other-graph-services-nar（1.9发版）|ControllerService|GremlinClientService，OpenCypherClientService：图数据库|如未使用，可去掉|
|nifi-graph-client-service-api-nar（1.9发版）|ControllerService|GraphClientService，TinkerPopClientService|如未使用，可去掉|
|nifi-neo4j-cypher-service-nar（1.9发版）|ControllerService|Neo4JCypherClientService|如未使用，可去掉|
|nifi-groovyx-nar|Processor|ExecuteGroovyScript：执行groovy 脚本|保留|
|nifi-grcp-nar|Processor|InvokeGRPC,ListenGRPC:grpc（远程过程调用(RPC)系统）|去掉|
|nifi-hadoop-nar|Processor|CreateHadoopSequenceFile，FetchHDFS，GetHDFS，<br>GetHDFSSequenceFile，GetHDFSEvents，ListHDFS，<br>PutHDFS，DeleteHDFS，MoveHDFS，<br>GetHDFSFileInfo|保留|
|nifi-hadoop-libraries-nar|jar|依赖的jar包|保留|
|nifi-hbase-nar|Processor|DeleteHBaseCells，DeleteHBaseRow，GetHBase，PutHBaseCell，<br>PutHBaseJSON，PutHBaseRecord，FetchHBaseRow，ScanHBase|保留|
|nifi-hbase_1_1_2-client-service-nar|ControllerService|HBase_1_1_2_ClientService，HBase_1_1_2_ClientMapCacheService，<br>HBase_1_1_2_ListLookupService，HBase_1_1_2_RecordLookupService|保留|
|nifi-hbase_2-client-service-nar（1.9发版）|ControllerService|HBase_2_ClientService，HBase_2_ClientMapCacheService，<br>HBase_2_RecordLookupService|保留|
|nifi-hive-nar|Processor,ControllerService|ConvertAvroToORC，SelectHiveQL，PutHiveQL，<br>PutHiveStreaming，HiveConnectionPool|用到哪个hive版本就保留哪一个|
|nifi-hive-services-api-nar|ControllerService|Hive3DBCPService，Hive_1_1DBCPService，HiveDBCPService|保留|
|nifi-hive-services-api-nar|ControllerService|Hive3DBCPService，Hive_1_1DBCPService，HiveDBCPService|保留|
|nifi-hive_1_1-nar（1.10未发版）|Processor,ControllerService|PutHive_1_1QL，SelectHive_1_1QL；Hive_1_1ConnectionPool|用到哪个hive版本就保留哪一个|
|nifi-hive3-nar|Processor,ControllerService|SelectHive3QL，PutHive3QL，PutHive3Streaming，<br>PutORC，Hive3ConnectionPool|用到哪个hive版本就保留哪一个|
|nifi-hl7-nar|Processor|ExtractHL7Attributes，RouteHL7:HL7 (Health Level 7)格式数据|去掉|
|nifi-html-nar|Processor|GetHTMLElement，ModifyHTMLElement，PutHTMLElement：html格式数据|去掉|
|nifi-ignite-nar|Processor|PutIgniteCache，GetIgniteCache：缓存|如未使用，可去掉|
|nifi-influxdb-nar|Processor|PutInfluxDB，ExecuteInfluxDBQuery|如未使用，可去掉|
|nifi-jetty-bundle|||保留|
|nifi-jms-processors-nar|Processor,ControllerService|PublishJMS，ConsumeJMS: <br>JMS （替代标准组件中的PutJMS，GetJMSTopicGetJMSQueue）<br>JndiJmsConnectionFactoryProvider，JMSConnectionFactoryProvider|如未使用，可去掉|
|nifi-jms-cf-service-nar|ControllerService|JMSConnectionFactoryProviderDefinition|如未使用，可去掉|
|nifi-jolt-record-nar|Processor|JoltTransformRecord：Java Jolt 处理json|保留|
|nifi-kafka-0-8-nar|Processor|GetKafka，PutKafka|保留|
|nifi-kafka-0-9-nar|Processor|PublishKafka，ConsumeKafka|保留|
|nifi-kafka-0-10-nar|Processor|PublishKafka_0_10，PublishKafkaRecord_0_10，<br>ConsumeKafka_0_10，ConsumeKafkaRecord_0_10|保留|
|nifi-kafka-0-11-nar|Processor|PublishKafka_0_11，PublishKafkaRecord_0_11，<br>ConsumeKafka_0_11，ConsumeKafkaRecord_0_11|保留|
|nifi-kafka-1-0-nar|Processor|PublishKafka_1_0，PublishKafkaRecord_1_0，<br>ConsumeKafka_1_0，ConsumeKafkaRecord_1_0|保留|
|nifi-kafka-2-0-nar|Processor|PublishKafka_2_0，PublishKafkaRecord_2_0，<br>ConsumeKafka_2_0，ConsumeKafkaRecord_2_0|保留|
|nifi-kerberos-iaa-providers-nar|provider|KerberosProvider|保留|
|nifi-kerberos-credentials-service-nar|ControllerService|KeytabCredentialsService|保留|
|nifi-kite-nar|Processor|StoreInKiteDataset,ConvertCSVToAvro,<br>ConvertJSONToAvro，ConvertAvroSchema，InferAvroSchema|保留|
|nifi-kudu-nar|Processor|PutKudu|保留|
|nifi-language-translation-nar|Processor|YandexTranslate：Yandex翻译|去掉|
|nifi-ldap-iaa-providers-nar|provider|LdapProvider，LdapUserGroupProvider|保留|
|nifi-lookup-services-nar|ControllerService|IPLookupService，CSVRecordLookupService，DatabaseRecordLookupService，<br>PropertiesFileLookupService，RestLookupService，SimpleKeyValueLookupService，<br>SimpleCsvFileLookupService，SimpleDatabaseLookupService，XMLFileLookupService，<br>DistributedMapCacheLookupService|保留|
|nifi-lumberjack-nar|Processor|ListenLumberjack ：Lumberjack ，组件将来会被移除|去掉|
|nifi-media-nar|Processor|ExtractImageMetadata，ResizeImage，ExtractMediaMetadata|如未使用，可去掉|
|nifi-metrics-reporting-nar|ReportingTask，ControllerService|MetricsReportingTask、GraphiteMetricReporterService|保留|
|nifi-metrics-reporter-service-api-nar|ControllerService|MetricReporterService|保留|
|nifi-mongodb-nar|Processor|DeleteMongo，GetMongo，GetMongoRecord，<br>RunMongoAggregation，PutMongo，PutMongoRecord，<br>DeleteGridFS，FetchGridFS，PutGridFS|保留|
|nifi-mongodb-services-nar|ControllerService||保留|
| nifi-mongodb-client-service-api-nar|ControllerService| MongoDBLookupService，MongoDBControllerService|保留|
|nifi-mqtt-nar|Processor|PublishMQTT，ConsumeMQTT ：mqtt 消息队列|保留|
|nifi-network-processors-nar|Processor|ParseNetflowv5：输入netflowv5 输出json|如未使用，可去掉|
|nifi-parquet-nar|Processor|PutParquet，FetchParquet，ConvertAvroToParquet|保留|
| nifi-poi-nar|Processor|ConvertExcelToCSVProcessor|保留|
|nifi-prometheus-nar(1.10未发版)|ReportingTask|PrometheusReportingTask|保留|
|nifi-provenance-repository-nar|ProvenanceRepository|PersistentProvenanceRepository，WriteAheadProvenanceRepository，<br>EncryptedWriteAheadProvenanceRepository，VolatileProvenanceRepository|保留|
|nifi-proxy-configuration-nar|ControllerService|StandardProxyConfigurationService|保留|
| nifi-ranger-nar|ranger|RangerNiFiAuthorizer,ManagedRangerAuthorizer:<br>Apache Ranger 统一授权管理框架|保留|
|nifi-record-serialization-services-nar|ControllerService|AvroReader，AvroRecordSetWriter，JsonTreeReader，JsonPathReader，<br>JsonRecordSetWriter，CSVReader，CSVRecordSetWriter，<br>GrokReader，FreeFormTextRecordSetWriter，SyslogReader，<br>Syslog5424Reader，XMLReader，XMLRecordSetWriter，<br>VolatileSchemaCache|保留|
|nifi-redis-nar|Provider,ControllerService|RedisStateProvider,RedisConnectionPoolService,<br>RedisDistributedMapCacheClientService|保留|
|nifi-redis-service-api-nar|ControllerService|RedisConnectionPool|保留|
|nifi-registry-nar|ControllerService|AvroSchemaRegistry|保留|
|nifi-rethinkdb-nar|Processor|PutRethinkDB，GetRethinkDB，DeleteRethinkDB：rethinkDb项目已经失败|去掉|
|nifi-riemann-nar|Processor|PutRiemann:监控系统|去掉|
| nifi-scripting-nar|ScriptEngineFactory，ControllerService，Processor，ScriptEngineConfigurator，ReportingTask|ClojureScriptEngineFactory，ScriptedReader，ScriptedRecordSetWriter，<br>ScriptedLookupService，SimpleScriptedLookupService，InvokeScriptedProcessor，<br>ExecuteScript，ClojureScriptEngineConfigurator，JythonScriptEngineConfigurator，<br>GroovyScriptEngineConfigurator，JavascriptScriptEngineConfigurator，<br>ScriptedReportingTask|保留|
|nifi-site-to-site-reporting-nar|ReportingTask|SiteToSiteProvenanceReportingTask，SiteToSiteBulletinReportingTask，<br>SiteToSiteStatusReportingTask，SiteToSiteMetricsReportingTask|保留|
|nifi-slack-nar|Processor|PutSlack，PostSlack：聊天发消息 slack|去掉|
|nifi-snmp-nar|Processor|GetSNMP，SetSNMP：SNMP|保留|
|nifi-social-media-nar|Processor|GetTwitter|去掉|
|nifi-solr-nar|Processor|PutSolrContentStream，PutSolrRecord，GetSolr，QuerySolr：<br>Apache Solr 搜索，基于Lucene的全文搜索服务器|保留|
|nifi-ssl-context-service-nar|ControllerService|StandardSSLContextService，StandardRestrictedSSLContextService|保留|
|nifi-livy-nar|Processor|ExecuteSparkInteractive:spark|保留|
|nifi-livy-controller-service-api-nar|ControllerService|LivySessionController|保留|
|nifi-splunk-nar|Processor|GetSplunk,PutSplunk:托管的日志文件管理工具|保留|
|nifi-spring-nar|Processor|SpringContextProcessor:A Processor that supports <br>sending and receiving data from application <br>defined in Spring Application Context via predefined in/out MessageChannels.|保留|
|nifi-standard-nar|Processor|标准组件|保留|
|nifi-standard-services-api-nar|ControllerService|标准组件|保留|
|nifi-stateful-analysis-nar|Processor|AttributeRollingWindow：计算组件每个流的<br>Expression Language expression的聚合值，存在state里|保留|
|nifi-tcp-nar|Processor|GetTCP:tcp|保留|
|nifi-update-attribute-nar|Processor|UpdateAttribute|保留|
|nifi-websocket-processors-nar|Processor|ListenWebSocket,ConnectWebSocket,PutWebSocket|保留|
|nifi-websocket-services-jetty-nar|ControllerService| JettyWebSocketServer,JettyWebSocketClient|保留|
|nifi-websocket-services-api-nar|ControllerService|WebSocketClientService|保留|
|nifi-windows-event-log-nar|Processor| ConsumeWindowsEventLog：windows|去掉|
