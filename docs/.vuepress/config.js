module.exports = {
    title: 'NIFI中文文档',
    description: 'NIFI中文文档',
    head: [
        ['link', { rel: 'icon', href: '/logo.png' }]
      ],
    themeConfig: {
        sidebarDepth: 3,
        lastUpdated: 'Last Updated',
        sidebar:  [
            ['/', '首頁'],
            {
              title: 'General',
              children: [
                ['/general/overview','概览'],
                ['/general/GettingStarted','入门'],
                ['/general/UserGuide','用户指南'],
                ['/general/ExpressionLanguageGuide','Expression Language Guide'],
                ['/general/RecordPathGuide','RecordPath Guide'],
                ['/general/AdminGuide','Admin Guide'],
                ['/general/ToolkitGuide','Toolkit Guide']
              ]
            },
            {
              title: 'Developer',
              children: [
                ['/developer/RestApi','Rest Api'],
                ['/developer/DeveloperGuide','Developer Guide'],
                ['/developer/ApacheNiFiInDepth','Apache NiFi In Depth']
               ]
            },
            {
              title: 'Processors',
              children: [
                ['/processors/AttributesToCSV','AttributesToCSV'],
                ['/processors/AttributesToJSON','AttributesToJSON'],
                ['/processors/ConvertJSONToAvro','ConvertJSONToAvro'],
                ['/processors/CryptographicHashAttribute','CryptographicHashAttribute'],
                ['/processors/DistributeLoad','DistributeLoad'],
                ['/processors/EvaluateJsonPath','EvaluateJsonPath'],
                ['/processors/ExecuteGroovyScript','ExecuteGroovyScript'],
                ['/processors/ExtractText','ExtractText'],
                ['/processors/ExecuteSQL','ExecuteSQL'],
                ['/processors/FlattenJson','FlattenJson'],
                ['/processors/GenerateFlowFile','GenerateFlowFile'],
                ['/processors/GenerateTableFetch','GenerateTableFetch'],
                ['/processors/HandleHttpRequest_HandleHttpResponse','HandleHttpRequest_HandleHttpResponse'],
                ['/processors/InvokeHTTP','InvokeHTTP'],
                ['/processors/LogAttribute','LogAttribute'],
                ['/processors/LogMessage','LogMessage'],
                ['/processors/PutHiveStreaming','PutHiveStreaming'],
                ['/processors/ReplaceText','ReplaceText'],
                ['/processors/RouteOnAttribute','RouteOnAttribute'],
                ['/processors/RouteOnContent','RouteOnContent'],
                ['/processors/SplitAvro','SplitAvro'],
                ['/processors/SplitJson','SplitJson'],
                ['/processors/UpdateAttribute','UpdateAttribute']
    
               ]
            },
            {
              title: 'Controller Services',
              children: [
                
               ]
            },
            {
              title: 'Reporting Tasks',
              children: [
                
               ]
            },
            {
              title: 'NIFI 源码系列',
              children: [
                ['/code/nifi-nar','NIFI-NAR包概述'],
                ['/code/nifi-nar-classloader','nifi nar包加载机制源码解读'],
                ['/code/nifi-sh','nifi.sh 脚本解读'],
                ['/code/nifi-env-sh','nifi-env.sh 脚本解读'],
                ['/code/nifi-sh-start','nifi.sh start 解读'],
                ['/code/RunNiFi','RunNiFi.java 源码解读'],
                ['/code/NiFi','NiFi.java 源码解读'],
                ['/code/UnpackNar','Nar包下的MANIFEST.MF'],
                
               ]
            },
            {
              title: 'NIFI 扩展开发系列',
              children: [
                ['/extend/ControllerServiceArchive','ControllerService扩展开发的项目结构'],
                ['/extend/JsonJoltShift','JSONJOLT介绍及语法详解-shift篇'],
                ['/extend/通过配置优化NiFi性能','通过配置优化NiFi性能'],
                ['/extend/NIFI Linux系统配置的最佳实践','NIFI Linux系统配置的最佳实践']
               
               ]
            },
            {
              title: 'Java source code',
              children: [
                ['/java-source-code/ProcessBuilder','ProcessBuilder'],
                ['/java-source-code/ClassLoader','ClassLoader'],
                ['/java-source-code/Thread','Thread'],
                ['/java-source-code/ContextClassLoader','线程上下文类加载器'],
                ['/java-source-code/从jvm源码解读Java运行时的类加载','从jvm源码解读Java运行时的类加载'],
                ['/java-source-code/Socket','Java socket详解（转）'],
                ['/java-source-code/HashMap','Java HashMap 新增方法(merge,compute)（转）']
                
               
              ]
            },
            {
              title: 'Jetty source code',
              children: [
                ['/java-source-code/ProcessBuilder','ProcessBuilder']
                
               
              ]
            }
          ]
      },
      markdown: {
        toc:{
          includeLevel: [2,3,4]
        }
      },
      plugins: [
        [
          '@vuepress/register-components',
          {
            componentsDir: './components'
          }
        ]
      ]
  }