(window.webpackJsonp=window.webpackJsonp||[]).push([[10],{598:function(t,a,e){t.exports=e.p+"assets/img/config.25469dfe.png"},599:function(t,a,e){t.exports=e.p+"assets/img/result.e3545e13.png"},600:function(t,a,e){t.exports=e.p+"assets/img/gaoji.b56a1a3e.png"},601:function(t,a,e){t.exports=e.p+"assets/img/rule.5c0041e2.png"},602:function(t,a,e){t.exports=e.p+"assets/img/result2.81455527.png"},603:function(t,a,e){t.exports=e.p+"assets/img/config3.e13e5f4e.png"},604:function(t,a,e){t.exports=e.p+"assets/img/result3.14fadbd8.png"},605:function(t,a,e){t.exports=e.p+"assets/img/result4.2fae41b2.png"},656:function(t,a,e){"use strict";e.r(a);var r=[function(){var t=this,a=t.$createElement,r=t._self._c||a;return r("div",{staticClass:"content"},[r("h1",{attrs:{id:"updateattribute"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#updateattribute","aria-hidden":"true"}},[t._v("#")]),t._v(" UpdateAttribute")]),t._v(" "),r("hr"),t._v(" "),r("p",[t._v("编辑人："),r("strong",[r("strong",[t._v("酷酷的诚")])]),t._v("  邮箱："),r("strong",[t._v("zhangchengk@foxmail.com")])]),t._v(" "),r("hr"),t._v(" "),r("p",[t._v("内容：")]),t._v(" "),r("h2",{attrs:{id:"描述"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#描述","aria-hidden":"true"}},[t._v("#")]),t._v(" 描述")]),t._v(" "),r("p",[t._v("该处理器使用属性表达式语言更新流文件的属性，并且/或则基于正则表达式删除属性")]),t._v(" "),r("h2",{attrs:{id:"属性配置"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#属性配置","aria-hidden":"true"}},[t._v("#")]),t._v(" 属性配置")]),t._v(" "),r("p",[t._v("在下面的列表中，必需属性的名称以粗体显示。任何其他属性(不是粗体)都被认为是可选的，并且指出属性默认值（如果有默认值），以及属性是否支持表达式语言。")]),t._v(" "),r("table",[r("thead",[r("tr",[r("th",[t._v("属性名称")]),t._v(" "),r("th",{staticStyle:{"text-align":"center"}},[t._v("默认值")]),t._v(" "),r("th",[t._v("可选值")]),t._v(" "),r("th",[t._v("描述")])])]),t._v(" "),r("tbody",[r("tr",[r("td",[t._v("Delete Attributes Expression")]),t._v(" "),r("td",{staticStyle:{"text-align":"center"}}),t._v(" "),r("td"),t._v(" "),r("td",[t._v("删除的属性正则表达式"),r("br"),t._v("支持表达式语言:true")])]),t._v(" "),r("tr",[r("td",[r("strong",[t._v("Store State")])]),t._v(" "),r("td",{staticStyle:{"text-align":"center"}},[t._v("Do not store state")]),t._v(" "),r("td",[r("li",[t._v("Do not store state")]),r("li",[t._v("Store state locally")])]),t._v(" "),r("td",[t._v("选择是否存储状态。")])]),t._v(" "),r("tr",[r("td",[t._v("Stateful Variables Initial Value")]),t._v(" "),r("td",{staticStyle:{"text-align":"center"}}),t._v(" "),r("td"),t._v(" "),r("td",[t._v("如果使用"),r("strong",[t._v("Store State")]),t._v("，则此值用于设置有状态变量的初值。只有当状态不包含变量的值时，才会在@OnScheduled方法中使用。如果是有状态运行，这是必需配置的，但是如果需要，这可以是空的。")])])])]),t._v(" "),r("h2",{attrs:{id:"动态属性"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#动态属性","aria-hidden":"true"}},[t._v("#")]),t._v(" 动态属性")]),t._v(" "),r("p",[t._v("该处理器允许用户指定属性的名称和值。")]),t._v(" "),r("table",[r("thead",[r("tr",[r("th",[t._v("属性名称")]),t._v(" "),r("th",[t._v("属性值")]),t._v(" "),r("th",[t._v("描述")])])]),t._v(" "),r("tbody",[r("tr",[r("td",[t._v("用户自由定义的属性名称(将要update的属性名)")]),t._v(" "),r("td",[t._v("用户自由定义的属性值")]),t._v(" "),r("td",[t._v("用动态属性的值指定的值更新由动态属性的键指定的FlowFile属性"),r("br"),t._v("支持表达式语言:true(只使用变量注册表进行计算)")])])])]),t._v(" "),r("h2",{attrs:{id:"连接关系"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#连接关系","aria-hidden":"true"}},[t._v("#")]),t._v(" 连接关系")]),t._v(" "),r("table",[r("thead",[r("tr",[r("th",[t._v("名称")]),t._v(" "),r("th",[t._v("描述")])])]),t._v(" "),r("tbody",[r("tr",[r("td",[t._v("sucess")]),t._v(" "),r("td",[t._v("所有成功的流文件都被路由到这个关系")])]),t._v(" "),r("tr",[r("td",[t._v("set state fail")]),t._v(" "),r("td",[t._v("如果处理器正在有状态地运行，并且在向流文件添加属性后没有设置状态，那么流文件将被路由到这个关系。")])])])]),t._v(" "),r("h2",{attrs:{id:"读取属性"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#读取属性","aria-hidden":"true"}},[t._v("#")]),t._v(" 读取属性")]),t._v(" "),r("p",[t._v("没有指定。")]),t._v(" "),r("h2",{attrs:{id:"写属性"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#写属性","aria-hidden":"true"}},[t._v("#")]),t._v(" 写属性")]),t._v(" "),r("table",[r("thead",[r("tr",[r("th",[t._v("Name")]),t._v(" "),r("th",[t._v("Description")])])]),t._v(" "),r("tbody",[r("tr",[r("td",[t._v("See additional details")]),t._v(" "),r("td",[t._v("该处理器可以编写或删除零个或多个属性")])])])]),t._v(" "),r("h2",{attrs:{id:"状态管理"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#状态管理","aria-hidden":"true"}},[t._v("#")]),t._v(" 状态管理")]),t._v(" "),r("table",[r("thead",[r("tr",[r("th",[t._v("Scope")]),t._v(" "),r("th",[t._v("Description")])])]),t._v(" "),r("tbody",[r("tr",[r("td",[t._v("LOCAL")]),t._v(" "),r("td",[t._v("提供一个选项，不仅将值存储在流文件中，还将值存储为要以递归方式引用的有状态变量。")])])])]),t._v(" "),r("h2",{attrs:{id:"限制"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#限制","aria-hidden":"true"}},[t._v("#")]),t._v(" 限制")]),t._v(" "),r("p",[t._v("此组件不受限制。")]),t._v(" "),r("h2",{attrs:{id:"输入要求"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#输入要求","aria-hidden":"true"}},[t._v("#")]),t._v(" 输入要求")]),t._v(" "),r("p",[t._v("此组件需要传入关系。")]),t._v(" "),r("h2",{attrs:{id:"系统资源方面的考虑"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#系统资源方面的考虑","aria-hidden":"true"}},[t._v("#")]),t._v(" 系统资源方面的考虑")]),t._v(" "),r("p",[t._v("没有指定。")]),t._v(" "),r("h2",{attrs:{id:"应用场景"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#应用场景","aria-hidden":"true"}},[t._v("#")]),t._v(" 应用场景")]),t._v(" "),r("p",[t._v("该处理器基本用法最为常用，及增加，修改或删除流属性；")]),t._v(" "),r("p",[t._v("此处理器使用用户添加的属性或规则更新FlowFile的属性。有三种方法可以使用此处理器添加或修改属性。一种方法是“基本用法”; 默认更改通过处理器的每个FlowFile的匹配的属性。第二种方式是“高级用法”; 可以进行条件属性更改，只有在满足特定条件时才会影响FlowFile。可以在同一处理器中同时使用这两种方法。第三种方式是“删除属性表达式”; 允许提供正则表达式，并且将删除匹配的任何属性。")]),t._v(" "),r("p",[t._v("请注意，“删除属性表达式”将取代发生的任何更新。如果现有属性与“删除属性表达式”匹配，则无论是否更新，都将删除该属性。也就是说，“删除属性表达式”仅适用于输入FlowFile中存在的属性，如果属性是由此处理器添加的，则“删除属性表达式”将不会匹配到它。")]),t._v(" "),r("h2",{attrs:{id:"示例说明"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#示例说明","aria-hidden":"true"}},[t._v("#")]),t._v(" 示例说明")]),t._v(" "),r("p",[t._v("1：基本用法增加一个属性")]),t._v(" "),r("p",[r("img",{attrs:{src:e(598),alt:""}})]),t._v(" "),r("p",[t._v("结果输出：")]),t._v(" "),r("p",[r("img",{attrs:{src:e(599),alt:""}})]),t._v(" "),r("p",[t._v("2：高级用法，添加规则条件，符合条件时update指定的属性值")]),t._v(" "),r("p",[t._v("点击ADVANCED")]),t._v(" "),r("p",[r("img",{attrs:{src:e(600),alt:""}})]),t._v(" "),r("p",[t._v("添加一个rule,如果id的值等于11，就修改id的值为22")]),t._v(" "),r("p",[r("img",{attrs:{src:e(601),alt:""}})]),t._v(" "),r("p",[t._v("结果输出：")]),t._v(" "),r("p",[r("img",{attrs:{src:e(602),alt:""}})]),t._v(" "),r("p",[t._v("3：高级用法 存储状态,记录通过该处理器的数据流总和")]),t._v(" "),r("p",[r("img",{attrs:{src:e(603),alt:""}})]),t._v(" "),r("p",[t._v("结果输出：")]),t._v(" "),r("p",[r("img",{attrs:{src:e(604),alt:""}})]),t._v(" "),r("p",[r("img",{attrs:{src:e(605),alt:""}})])])}],_=e(0),v=Object(_.a)({},function(){this.$createElement;this._self._c;return this._m(0)},r,!1,null,null,null);a.default=v.exports}}]);