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
            ['/updateLog', '更新日志'],
            ['/comment', '评论区'],
            {
              title: '基础文档',
              children: [
                ['/general/overview','概览'],
                ['/general/GettingStarted','入门'],
                ['/general/UserGuide','用户指南'],
                ['/general/ExpressionLanguageGuide','表达式语言'],
                ['/general/RecordPathGuide','RecordPath指南'],
                ['/general/AdminGuide','管理员指南'],
                ['/general/ToolkitGuide','Toolkit指南']
              ]
            },
            {
              title: '开发文档',
              children: [
                ['/developer/RestApi','Rest Api'],
                ['/developer/DeveloperGuide','Developer Guide'],
                ['/developer/ApacheNiFiInDepth','Apache NiFi In Depth']
               ]
            },
            {
              title: '组件Processors',
              children: [
                ['/processors/AttributesToCSV','AttributesToCSV'],
                ['/processors/AttributesToJSON','AttributesToJSON'],
                ['/processors/Base64EncodeContent','Base64EncodeContent'],
                ['/processors/CalculateRecordStats','CalculateRecordStats'],
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
                ['/processors/JoltTransformJSON','JoltTransformJSON'],
                ['/processors/JoltTransformRecord','JoltTransformRecord'],
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
              title: '组件Controller Services',
              children: [
                
               ]
            },
            {
              title: '组件Reporting Tasks',
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
                ['/code/Content Repository Archiving','理解内容存储库归档'],
                ['/code/ExpressionLanguage','自定义开发NIFI表达式语言']
               ]
            },
            {
              title: 'NIFI 扩展知识',
              children: [
                ['/extend/ControllerServiceArchive','ControllerService扩展开发的项目结构'],
                ['/extend/通过配置优化NiFi性能','通过配置优化NiFi性能'],
                ['/extend/NIFI Linux系统配置的最佳实践','NIFI Linux系统配置的最佳实践'],
                ['/extend/JsonJoltShift','JSONJOLT介绍及语法详解-shift篇'],
                ['/jolt/jolt详解','JOLT 教程'],
                ['/jolt/joltdoc','Json Jolt Tutorial'],
                ['/http/聊聊HTTPS和SS、TLS协议','HTTPS和SS、TLS协议'],
                ['/mysql/Java Mysql连接池配置和案例分析--超时异常和处理','Java Mysql连接池配置和案例分析--超时异常和处理'],
                ['/oracle/oracle 12C的新特性-CDB和PDB','oracle 12C的新特性-CDB和PDB'],
                ['/oracle/Oracle12cLogMiner分析Redo日志文件','Oracle12cLogMiner分析Redo日志文件部分文档翻译']
               ]
            },
            {
              title: '其他源码',
              children: [
                ['/java-source-code/ProcessBuilder','ProcessBuilder类'],
                ['/java-source-code/ClassLoader','ClassLoader类'],
                ['/java-source-code/Thread','Thread类'],
                ['/java-source-code/ProcessBuilder','ProcessBuilder类'],
                ['/java-source-code/ContextClassLoader','线程上下文类加载器'],
                ['/java-source-code/从jvm源码解读Java运行时的类加载','从jvm源码解读Java运行时的类加载'],
                ['/java-source-code/Socket','Java socket详解(转)'],
                ['/java-source-code/HashMap','Java HashMap 新增方法(merge,compute)(转)']
                
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