import org.apache.nifi.processor.Relationship
import org.apache.nifi.processor.Processor
import org.apache.nifi.processor.ProcessSessionFactory;
import org.apache.nifi.processor.ProcessContext
import org.apache.nifi.processor.ProcessSession
import org.apache.nifi.processor.util.StandardValidators
import org.apache.nifi.processor.exception.ProcessException
import org.apache.nifi.dbcp.DBCPService
import org.apache.nifi.components.PropertyDescriptor
import org.apache.nifi.components.Validator
import org.apache.nifi.components.state.Scope
import org.apache.nifi.components.ValidationContext
import org.apache.nifi.components.ValidationResult
import org.apache.nifi.logging.ComponentLog
import org.apache.commons.io.IOUtils
import java.nio.charset.StandardCharsets
import java.lang.StringBuilder
import java.util.Collection
import java.util.List
import java.util.Set
import groovy.sql.Sql

class AnalyzeLogMinerProcessor implements Processor {

    def dbcpService

    ComponentLog log

    final static Relationship  REL_SUCCESS = new Relationship.Builder()
            .name('success')
            .description('成功从LogMiner视图中读取出来的redo_sql语句')
            .build();

    @Override
    Set<Relationship> getRelationships() {
         return [REL_SUCCESS] as Set<Relationship> 
    }

    static final PropertyDescriptor DBCP_SERVICE = new PropertyDescriptor.Builder()
            .name("Database Connection Pooling Service")
            .description("The Controller Service that is used to obtain connection to database")
            .required(true)
            .identifiesControllerService(DBCPService.class)
            .build();

    static final PropertyDescriptor NLS_DATE_FORMAT = new PropertyDescriptor.Builder()
            .name('NLS DATE FORMAT').description('初始化时，如果指定LogMiner分析Oracle日志的起始或终止时间，需要使用此配置指定时间格式')
            .required(false).addValidator(Validator.VALID).defaultValue('YYYY-MM-DD HH24:MI:SS').build()

    static final PropertyDescriptor INIT_STARTTIME = new PropertyDescriptor.Builder()
            .name('INIT STARTTIME').description('初始化时，指定LogMiner分析Oracle日志的起始时间,如果配置此项,必须配置NLS_DATE_FORMAT,并建议同时配置INIT_ENDTIME')
            .required(false).addValidator(Validator.VALID).build()

    static final PropertyDescriptor INIT_ENDTIME = new PropertyDescriptor.Builder()
            .name('INIT ENDTIME').description('初始化时，指定LogMiner分析Oracle日志的终止时间，如果配置此项,必须配置NLS_DATE_FORMAT，并建议同时配置INIT_STARTTIME')
            .required(false).addValidator(Validator.VALID).build()
    
    static final PropertyDescriptor INIT_SCN = new PropertyDescriptor.Builder()
            .name('INIT SCN').description('初始化时，指定LogMiner分析Oracle日志的起始SCN号')
            .required(false).addValidator(Validator.VALID).build()

    static final PropertyDescriptor SCN_STEP_SIZE = new PropertyDescriptor.Builder()
            .name('SCN  STEP SIZE').description('指定LogMiner分析Oracle日志步长，即每次最多加载多少scn行的数据,默认值为8000，请根据实际流量合理配置此值')
            .required(true).addValidator(Validator.VALID).defaultValue('8000').build()
    
    static final PropertyDescriptor SCHEMA_NAME = new PropertyDescriptor.Builder()
            .name('SCHEMA NAME').description('指定LogMiner分析Oracle日志的SEG_OWNER,即指定schema名称')
            .required(false).addValidator(Validator.VALID).build()

    static String endLogMinerSql = "BEGIN DBMS_LOGMNR.END_LOGMNR;END;"

    static String selectMaxScnSql = "SELECT MAX(SCN) as MAX FROM v\$logmnr_contents"

    static String selectMinScnSql = "SELECT MIN(SCN) as MIN FROM v\$logmnr_contents"

    @Override
    void initialize(ProcessorInitializationContext context) {}

    @Override
    void onTrigger(ProcessContext context, ProcessSessionFactory sessionFactory) throws ProcessException {
        def session = sessionFactory.createSession()
        //获取数据库连接池
        def dbcpService = context.getProperty(DBCP_SERVICE).asControllerService(DBCPService)
        if(dbcpService == null){
            return
        }
        def conn = dbcpService.getConnection()
        if(conn == null){
            throw new ProcessException("数据库连接不可用")
        }
        //获取当前组件的状态存储管理器 存取SCN号
        def stateManager = context.stateManager
        def stateMap = stateManager.getState(Scope.CLUSTER)
        def scn = stateMap.get('scn')
        //从视图中查询到的[结果]的最大scn号
        String lastScn = ""
        //当前视图中最大的scn号
        String thisViewMaxScn = ""
        def nlsDateFormat = context.getProperty(NLS_DATE_FORMAT).getValue()
        def initStartTime = context.getProperty(INIT_STARTTIME).getValue()
        def intEndTime = context.getProperty(INIT_ENDTIME).getValue()
        def initScn = context.getProperty(INIT_SCN).getValue()
        def scnStepSize = context.getProperty(SCN_STEP_SIZE).getValue()
        def schemaName = context.getProperty(SCHEMA_NAME).getValue()
        def sql
        try {
            sql = new Sql(conn)
            //添加日志SQL语句
            StringBuilder addLogFileSql = new StringBuilder()
            //查询线上redo log组，每组取一个日志文件读取
            sql.rows("SELECT * FROM (SELECT GROUP#,MEMBER,ROW_NUMBER() OVER(PARTITION BY GROUP# ORDER BY MEMBER) AS RN FROM v\$logfile) WHERE RN <= 1").eachWithIndex { row, idx ->
                    if(idx == 0){
                        addLogFileSql.append("BEGIN DBMS_LOGMNR.ADD_LOGFILE(LOGFILENAME => \'${row.getProperty("MEMBER")}\', OPTIONS => DBMS_LOGMNR.NEW) ; ")
                    }else{
                        addLogFileSql.append(" DBMS_LOGMNR.ADD_LOGFILE(LOGFILENAME => \'${row.getProperty("MEMBER")}\', OPTIONS => DBMS_LOGMNR.ADDFILE) ; ")
                    }
                }
            addLogFileSql.append(" END ;")
            log.debug("执行${addLogFileSql.toString()}")
            sql.call(addLogFileSql.toString())
            def startLogMinerSql
            // 判断state中的scn是否存在 不存在的话进一步判断是否需要初始化时间和scn号
            boolean initScnConfig = false
            if(scn == null){
                startLogMinerSql= new StringBuilder()
                String alterTimeFoemat = "ALTER SESSION SET NLS_DATE_FORMAT = \'${nlsDateFormat.toString()}\'"
                startLogMinerSql.append("BEGIN DBMS_LOGMNR.START_LOGMNR(")
                if(initScn != null){
                    initScnConfig = true
                    startLogMinerSql.append("STARTSCN => ${initScn},ENDSCN =>${Long.parseLong(initScn)+Long.parseLong(scnStepSize)},")
                }
                if(initStartTime != null){ 
                    sql.execute(alterTimeFoemat)
                    startLogMinerSql.append("STARTTIME => \'${initStartTime}\',")
                }
                if(intEndTime != null){
                    sql.execute(alterTimeFoemat)
                    startLogMinerSql.append("ENDTIME => \'${intEndTime}\',")
                }
                startLogMinerSql.append("OPTIONS => DBMS_LOGMNR.DICT_FROM_ONLINE_CATALOG + DBMS_LOGMNR.NO_SQL_DELIMITER  + DBMS_LOGMNR.NO_ROWID_IN_STMT + DBMS_LOGMNR.SKIP_CORRUPTION);END;")
                // 如果初始化，没有配置scn，避免第一次查询时间过长，只查询最小scn号保存state并结束本次调度
                if(!initScnConfig){
                    log.debug("Auto Init the Scn")
                    sql.execute(startLogMinerSql.toString())
                    String thisViewMinScn = sql.rows(selectMinScnSql).get(0)?.getProperty("MIN")?.toString()
                    log.debug("最小scn号："+thisViewMinScn)
                    def newMap = ['scn':thisViewMinScn]
                    updateState(newMap,stateMap,stateManager)
                    sql.execute(endLogMinerSql)
                    return
                }
            }else{
                log.debug("本次SCN号"+scn)
                // StateMap存在scn号的启动语句
                startLogMinerSql = "BEGIN DBMS_LOGMNR.START_LOGMNR(STARTSCN => ${Long.parseLong(scn)+1},ENDSCN =>${Long.parseLong(scn)+Long.parseLong(scnStepSize)},  OPTIONS  => DBMS_LOGMNR.DICT_FROM_ONLINE_CATALOG + DBMS_LOGMNR.NO_SQL_DELIMITER  + DBMS_LOGMNR.NO_ROWID_IN_STMT + DBMS_LOGMNR.SKIP_CORRUPTION);END;"
            }
            log.debug("执行${startLogMinerSql.toString()}")
            //LogMiner start后，视图是随着redo日志文件增长的。比如前后两次查询的最大scn值就是不同的
            sql.execute(startLogMinerSql.toString())
            //先查询当前视图最大scn号
            
            log.debug("执行${selectMaxScnSql}")
            thisViewMaxScn = sql.rows(selectMaxScnSql).get(0)?.getProperty("MAX")?.toString()
            //执行查询视图
            StringBuilder selectRedoSql = new StringBuilder("SELECT SCN,TABLE_NAME,SEG_OWNER,SQL_REDO FROM v\$logmnr_contents where SEG_TYPE=2 AND OPERATION_CODE IN (1,2,3)")
            if(schemaName != null){
               selectRedoSql.append(" AND SEG_OWNER = '").append(schemaName.toString()).append("' AND USERNAME != 'SYS' ")     
            }else{
               selectRedoSql.append(" AND SEG_OWNER NOT IN ('SYS', 'SYSTEM') AND USERNAME != 'SYS' ") 
            }
            log.debug("执行${selectRedoSql.toString()}")
            sql.rows(selectRedoSql.toString()).eachWithIndex { row, idx ->
                def ff = session.create()
                lastScn = row.getProperty("SCN")?.toString()
                ff=session.putAttribute(ff,"SCN",row.getProperty("SCN")?.toString())
                ff=session.putAttribute(ff,"tableName",row.getProperty("TABLE_NAME")?.toString())
                ff=session.putAttribute(ff,"segOwner",row.getProperty("SEG_OWNER")?.toString())
                ff = session.write(ff, {outputStream ->
                    outputStream.write(row.getProperty("SQL_REDO")?.toString().getBytes(StandardCharsets.UTF_8))
                    } as OutputStreamCallback)
                session.transfer(ff, REL_SUCCESS)
                session.commit() 
            }
            log.debug("执行${endLogMinerSql}")
            sql.execute(endLogMinerSql)
        } catch(e) {
            throw new ProcessException(e)
        }finally {
            log.debug("Close Sql")
            sql?.close() 
        }
        //更新state逻辑 
        if(lastScn){
            lastScn = lastScn>thisViewMaxScn?lastScn:thisViewMaxScn
        }else{
            lastScn = thisViewMaxScn
        }
        def newMap = ['scn':lastScn]
        updateState(newMap,stateMap,stateManager)
    }

    void updateState(def newMap,def stateMap,def stateManager){
        if (stateMap.version == -1) {
        stateManager.setState(newMap, Scope.CLUSTER);
        } else {
        stateManager.replace(stateMap, newMap, Scope.CLUSTER);
        }
    }

    @Override
    Collection<ValidationResult> validate(ValidationContext context) { return null }

    @Override
    PropertyDescriptor getPropertyDescriptor(String name) {
        switch(name) {
            case 'Database Connection Pooling Service': return DBCP_SERVICE
            case 'NLS DATE FORMAT': return NLS_DATE_FORMAT
            case 'INIT STARTTIME': return INIT_STARTTIME
            case 'INIT ENDTIME': return INIT_ENDTIME
            case 'INIT SCN': return INIT_SCN
            case 'SCN  STEP SIZE': return SCN_STEP_SIZE
            case 'SCHEMA NAME': return SCHEMA_NAME
            default: return null
        }
    }

    @Override
    void onPropertyModified(PropertyDescriptor descriptor, String oldValue, String newValue) { }

    @Override
    List<PropertyDescriptor> getPropertyDescriptors() { return [DBCP_SERVICE, NLS_DATE_FORMAT, INIT_STARTTIME,INIT_ENDTIME,INIT_SCN,SCN_STEP_SIZE,SCHEMA_NAME] as List }

    @Override
    String getIdentifier() { return 'AnalyzeLogMinerProcessor-InvokeScriptedProcessor' }
    
    void setLogger(ComponentLog logger){
        log = logger
    }
}
processor = new AnalyzeLogMinerProcessor()