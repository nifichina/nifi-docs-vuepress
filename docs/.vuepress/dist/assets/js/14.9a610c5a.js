(window.webpackJsonp=window.webpackJsonp||[]).push([[14],{198:function(t,e,a){t.exports=a.p+"assets/img/core.14ad4dc8.png"},473:function(t,e,a){t.exports=a.p+"assets/img/demo.71d6eecb.png"},474:function(t,e,a){t.exports=a.p+"assets/img/config.95e04dac.png"},475:function(t,e,a){t.exports=a.p+"assets/img/result.4ea67859.png"},476:function(t,e,a){t.exports=a.p+"assets/img/config2.f0f4d5e2.png"},477:function(t,e,a){t.exports=a.p+"assets/img/result2.9d977e76.png"},620:function(t,e,a){"use strict";a.r(e);var i=[function(){var t=this,e=t.$createElement,i=t._self._c||e;return i("div",{staticClass:"content"},[i("h1",{attrs:{id:"attributestocsv"}},[i("a",{staticClass:"header-anchor",attrs:{href:"#attributestocsv","aria-hidden":"true"}},[t._v("#")]),t._v(" AttributesToCSV")]),t._v(" "),i("hr"),t._v(" "),i("p",[t._v("编辑人："),i("strong",[i("strong",[t._v("酷酷的诚")])]),t._v("  邮箱："),i("strong",[t._v("zhangchengk@foxmail.com")])]),t._v(" "),i("hr"),t._v(" "),i("p",[t._v("内容：")]),t._v(" "),i("h2",{attrs:{id:"描述"}},[i("a",{staticClass:"header-anchor",attrs:{href:"#描述","aria-hidden":"true"}},[t._v("#")]),t._v(" 描述")]),t._v(" "),i("p",[t._v("该处理器将输入流文件属性转成CSV表示形式。生成的CSV可以被写入一个名为“CSVAttributes”的新属性，也可以作为内容写入到流文件中。如果属性值包含逗号、换行符或双引号，则属性值将用双引号转义。属性值中的任何双引号字符都用另一个双引号转义。")]),t._v(" "),i("h2",{attrs:{id:"属性配置"}},[i("a",{staticClass:"header-anchor",attrs:{href:"#属性配置","aria-hidden":"true"}},[t._v("#")]),t._v(" 属性配置")]),t._v(" "),i("p",[t._v("在下面的列表中，必需属性的名称以粗体显示。任何其他属性(不是粗体)都被认为是可选的，并且指出属性默认值（如果有默认值），以及属性是否支持表达式语言。")]),t._v(" "),i("table",[i("thead",[i("tr",[i("th",{staticStyle:{"text-align":"left"}},[t._v("属性名称")]),t._v(" "),i("th",{staticStyle:{"text-align":"left"}},[t._v("默认值")]),t._v(" "),i("th",{staticStyle:{"text-align":"left"}},[t._v("可选值")]),t._v(" "),i("th",{staticStyle:{"text-align":"left"}},[t._v("描述")])])]),t._v(" "),i("tbody",[i("tr",[i("td",{staticStyle:{"text-align":"left"}},[t._v("Attribute List")]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}}),t._v(" "),i("td",{staticStyle:{"text-align":"left"}}),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("逗号分隔的属性名列表，这些属性及属性值将包含在结果CSV中。如果该值为空，则将包含所有现有属性。此属性列表区分大小写，并支持包含逗号的属性名称。如果列表中指定的属性没有找到，它扔将被出现在最终的CSV，并根据“NULL Value”属性使用空字符串或null。如果在这个列表中指定了一个core属性，而“Include core Attributes”属性为false，则将包含core属性。"),i("br"),t._v("支持表达式语言:true")])]),t._v(" "),i("tr",[i("td",{staticStyle:{"text-align":"left"}},[t._v("Attributes Regular Expression")]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}}),t._v(" "),i("td",{staticStyle:{"text-align":"left"}}),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("将根据流文件属性计算的正则表达式，以选择匹配的属性。此属性可与属性列表属性组合使用。最后的输出将包含ATTRIBUTE_LIST和ATTRIBUTE_REGEX中找到的匹配项的组合。"),i("br"),t._v("支持表达式语言:true")])]),t._v(" "),i("tr",[i("td",{staticStyle:{"text-align":"left"}},[i("strong",[t._v("Destination")])]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("flowfile-attribute")]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[i("li",[t._v("flowfile-attribute")]),i("li",[t._v("flowfile-content")])]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("控制CSV值是作为新属性“CSVData”写入，还是写入到流文件内容中。")])]),t._v(" "),i("tr",[i("td",{staticStyle:{"text-align":"left"}},[i("strong",[t._v("Include Core Attributes")])]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("true")]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[i("li",[t._v("true")]),i("li",[t._v("false")])]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("设置csv是否包含FlowFile org.apache.nifi.flowfile.attributes.CoreAttributes（每个流文件都有的核心属性）。核心属性将添加到CSVData和CSVSchema字符串的末尾。Attribute List配置会覆盖此设置。")])]),t._v(" "),i("tr",[i("td",{staticStyle:{"text-align":"left"}},[i("strong",[t._v("Null Value")])]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("false")]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[i("li",[t._v("true")]),i("li",[t._v("false")])]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("如果为true，则结果CSV中不存在或为空的属性将为“null”。如果为false，将在CSV中放置一个空字符串")])]),t._v(" "),i("tr",[i("td",{staticStyle:{"text-align":"left"}},[i("strong",[t._v("Include Schema")])]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("false")]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[i("li",[t._v("true")]),i("li",[t._v("false")])]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("如果为true，schema(属性名)也将转换为CSV字符串，该字符串将应用于名为“CSVSchema”的新属性，或者根据目标属性设置应用于内容的第一行。")])])])]),t._v(" "),i("h2",{attrs:{id:"连接关系"}},[i("a",{staticClass:"header-anchor",attrs:{href:"#连接关系","aria-hidden":"true"}},[t._v("#")]),t._v(" 连接关系")]),t._v(" "),i("table",[i("thead",[i("tr",[i("th",{staticStyle:{"text-align":"left"}},[t._v("名称")]),t._v(" "),i("th",{staticStyle:{"text-align":"left"}},[t._v("描述")])])]),t._v(" "),i("tbody",[i("tr",[i("td",{staticStyle:{"text-align":"left"}},[t._v("success")]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("成功地将属性转换为CSV")])]),t._v(" "),i("tr",[i("td",{staticStyle:{"text-align":"left"}},[t._v("failure")]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("未能将属性转换为CSV")])])])]),t._v(" "),i("h2",{attrs:{id:"读取属性"}},[i("a",{staticClass:"header-anchor",attrs:{href:"#读取属性","aria-hidden":"true"}},[t._v("#")]),t._v(" 读取属性")]),t._v(" "),i("p",[t._v("没有指定。")]),t._v(" "),i("h2",{attrs:{id:"写属性"}},[i("a",{staticClass:"header-anchor",attrs:{href:"#写属性","aria-hidden":"true"}},[t._v("#")]),t._v(" 写属性")]),t._v(" "),i("table",[i("thead",[i("tr",[i("th",{staticStyle:{"text-align":"left"}},[t._v("名称")]),t._v(" "),i("th",{staticStyle:{"text-align":"left"}},[t._v("描述")])])]),t._v(" "),i("tbody",[i("tr",[i("td",{staticStyle:{"text-align":"left"}},[t._v("CSVSchema")]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("CSV 的Schema")])]),t._v(" "),i("tr",[i("td",{staticStyle:{"text-align":"left"}},[t._v("CSVData")]),t._v(" "),i("td",{staticStyle:{"text-align":"left"}},[t._v("CSV 数据")])])])]),t._v(" "),i("h2",{attrs:{id:"状态管理"}},[i("a",{staticClass:"header-anchor",attrs:{href:"#状态管理","aria-hidden":"true"}},[t._v("#")]),t._v(" 状态管理")]),t._v(" "),i("p",[t._v("此组件不存储状态。")]),t._v(" "),i("h2",{attrs:{id:"限制"}},[i("a",{staticClass:"header-anchor",attrs:{href:"#限制","aria-hidden":"true"}},[t._v("#")]),t._v(" 限制")]),t._v(" "),i("p",[t._v("此组件不受限制。")]),t._v(" "),i("h2",{attrs:{id:"输入要求"}},[i("a",{staticClass:"header-anchor",attrs:{href:"#输入要求","aria-hidden":"true"}},[t._v("#")]),t._v(" 输入要求")]),t._v(" "),i("p",[t._v("此组件需要传入关系。")]),t._v(" "),i("h2",{attrs:{id:"系统资源方面的考虑"}},[i("a",{staticClass:"header-anchor",attrs:{href:"#系统资源方面的考虑","aria-hidden":"true"}},[t._v("#")]),t._v(" 系统资源方面的考虑")]),t._v(" "),i("p",[t._v("没有指定。")]),t._v(" "),i("h2",{attrs:{id:"应用场景"}},[i("a",{staticClass:"header-anchor",attrs:{href:"#应用场景","aria-hidden":"true"}},[t._v("#")]),t._v(" 应用场景")]),t._v(" "),i("p",[t._v("该处理器就是将流文件的若干属性转成csv数据，输出到输出流文件的属性或者内容当中 。")]),t._v(" "),i("h2",{attrs:{id:"示例说明"}},[i("a",{staticClass:"header-anchor",attrs:{href:"#示例说明","aria-hidden":"true"}},[t._v("#")]),t._v(" 示例说明")]),t._v(" "),i("details",[i("summary",[t._v("示例流程模板xml")]),t._v(" "),i("p",[t._v("流程图")]),t._v(" "),i("img",{attrs:{src:a(473)}}),t._v(" "),i("p",[t._v("流程模板xml(1.9.2)")]),t._v(" "),i("a",{attrs:{href:"./img/AttributesToCSV/AttributesToCSVdemo.xml"}},[t._v("下载示例模板")])]),t._v(" "),i("p",[t._v("1：如图为GenerateFlowFile生成的流文件，AttributesToCSV配置csv输出到流属性中，csv包含核心属性 ，包含schema")]),t._v(" "),i("p",[i("img",{attrs:{src:a(198),alt:""}})]),t._v(" "),i("p",[t._v("配置如下：")]),t._v(" "),i("p",[i("img",{attrs:{src:a(474),alt:""}})]),t._v(" "),i("p",[t._v("结果为(AttributesToCSV的数据流属性)：")]),t._v(" "),i("p",[i("img",{attrs:{src:a(475),alt:""}})]),t._v(" "),i("p",[t._v("2：例子1中同样的配置，但输出到输出流的content中")]),t._v(" "),i("p",[i("img",{attrs:{src:a(476),alt:""}})]),t._v(" "),i("p",[t._v("结果为")]),t._v(" "),i("p",[i("img",{attrs:{src:a(477),alt:""}})])])}],l=a(0),s=Object(l.a)({},function(){this.$createElement;this._self._c;return this._m(0)},i,!1,null,null,null);e.default=s.exports}}]);