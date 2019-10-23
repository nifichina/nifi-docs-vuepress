(window.webpackJsonp=window.webpackJsonp||[]).push([[33],{537:function(t,e,a){t.exports=a.p+"assets/img/dataflow.9a32fd3e.png"},538:function(t,e,a){t.exports=a.p+"assets/img/config.ea5ad6c4.png"},619:function(t,e,a){"use strict";a.r(e);var l=[function(){var t=this,e=t.$createElement,l=t._self._c||e;return l("div",{staticClass:"content"},[l("h1",{attrs:{id:"generateflowfile"}},[l("a",{staticClass:"header-anchor",attrs:{href:"#generateflowfile","aria-hidden":"true"}},[t._v("#")]),t._v(" GenerateFlowFile")]),t._v(" "),l("hr"),t._v(" "),l("p",[t._v("编辑人："),l("strong",[l("strong",[t._v("酷酷的诚")])]),t._v("  邮箱："),l("strong",[t._v("zhangchengk@foxmail.com")])]),t._v(" "),l("hr"),t._v(" "),l("p",[t._v("内容：")]),t._v(" "),l("h2",{attrs:{id:"描述"}},[l("a",{staticClass:"header-anchor",attrs:{href:"#描述","aria-hidden":"true"}},[t._v("#")]),t._v(" 描述")]),t._v(" "),l("p",[t._v("该处理器使用随机数据或自定义内容创建流文件。GenerateFlowFile用于负载测试、配置和仿真。")]),t._v(" "),l("h2",{attrs:{id:"属性配置"}},[l("a",{staticClass:"header-anchor",attrs:{href:"#属性配置","aria-hidden":"true"}},[t._v("#")]),t._v(" 属性配置")]),t._v(" "),l("p",[t._v("在下面的列表中，必需属性的名称以粗体显示。任何其他属性(不是粗体)都被认为是可选的，并且指出属性默认值（如果有默认值），以及属性是否支持表达式语言。")]),t._v(" "),l("table",[l("thead",[l("tr",[l("th",{staticStyle:{"text-align":"left"}},[t._v("属性名称")]),t._v(" "),l("th",{staticStyle:{"text-align":"left"}},[t._v("默认值")]),t._v(" "),l("th",{staticStyle:{"text-align":"left"}},[t._v("可选值")]),t._v(" "),l("th",{staticStyle:{"text-align":"left"}},[t._v("描述")])])]),t._v(" "),l("tbody",[l("tr",[l("td",{staticStyle:{"text-align":"left"}},[l("strong",[t._v("File Size")])]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("0B")]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}}),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("将使用的文件流的大小")])]),t._v(" "),l("tr",[l("td",{staticStyle:{"text-align":"left"}},[l("strong",[t._v("Batch Size")])]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("1")]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}}),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("每次调用时要传输出去的流文件的数量")])]),t._v(" "),l("tr",[l("td",{staticStyle:{"text-align":"left"}},[l("strong",[t._v("Data Format")])]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("Text")]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[l("li",[t._v("Binary")]),l("li",[t._v("Text")])]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("指定数据应该是文本还是二进制")])]),t._v(" "),l("tr",[l("td",{staticStyle:{"text-align":"left"}},[l("strong",[t._v("Unique FlowFiles")])]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("false")]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[l("li",[t._v("true")]),l("li",[t._v("false")])]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("如果选择true，则生成的每个流文件都是惟一的。"),l("br"),t._v("如果选择false，此处理器将生成一个随机值，所有的流文件都是相同的内容，模仿更高的吞吐量时可以这样使用")])]),t._v(" "),l("tr",[l("td",{staticStyle:{"text-align":"left"}},[t._v("Custom Text")]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}}),t._v(" "),l("td",{staticStyle:{"text-align":"left"}}),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("如果Data Format选择Text，且Unique FlowFiles选择为false，那么这个自定义文本将用作生成的流文件的内容，文件大小将被忽略。"),l("br"),t._v("如果Custom Text中使用了表达式语言，则每批生成的流文件只执行一次表达式语言的计算"),l("br"),t._v("支持表达式语言:true(只使用变量注册表进行计算)")])]),t._v(" "),l("tr",[l("td",{staticStyle:{"text-align":"left"}},[l("strong",[t._v("Character Set")])]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("UTF-8")]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}}),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("指定将自定义文本的字节写入流文件时要使用的编码")])])])]),t._v(" "),l("h2",{attrs:{id:"动态属性："}},[l("a",{staticClass:"header-anchor",attrs:{href:"#动态属性：","aria-hidden":"true"}},[t._v("#")]),t._v(" 动态属性：")]),t._v(" "),l("p",[t._v("该处理器允许用户指定属性的名称和值。")]),t._v(" "),l("table",[l("thead",[l("tr",[l("th",{staticStyle:{"text-align":"left"}},[t._v("属性名称")]),t._v(" "),l("th",{staticStyle:{"text-align":"left"}},[t._v("属性值")]),t._v(" "),l("th",{staticStyle:{"text-align":"left"}},[t._v("描述")])])]),t._v(" "),l("tbody",[l("tr",[l("td",{staticStyle:{"text-align":"left"}},[t._v("用户自由定义的属性名称")]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("用户自由定义的属性值")]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}},[t._v("在该处理器生成的文件流上添加用户自定义的属性。如果使用表达式语言，则每批生成的流文件只执行一次计算 ."),l("br"),t._v("支持表达式语言:true(只使用变量注册表进行计算)")])])])]),t._v(" "),l("h2",{attrs:{id:"连接关系"}},[l("a",{staticClass:"header-anchor",attrs:{href:"#连接关系","aria-hidden":"true"}},[t._v("#")]),t._v(" 连接关系")]),t._v(" "),l("table",[l("thead",[l("tr",[l("th",{staticStyle:{"text-align":"left"}},[t._v("名称")]),t._v(" "),l("th",{staticStyle:{"text-align":"left"}},[t._v("描述")])])]),t._v(" "),l("tbody",[l("tr",[l("td",{staticStyle:{"text-align":"left"}},[t._v("sucess")]),t._v(" "),l("td",{staticStyle:{"text-align":"left"}})])])]),t._v(" "),l("h2",{attrs:{id:"读取属性"}},[l("a",{staticClass:"header-anchor",attrs:{href:"#读取属性","aria-hidden":"true"}},[t._v("#")]),t._v(" 读取属性")]),t._v(" "),l("p",[t._v("没有指定。")]),t._v(" "),l("h2",{attrs:{id:"写属性"}},[l("a",{staticClass:"header-anchor",attrs:{href:"#写属性","aria-hidden":"true"}},[t._v("#")]),t._v(" 写属性")]),t._v(" "),l("p",[t._v("没有指定。")]),t._v(" "),l("h2",{attrs:{id:"状态管理"}},[l("a",{staticClass:"header-anchor",attrs:{href:"#状态管理","aria-hidden":"true"}},[t._v("#")]),t._v(" 状态管理")]),t._v(" "),l("p",[t._v("此组件不存储状态。")]),t._v(" "),l("h2",{attrs:{id:"限制"}},[l("a",{staticClass:"header-anchor",attrs:{href:"#限制","aria-hidden":"true"}},[t._v("#")]),t._v(" 限制")]),t._v(" "),l("p",[t._v("此组件不受限制。")]),t._v(" "),l("h2",{attrs:{id:"输入要求"}},[l("a",{staticClass:"header-anchor",attrs:{href:"#输入要求","aria-hidden":"true"}},[t._v("#")]),t._v(" 输入要求")]),t._v(" "),l("p",[t._v("此组件不允许传入连接关系。")]),t._v(" "),l("h2",{attrs:{id:"系统资源方面的考虑"}},[l("a",{staticClass:"header-anchor",attrs:{href:"#系统资源方面的考虑","aria-hidden":"true"}},[t._v("#")]),t._v(" 系统资源方面的考虑")]),t._v(" "),l("p",[t._v("没有指定。")]),t._v(" "),l("h2",{attrs:{id:"应用场景"}},[l("a",{staticClass:"header-anchor",attrs:{href:"#应用场景","aria-hidden":"true"}},[t._v("#")]),t._v(" 应用场景")]),t._v(" "),l("p",[t._v("该处理器多用于测试，配置生成设计人员所需要的特定数据，模拟数据来源或者压力测试、负载测试；")]),t._v(" "),l("p",[t._v("某些场景中可以作为配置灵活使用，比如设计人员想设计一个流程查询多个表，表名就可以做出json数组配置到Custom Text，之后再使用其他相关处理器生成含有不同表名属性的多个流文件，就可以实现一个流程查询多表。(额外延伸，也可以在变量注册表、缓存保存配置，通过不同的配置读取不同的表)")]),t._v(" "),l("h2",{attrs:{id:"示例说明"}},[l("a",{staticClass:"header-anchor",attrs:{href:"#示例说明","aria-hidden":"true"}},[t._v("#")]),t._v(" 示例说明")]),t._v(" "),l("p",[t._v("1：该处理器生成流文件固只能作为所设计流程的第一个处理器，不允许作为其他处理器传入连接关系。")]),t._v(" "),l("p",[l("img",{attrs:{src:a(537),alt:""}})]),t._v(" "),l("p",[t._v("2：设置批量输出流文件，设置数据格式为Text，并且在Custom Text使用了随机数表达式。")]),t._v(" "),l("p",[l("img",{attrs:{src:a(538),alt:""}})]),t._v(" "),l("p",[t._v("此时每次输出10个流文件，表达式${random():mod(10):plus(1)}只执行一次，10个流文件中的文本内容是相同的。")])])}],i=a(0),_=Object(i.a)({},function(){this.$createElement;this._self._c;return this._m(0)},l,!1,null,null,null);e.default=_.exports}}]);