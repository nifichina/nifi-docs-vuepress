(window.webpackJsonp=window.webpackJsonp||[]).push([[6],{503:function(t,v,s){t.exports=s.p+"assets/img/1.c061d20b.png"},504:function(t,v,s){t.exports=s.p+"assets/img/2.82655a5f.png"},505:function(t,v,s){t.exports=s.p+"assets/img/3.d8614f16.png"},506:function(t,v,s){t.exports=s.p+"assets/img/4.29d8016e.png"},507:function(t,v,s){t.exports=s.p+"assets/img/5.5efa3d6b.png"},508:function(t,v,s){t.exports=s.p+"assets/img/6.78d982ec.png"},509:function(t,v,s){t.exports=s.p+"assets/img/7.af4217f0.png"},510:function(t,v,s){t.exports=s.p+"assets/img/8.5372ad89.png"},511:function(t,v,s){t.exports=s.p+"assets/img/9.5fe04c19.png"},512:function(t,v,s){t.exports=s.p+"assets/img/10.d80dcf64.png"},513:function(t,v,s){t.exports=s.p+"assets/img/11.cfec8582.png"},514:function(t,v,s){t.exports=s.p+"assets/img/12.fcf7ed5a.png"},515:function(t,v,s){t.exports=s.p+"assets/img/13.1b7ff1d9.png"},516:function(t,v,s){t.exports=s.p+"assets/img/14.0c1530ac.png"},517:function(t,v,s){t.exports=s.p+"assets/img/15.a939dacd.png"},518:function(t,v,s){t.exports=s.p+"assets/img/16.4375e3c2.png"},519:function(t,v,s){t.exports=s.p+"assets/img/17.ad9f570e.png"},613:function(t,v,s){"use strict";s.r(v);var _=[function(){var t=this,v=t.$createElement,_=t._self._c||v;return _("div",{staticClass:"content"},[_("h1",{attrs:{id:"executesql"}},[_("a",{staticClass:"header-anchor",attrs:{href:"#executesql","aria-hidden":"true"}},[t._v("#")]),t._v(" ExecuteSQL")]),t._v(" "),_("hr"),t._v(" "),_("p",[t._v("编辑人："),_("strong",[_("strong",[t._v("酷酷的诚")])]),t._v("  邮箱："),_("strong",[t._v("zhangchengk@foxmail.com")])]),t._v(" "),_("hr"),t._v(" "),_("p",[t._v("内容：")]),t._v(" "),_("p",[_("strong",[t._v("描述：")])]),t._v(" "),_("p",[t._v("该处理器执行SQL语句，返回avro格式数据。处理器使用流式处理，因此支持任意大的结果集。处理器可以使用标准调度方法将此处理器调度为在计时器或cron表达式上运行，也可以由传入的流文件触发。SQL语句来源可以来自该处理器属性SQL select query，也可以来自上一个处理器的输出流（UTF-8格式）（GenerateTableFetch，ConvertJsonToSql等等生成的流内容中的SQL语句，类似于insert into。。。value  （？。。。），这个？的值是存在于流属性中的：sql.args.N.value  sql.args.N.type ，ExecuteSQL会自动装配并执行）")]),t._v(" "),_("p",[_("strong",[t._v("属性:")])]),t._v(" "),_("table",[_("thead",[_("tr",[_("th",[t._v("属性名称")]),t._v(" "),_("th",[t._v("默认值")]),t._v(" "),_("th",[t._v("可选值")]),t._v(" "),_("th",[t._v("描述")])])]),t._v(" "),_("tbody",[_("tr",[_("td",[_("strong",[t._v("Database Connection Pooling Service")])]),t._v(" "),_("td"),t._v(" "),_("td",[_("strong",[t._v("Controller Service API:")]),t._v(" "),_("br"),t._v("  DBCPService "),_("br"),t._v(" "),_("strong",[t._v("Implementations:")]),t._v(" "),_("br"),t._v("DBCPConnectionPoolLookup "),_("br"),t._v("HiveConnectionPool"),_("br"),t._v(" DBCPConnectionPool")]),t._v(" "),_("td",[t._v("数据库连接池")])]),t._v(" "),_("tr",[_("td",[t._v("SQL select query")]),t._v(" "),_("td"),t._v(" "),_("td"),t._v(" "),_("td",[t._v("要执行的SQL，设置了此属性，则使用此SQL（不用流中的SQL）；不设置，则使用流中的SQL；"),_("br"),t._v(" "),_("strong",[t._v("支持表达式语言")])])]),t._v(" "),_("tr",[_("td",[_("strong",[t._v("Max Wait Time")])]),t._v(" "),_("td",[t._v("0 seconds")]),t._v(" "),_("td"),t._v(" "),_("td",[t._v("执行SQL的最大等待时间，小于1秒则系统默认此配置等于0秒，0秒即没有限制的意思，无限等待")])]),t._v(" "),_("tr",[_("td",[_("strong",[t._v("Normalize Table/Column Names")])]),t._v(" "),_("td",[t._v("false")]),t._v(" "),_("td",[_("li",[t._v(" true")]),_("li",[t._v(" false")])]),t._v(" "),_("td",[t._v("是否将表名，列名中可能存在的avro格式不兼容的字符进行转换（例如逗号冒号转换为下划线，当然一般表名列名也不存在这些字符，应用较少，默认false）")])]),t._v(" "),_("tr",[_("td",[_("strong",[t._v("Use Avro Logical Types")])]),t._v(" "),_("td",[t._v("false")]),t._v(" "),_("td",[_("li",[t._v("true")]),_("li",[t._v(" false")])]),t._v(" "),_("td",[t._v("是否对DECIMAL/NUMBER, DATE, TIME 和TIMESTAMP类型使用Avro Logical Types。如果选择false，这些列则转成字符串形式。如果选择true,Avro Logical Types则作为其基本类型,具体来说,DECIMAL/NUMBER转换成logical 'decimal':写成带有精度的字节,DATE转换为逻辑logical“date-millis”:值写成天数（从纪元(1970-01-01)算起的整数）,TIME转换为logical“time-millis”:值写成毫秒数（从纪元(1970-01-01)算起的整数）,TIMESTAMP转换为logical“timestamp-millis”:值写成毫秒数（从纪元(1970-01-01)算起的整数）。如果Avro记录的reader也知道这些Logical Types，那么就可以根据reader的实现类结合上下文反序列化这些值。")])]),t._v(" "),_("tr",[_("td",[_("strong",[t._v("Compression Format")])]),t._v(" "),_("td",[t._v("NONE")]),t._v(" "),_("td",[_("li",[t._v(" BZIP2")]),_("li",[t._v(" DEFLATE")]),_("li",[t._v(" NONE")]),_("li",[t._v(" SNAPPY")]),_("li",[t._v(" LZO")])]),t._v(" "),_("td",[t._v("压缩类型，默认值NONE")])]),t._v(" "),_("tr",[_("td",[_("strong",[t._v("Default Decimal Precision")])]),t._v(" "),_("td",[t._v("10")]),t._v(" "),_("td"),t._v(" "),_("td",[t._v("精度；当一个DECIMAL/NUMBER类型的值被写成“DECIMAL”Avro Logical 类型时，需要一个特定的“precision”来表示可用具体数字的数量。通常，精度由列数据类型定义或数据库引擎默认定义。当然，某些数据库引擎也可以返回未定义的精度(0)。"),_("br"),t._v(" "),_("strong",[t._v("支持表达式语言")])])]),t._v(" "),_("tr",[_("td",[_("strong",[t._v("Default Decimal Scale")])]),t._v(" "),_("td",[t._v("0")]),t._v(" "),_("td"),t._v(" "),_("td",[t._v("当一个DECIMAL/NUMBER类型被写成“DECIMAL”Avro Logical 类型时，需要一个特定的“scale”来表示可用的小数位数。通常，scale是由列数据类型定义或数据库引擎默认定义的。但是，当返回未定义的精度(0)时，一些数据库引擎的伸缩性也可能不确定。“默认十进制”用于编写那些未定义的数字。如果一个值的小数比指定的比例多，那么该值将被四舍五入，例如，1.53在比例为0时变成2，在比例为1时变成1.5。"),_("br"),t._v(" "),_("strong",[t._v("支持表达式语言")])])]),t._v(" "),_("tr",[_("td",[_("strong",[t._v("Max Rows Per Flow File")])]),t._v(" "),_("td",[t._v("0")]),t._v(" "),_("td"),t._v(" "),_("td",[t._v("单个流文件中包含的最大结果行数。这意味着允许将非常大的结果集分解为多个流文件。如果指定的值为零，则在单个流文件中返回所有行。 "),_("br"),t._v(" "),_("strong",[t._v("支持表达式语言")])])]),t._v(" "),_("tr",[_("td",[_("strong",[t._v("Output Batch Size")])]),t._v(" "),_("td",[t._v("0")]),t._v(" "),_("td"),t._v(" "),_("td",[t._v("提交进程会话之前要排队的输出流文件的数量。当设置为零时，会话将在处理完所有结果集行并准备好将输出流文件传输到下游关系时提交。对于大型结果集，这可能导致在处理器执行结束时传输大量流文件。如果设置了此属性，那么当指定数量的流文件准备好传输时，将提交会话，从而将流文件释放到下游关系。注意:片段。在设置此属性时，不会在FlowFiles上设置count属性。"),_("br"),t._v(" "),_("strong",[t._v("支持表达式语言")])])])])]),t._v(" "),_("p",[t._v("举例说明：")]),t._v(" "),_("p",[t._v("1：Avro Logical Types ，没有接触过的人可能会一头雾水。简单来说，数据库有自己的数据类型，avro格式数据也有自己的数据类型，两方的数据类型有些是能直接映射的，有些是需要转换的，文档中所说的DECIMAL/NUMBER, DATE, TIME 和TIMESTAMP这些来源数据的类型在avro中就无法直接映射类型；这里提供了两种解决方法，第一种是上述类型统一转成字符串类型，具体值不变；另一种是转换成avro Logical Types，但数据值会变动转换。按我使用一般这个属性设置为false，十进制/数字、日期、时间和时间戳列就写成字符串。最大的好处就是值不变（如下）"),_("img",{attrs:{src:s(503),alt:""}})]),t._v(" "),_("p",[t._v("然后可以使用ConvertJsonToSql（从目标表获取元数据信息）或者写临时表，外部表等等,最后也会有很多方法成功写入到目标库。"),_("img",{attrs:{src:s(504),alt:""}})]),t._v(" "),_("p",[t._v("2：SQL select query")]),t._v(" "),_("p",[t._v("首先设计如图一个流程：")]),t._v(" "),_("p",[_("img",{attrs:{src:s(505),alt:""}})]),t._v(" "),_("p",[t._v("流中是一个SQL语句  limit 1")]),t._v(" "),_("p",[_("img",{attrs:{src:s(506),alt:""}})]),t._v(" "),_("p",[t._v("SQL select query 属性设成 limit 2")]),t._v(" "),_("p",[_("img",{attrs:{src:s(507),alt:""}})]),t._v(" "),_("p",[t._v("结果发现，当SQL select query配置后，将忽略流中传过来的SQL")]),t._v(" "),_("p",[_("img",{attrs:{src:s(508),alt:""}})]),t._v(" "),_("p",[t._v("3：")]),t._v(" "),_("p",[t._v("Max Rows Per Flow File   Output Batch Size")]),t._v(" "),_("p",[t._v("这两个看起来都是控制输出大小的，文档看的有点迷糊；")]),t._v(" "),_("p",[t._v("咱们一个一个来看：")]),t._v(" "),_("p",[t._v("3.1 首先查一百条数据，Max Rows Per Flow File 设为10")]),t._v(" "),_("p",[_("img",{attrs:{src:s(509),alt:""}})]),t._v(" "),_("p",[t._v("结果是输出10个流文件，每个流文件10条数据")]),t._v(" "),_("p",[_("img",{attrs:{src:s(510),alt:""}})]),t._v(" "),_("p",[_("img",{attrs:{src:s(511),alt:""}})]),t._v(" "),_("p",[t._v("3.2")]),t._v(" "),_("p",[_("img",{attrs:{src:s(512),alt:""}})]),t._v(" "),_("p",[_("img",{attrs:{src:s(513),alt:""}})]),t._v(" "),_("p",[_("img",{attrs:{src:s(514),alt:""}})]),t._v(" "),_("p",[t._v("结果感觉跟没设置一样，及时设成成 limit 一百万 一个亿，也是输出一个流文件；当然了，这会儿一般大家都会骂娘“这NIFI太坑了！都没用！垃圾。。。”")]),t._v(" "),_("p",[t._v("别急，看下代码就明白什么意思了（如下图）看注释已经此处的代码逻辑，当流文件数达到了outputBatchSize的时候，这批流文件会被输出到sucess")]),t._v(" "),_("p",[_("img",{attrs:{src:s(515),alt:""}})]),t._v(" "),_("p",[t._v("比如配置如下，会发现流文件输出不再是一个一个的输出，而是2个为单位的输出：")]),t._v(" "),_("p",[_("img",{attrs:{src:s(516),alt:""}})]),t._v(" "),_("p",[t._v("不信你可以试试，output Batch size设成偶数，流增长都是偶数")]),t._v(" "),_("p",[_("img",{attrs:{src:s(517),alt:""}})]),t._v(" "),_("p",[t._v("同理，设为奇数，就会发现是按奇数增长的")]),t._v(" "),_("p",[_("img",{attrs:{src:s(518),alt:""}})]),t._v(" "),_("p",[_("img",{attrs:{src:s(519),alt:""}})])])}],e=s(0),r=Object(e.a)({},function(){this.$createElement;this._self._c;return this._m(0)},_,!1,null,null,null);v.default=r.exports}}]);