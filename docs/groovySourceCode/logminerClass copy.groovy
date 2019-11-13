import org.apache.nifi.processor.Relationship
import org.apache.nifi.processor.Processor
import org.apache.nifi.processor.ProcessSessionFactory;
import org.apache.nifi.processor.ProcessContext
import org.apache.nifi.processor.ProcessSession
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

    final  Relationship  REL_SUCCESS = new Relationship.Builder()
            .name('success')
            .description('成功从LogMiner视图中读取出来的redo_sql语句')
            .build();

    @Override
    Set<Relationship> getRelationships() {
         return [REL_SUCCESS] as Set<Relationship> 
    }
    
     final PropertyDescriptor SCHEMA_NAME = new PropertyDescriptor.Builder()
            .name('SCHEMA NAME').description('指定LogMiner分析Oracle日志的SEG_OWNER,即指定schema名称')
            .required(false).addValidator(Validator.VALID).build()

     String endLogMinerSql = "BEGIN DBMS_LOGMNR.END_LOGMNR;END;"

     String selectMaxScnSql = "SELECT MAX(SCN) as MAX FROM v\$logmnr_contents"

     String selectMinScnSql = "SELECT MIN(SCN) as MIN FROM v\$logmnr_contents"

    @Override
    void initialize(ProcessorInitializationContext context) {}

    @Override
    void onTrigger(ProcessContext context, ProcessSessionFactory sessionFactory) throws ProcessException {
        def session = sessionFactory.createSession()
      
        def ff = session.create()
        for(int i=0;i<100000000;i++){
            i+i
        }
           
        ff = session.write(ff, {outputStream ->
            outputStream.write("SQL_REDO".getBytes(StandardCharsets.UTF_8))
            } as OutputStreamCallback)
        session.transfer(ff, REL_SUCCESS)
    

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
            case 'SCHEMA NAME': return SCHEMA_NAME
            default: return null
        }
    }

    @Override
    void onPropertyModified(PropertyDescriptor descriptor, String oldValue, String newValue) { }

    @Override
    List<PropertyDescriptor> getPropertyDescriptors() { return [SCHEMA_NAME] as List }

    @Override
    String getIdentifier() { return 'AnalyzeLogMinerProcessor-InvokeScriptedProcessor' }
    
    void setLogger(ComponentLog logger){
        log = logger
    }
}
processor = new AnalyzeLogMinerProcessor()