# 首页

# 文档版本

翻译的文档对照官方文档1.9.2版本，如有出入，以官方文档为准（可以以此中文文档为参照，但建议多看官方文档原文）

官方文档地址：http://nifi.apache.org/docs.html

# 文档维护

NIFI中文文档暂时由酷酷的诚自己维护，时间有限，能力不足，翻译能力也一般，工作量也比较大，过程中可能还会加入自己的一些理解，所以翻译过来的文档可能有诸多瑕疵，希望有发现问题的同学能及时反馈我。

# 联系方式

邮箱：zhangchengk@foxmail.com

QQ群：无(之前也建过，包括其他的NIFI群，发现有些人真就是伸手党，别人不帮你是应该的，帮了你应该有感激之心，我就不搞什么QQ群了，省的心塞)

# tip

文档下方有无需登录的评论功能，在评论时可以给自己起一个昵称，建议在评论时填写自己的邮箱(他人不可见)，这样在你的评论得到回复时，会以邮件形式通知你。

![](./img/moment.png)

## 更新日志

### 2019-09-30

(由于之前已知没有写更新日志，所有截止9.30所有更新全部写到这里)

#### Processor更新
<li>AttributesToCSV ：流属性转CSV</li>
<li>AttributesToJSON：流属性转JSON</li>
<li>ConvertJSONToAvro：将 JSON数据转成AVRO格式</li>
<li>CryptographicHashAttribute：哈希流属性</li>
<li>DistributeLoad：数据分发</li>
<li>EvaluateJsonPath：提取json内容到流属性</li>
<li>ExecuteGroovyScript：执行Groovy脚本</li>
<li>ExecuteSQL：执行SQL</li>
<li>ExtractText：提取text内容到流属性</li>
<li>FlattenJson：“压平”多层json</li>
<li>GenerateFlowFile：生成流</li>
<li>GenerateTableFetch：生成SQL，增量，全量</li>
<li>HandleHttpRequest_HandleHttpResponse：web api</li>
<li>InvokeHTTP：执行HTTP请求</li>
<li>LogAttribute：日志打印流属性</li>
<li>LogMessage：：日志打印信息</li>
<li>PutHiveStreaming：写hive</li>
<li>ReplaceText：替换text</li>
<li>RouteOnAttribute:根据属性路由流</li>
<li>RouteOnContent：根据流内容路由流</li>
<li>SplitAvro：切分avro数据</li>
<li>SplitJson：切分json数组</li>
<li>UpdateAttribute：更改流属性</li>

#### General更新
<li>概览</li>
<li>入门</li>
<li>用户指南</li>

#### NIFI 源码系列
<li>NIFI-NAR包概述</li>
<li>nifi nar包加载机制源码解读</li>
<li>nifi.sh 脚本解读</li>
<li>nifi-env.sh 脚本解读</li>
<li>nifi.sh start 解读</li>
<li>RunNiFi.java 源码解读</li>
<li>NiFi.java 源码解读</li>
<li>Nar包下的MANIFEST.MF</li>

#### NIFI 扩展开发系列
<li>ControllerService扩展开发的项目结构</li>
<li>JSONJOLT介绍及语法详解-shift篇</li>
<li>通过配置优化NiFi性能</li>
<li>NIFI Linux系统配置的最佳实践</li>

#### Java source code
<li>ProcessBuilder</li>
<li>ClassLoader</li>
<li>Thread</li>
<li>线程上下文类加载器</li>
<li>从jvm源码解读Java运行时的类加载</li>
<li>Java socket详解（转）</li>
<li>Java HashMap 新增方法(merge,compute)（转）</li>

