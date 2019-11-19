# 首页

# 文档版本

翻译的文档对照官方文档1.9.2版本，如有出入，以官方文档为准（可以以此中文文档为参照，但建议多看官方文档原文）除了官方文档的说明外，还有一些关于组件的小demo说明，一些与各个组件可能有关系的其他文献资料的整理等等。

官方文档地址：http://nifi.apache.org/docs.html

# 文档维护

NIFI中文文档暂时由酷酷的诚自己维护，时间有限，能力不足，翻译能力也一般，工作量也比较大，过程中可能还会加入自己的一些理解，所以翻译过来的文档可能有诸多瑕疵，希望有发现问题的同学能及时反馈我。

# 联系方式

邮箱：zhangchengk@foxmail.com

# tip

文档下方有无需登录的评论功能，在评论时可以给自己起一个昵称，建议在评论时填写自己的邮箱(他人不可见)，这样在你的评论得到回复时，会以邮件形式通知你。
评论服务器架设在免费的LearnCloud中，免费服务有强制休眠策略，所以偶尔评论功能异常也是正常的。

![](./img/moment.png)

## 更新日志

### 2019-11-19

* 修复[扩展开发Controller Service的项目结构规范](./extend/ControllerServiceArchive.md)跳转[NIFI nar包加载机制源码解读](./code/nifi-nar-classloader.md)404问题(感谢匿名同学的细心发现)
* 修改入门文档的一些语句错误

### 2019-11-16

* 更新CalculateRecordStats组件 统计个数
* 新建评论页面
* Oracle LogMiner官方文档学习及部分翻译
### 2019-10-30

#### Processor更新
* 部分Processor文档增加模板，后期没新加组件文档都会带有示例说明的模板
* Base64EncodeContent:对base64和base64之间的内容进行编码或解码
#### NIFI 源码系列
* NIFI 源码系列 新增 理解内容存储库归档
#### Oracle
* oracle 12C的新特性-CDB和PDB
  
#### mysql
* Java Mysql连接池配置和案例分析--超时异常和处理

#### http
* 聊聊HTTPS和SS、TLS协议
  
### 2019-09-30

(由于之前已知没有写更新日志，所有截止9.30所有更新全部写到这里)

#### Processor更新
* AttributesToCSV ：流属性转CSV
* AttributesToJSON：流属性转JSON
* ConvertJSONToAvro：将 JSON数据转成AVRO格式
* CryptographicHashAttribute：哈希流属性
* DistributeLoad：数据分发
* EvaluateJsonPath：提取json内容到流属性
* ExecuteGroovyScript：执行Groovy脚本
* ExecuteSQL：执行SQL
* ExtractText：提取text内容到流属性
* FlattenJson：“压平”多层json
* GenerateFlowFile：生成流
* GenerateTableFetch：生成SQL，增量，全量
* HandleHttpRequest_HandleHttpResponse：web api
* InvokeHTTP：执行HTTP请求
* LogAttribute：日志打印流属性
* LogMessage：：日志打印信息
* PutHiveStreaming：写hive
* ReplaceText：替换text
* RouteOnAttribute:根据属性路由流
* RouteOnContent：根据流内容路由流
* SplitAvro：切分avro数据
* SplitJson：切分json数组
* UpdateAttribute：更改流属性

#### General更新
* 概览
* 入门
* 用户指南

#### NIFI 源码系列
* NIFI-NAR包概述
* nifi nar包加载机制源码解读
* nifi.sh 脚本解读
* nifi-env.sh 脚本解读
* nifi.sh start 解读
* RunNiFi.java 源码解读
* NiFi.java 源码解读
* Nar包下的MANIFEST.MF

#### NIFI 扩展开发系列
* ControllerService扩展开发的项目结构
* JSONJOLT介绍及语法详解-shift篇
* 通过配置优化NiFi性能
* NIFI Linux系统配置的最佳实践

#### Java source code
* ProcessBuilder
* ClassLoader
* Thread
* 线程上下文类加载器
* 从jvm源码解读Java运行时的类加载
* Java socket详解（转）
* Java HashMap 新增方法(merge,compute)（转）

