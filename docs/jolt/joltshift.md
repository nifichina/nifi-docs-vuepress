# JOLT shift 篇
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com**
***
内容：

<h2>一、什么是JOLT</h2>

一个json与json转换的库，一个强大的json转json的工具。在我们涉及Cassandra, ElasticSearch, Mongo的时候，很有可能就有这方面的需求  。另写代码又不灵活，使用JOLT就很好了。基本流程就是输入格式A数据（json），使用jolt描述语言（也是json ），得到想要的格式B数据（json）

<h2>二、JOLT的几个理念</h2>

<h3>1：对于输入的数据 （或者 数据的节点），它要输出到输出数据的哪个位置？如下：</h3>
