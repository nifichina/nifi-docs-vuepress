# Oracle(12c)使用LogMiner分析Redo日志文件
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com** 
***
内容：

官方文档(https://docs.oracle.com/database/121/SUTIL/GUID-3417B738-374C-4EE3-B15C-3A66E01AE2B5.htm#SUTIL019)

Oracle LogMiner是Oracle数据库的一部分，它允许你通过SQL接口在线查询和归档Redo日志文件。Redo日志文件包含关于数据库活动历史的信息。

## LogMiner Benefits

对用户数据或数据库字典所做的所有更改都记录在Oracle redo日志文件中，以便可以执行数据库恢复操作。

由于LogMiner为Redo 日志文件提供了定义明确，易于使用且全面的关系接口，因此它既可以用作功能强大的数据审核工具，又可以用作复杂的数据分析工具。以下列表描述了LogMiner的一些关键功能：

* 查明数据库何时发生了逻辑损坏（例如在应用程序级别发生的错误）。这些错误可能包括以下错误：由于WHERE子句中的值不正确而删除了错误的行，使用不正确的值更新了行，删除了错误的索引等等。例如，用户应用程序可能会错误地更新数据库，以使所有员工的工资增加100％，而不是增加10％，或者数据库管理员（DBA）可能会意外删除关键系统表。重要的是准确知道何时发生错误，以便知道何时启动基于时间或基于更改的恢复。这使我们可以将数据库还原到损坏之前的状态。更加详细的参阅[Querying V\$LOGMNR_CONTENTS Based on Column Values](#Querying-V$LOGMNR_CONTENTS-Based-on-Column-Values)。

* 确定在事务级别执行细粒度恢复所需采取的操作。如果你完全理解并考虑了现有的依赖关系，则可以执行特定于表的撤消操作以将表返回到其原始状态。这是通过应用LogMiner提供的特定于表的重建SQL语句来实现的。更加详细的参阅[Scenario 1: Using LogMiner to Track Changes Made by a Specific User](#Scenario-1:-Using-LogMiner-to-Track-Changes-Made-by-a-Specific-User)。

    通常，您必须将表还原到以前的状态，然后应用存档的重做日志文件将其前滚。

* 通过趋势分析进行性能调整和容量规划。您可以确定哪些表有最多的更新和插入。该信息提供了有关磁盘历史访问统计信息，可用于调整目的。有关示例，请参见["Scenario 2: Using LogMiner to Calculate Table Access Statistics](Scenario-2:-Using-LogMiner-to-Calculate-Table-Access-Statistics)

* 执行后审核。LogMiner可用于跟踪在数据库上执行的任何数据操作语言（DML）和数据定义语言（DDL）语句，和它们的执行顺序以及执行者。（但是，要使用LogMiner达到此目的，您需要了解事件发生的时间，以便可以指定适当的日志进行分析；否则，您可能必须挖掘大量的Redo日志文件，这可能需要长时间。考虑将LogMiner用作审核数据库使用情况的补充活动。有关数据库审核的信息，请参阅[Oracle数据库管理员指南](https://docs.oracle.com/database/121/ADMIN/secure.htm#ADMIN11241)。

## Introduction to LogMiner

### LogMiner Configuration

你应该熟悉LogMiner配置中的四个基本对象：源数据库(source database)，挖掘数据库(mining database)，LogMiner词典(LogMiner dictionary)以及包含感兴趣数据的Redo日志文件(redo log files)：

* 源数据库是生成您希望LogMiner分析的所有重做日志文件的数据库。

* 挖掘数据库是LogMiner执行分析时使用的数据库。

* LogMiner字典允许LogMiner在显示您请求的重做日志数据时提供表名和列名，而不是内部对象id。

    LogMiner使用字典将内部对象标识符和数据类型转换为对象名称和外部数据格式。如果没有字典，LogMiner将返回内部对象id并以二进制数据的形式显示数据。

    例如，考虑以下SQL语句:

    ```sql
    INSERT INTO HR.JOBS(JOB_ID, JOB_TITLE, MIN_SALARY, MAX_SALARY)  VALUES('IT_WT','Technical Writer', 4000, 11000);
    ```

    没有字典，LogMiner会显示:

    ```sql
    insert into "UNKNOWN"."OBJ# 45522"("COL 1","COL 2","COL 3","COL 4") values
    (HEXTORAW('45465f4748'),HEXTORAW('546563686e6963616c20577269746572'),
    HEXTORAW('c229'),HEXTORAW('c3020b'));
    ```

* 重做日志文件包含对数据库或数据库字典所做的更改。


### Directing LogMiner Operations and Retrieving Data of Interest

你可以直接使用LogMiner`DBMS_LOGMNR` and `DBMS_LOGMNR_D` PL/SQL程序包, 并使用 `V$LOGMNR_CONTENTS`视图, 如下:


1.  指定LogMiner字典.

    使用`DBMS_LOGMNR_D.BUILD`程序生成或者当启动LogMiner(第三步)时指定数据字典，或者同时使用。具体取决于你想使用哪种数据字典。

2.  指定要分析的Redo日志列表

    使用`DBMS_LOGMNR.ADD_LOGFILE`程序添加或者当启动LogMiner(第三步)时自动创建要分析的日志文件列表

3.  启动LogMiner.

    使用 `DBMS_LOGMNR.START_LOGMNR`程序 .

4.  获取想要的数据.

    查询`V$LOGMNR_CONTENTS`视图.

5.  结束LogMiner会话.

    使用`DBMS_LOGMNR.END_LOGMNR`程序.

你必须拥有`EXECUTE_CATALOG_ROLE`角色和 `LOGMINING`的权限去查询`V$LOGMNR_CONTENTS`视图和使用LogMiner PL/SQL 程序包 .

注意:

在由Oracle RAC数据库生成的归档日志中挖掘指定时间或感兴趣的SCN范围时，必须确保已从该时间段或SCN范围内处于活动状态的所有重做线程指定了所有归档日志。如果您无法执行此操作，则所有V$LOGMNR_CONTENTS返回部分结果的查询都将仅返回部分结果（基于通过该DBMS_LOGMNR.ADD_LOGFILE过程指定给LogMiner的存档日志）。使用该CONTINUOUS_MINE选项在源数据库中挖掘归档日志时，此限制也有效。CONTINUOUS_MINE如果没有启用或禁用线程，则仅应在Oracle RAC数据库上使用。

也可以看看一个使用LogMiner的例子[Steps in a Typical LogMiner Session](https://docs.oracle.com/database/121/SUTIL/GUID-6609EBA2-B2D7-4EAE-8344-A1F6C0A24760.htm)

您可以使用 DBMS_LOGMNR 和 DBMS_LOGMNR_D PL / SQL程序包，并使用 V$LOGMNR_CONTENTS 视图如下：

指定LogMiner字典。
使用 DBMS_LOGMNR_D.BUILD 在启动LogMiner时（在第3步中）或同时指定两者，这取决于您打算使用的字典类型。

指定重做日志文件列表以进行分析。
使用 DBMS_LOGMNR.ADD_LOGFILE 步骤，或指示LogMiner在启动LogMiner时自动创建要分析的日志文件列表（在步骤3中）。

启动LogMiner。
使用 DBMS_LOGMNR.START_LOGMNR 程序。

请求感兴趣的重做数据。
查询V$LOGMNR_CONTENTS视图。

结束LogMiner会话。
使用 DBMS_LOGMNR.END_LOGMNR 程序。

您必须具有查询视图和使用LogMiner PL / SQL包的EXECUTE_CATALOG_ROLE角色和LOGMINING特权V$LOGMNR_CONTENTS。

注意：

在由Oracle RAC数据库生成的归档日志中挖掘指定时间或感兴趣的SCN范围时，必须确保已从该时间段或SCN范围内处于活动状态的所有重做线程指定了所有归档日志。如果您无法执行此操作，则所有V$LOGMNR_CONTENTS返回部分结果的查询都将仅返回部分结果（基于通过该DBMS_LOGMNR.ADD_LOGFILE过程指定给LogMiner的存档日志）。使用该CONTINUOUS_MINE选项在源数据库中挖掘归档日志时，此限制也有效。CONTINUOUS_MINE如果没有启用或禁用线程，则仅应在Oracle RAC数据库上使用。

也可以看看：

有关使用LogMiner的示例，请参见 [典型LogMiner会话中的步骤](https://docs.oracle.com/database/121/SUTIL/GUID-6609EBA2-B2D7-4EAE-8344-A1F6C0A24760.htm)

## Using LogMiner in a CDB

LogMiner可以在多租户容器数据库(CDB)中使用，但是下面的小节讨论了在CDB中使用LogMiner与在非CDB中使用LogMiner时需要注意的一些区别:

### LogMiner V$ Views and DBA Views in a CDB

在CDB中，LogMiner用于显示有关在系统中运行的LogMiner会话的信息的视图包含一个名为CON_ID的附加列。此列标识与显示其信息的会话相关联的容器ID。当从可插拔数据库(PDB)查询视图时，只显示与数据库相关的信息。以下视图受此新行为影响:

1.  `V$LOGMNR_DICTIONARY_LOAD`

2.  `V$LOGMNR_LATCH`

3.  `V$LOGMNR_PROCESS`

4.  `V$LOGMNR_SESSION`

5.  `V$LOGMNR_STATS`

为了支持CDBs,  除了CON_ID之外`V$LOGMNR_CONTENTS`视图还有其他几个新列 [The V$LOGMNR_CONTENTS View in a CDB](https://docs.oracle.com/database/121/SUTIL/GUID-0D154805-40CB-47B8-B2D6-8CD86FBA9DC8.htm)".

以下DBA视图具有类似的CDB视图，其名称以CDB开头。

DBA View                | CDB_ View              
----------------------- | -----------------------
`DBA_LOGMNR_LOG`        | `CDB_LOGMNR_LOG`       
`DBA_LOGMNR_PURGED_LOG` | `CDB_LOGMNR_PURGED_LOG`
`DBA_LOGMNR_SESSION`    | `CDB_LOGMNR_SESSION`   

DBA视图只显示与查询它们的容器中定义的会话相关的信息。

CDB视图包含一个附加的CON_ID列，它标识给定行所代表数据的容器。从根目录查询CDB视图时，可以使用它们查看所有容器的信息。

### The V$LOGMNR_CONTENTS View in a CDB

在CDB中，`V$LOGMNR_CONTENTS`视图及其相关函数被限制在根数据库中。为支持CDBs，在视图中新增了几列:

* `CON_ID` - 包含与执行查询的容器相关联的ID。因为`V$LOGMNR_CONTENTS`被限制在根数据库中，所以当在CDB上执行查询时，该列返回一个值1。

* `SRC_CON_NAME` - PDB的名字。此信息仅在使用LogMiner字典进行挖掘时可用。

* `SRC_CON_ID` - 生成重做记录的PDB的容器ID。此信息仅在使用LogMiner字典进行挖掘时可用。

* `SRC_CON_DBID` - PDB标识符。此信息仅在使用当前LogMiner字典进行挖掘时可用。

* `SRC_CON_GUID` - 包含与PDB关联的GUID。此信息仅在使用当前LogMiner字典进行挖掘时可用。

在信息没有意义的情况下，这些列可能并不总是返回值。当在非cdb中进行挖掘时，SRC_CON_xxx列为空。

### Enabling Supplemental Logging in a CDB

在CDB中，启用和禁用数据库范围的补充日志记录的语法与在非CDB数据库中相同:

```sql
ALTER DATABASE [ADD|DROP] SUPPLEMENTAL LOG DATA ...
```

注意:

* 在CDB中，从`CDB$ROOT`启用的补充日志记录级别在整个CDB中启用。

* 如果至少在`CDB$ROOT`中启用了最低限度的补充日志记录，那么可以在PDB级别启用额外的补充日志记录级别。

* 在PDB级别上不能禁用`CDB$ROOT`在CDB级别启用的补充日志记录级别。

* 从`CDB$ROOT`中删除所有补充日志记录将禁用整个CDB的所有补充日志记录，而不考虑以前的PDB级别设置。

从CREATE TABLE和ALTER TABLE语句开始的附加日志操作可以在根数据库或PDB中执行，只影响它们所应用的表。

要管理多租户环境，您必须具有CDB_DBA角色。

获取更加详细信息请参考:

* [Oracle Database Concepts](https://docs.oracle.com/database/121/CNCPT/cdblogic.htm#CNCPT89249) for more information about CDBs

* [Oracle Database Reference](https://docs.oracle.com/database/121/REFRN/GUID-8865F65B-EF6D-44A5-B0A1-3179EFF0C36A.htm#REFRN002) for more information about views

* [Oracle Database Security Guide](https://docs.oracle.com/database/121/DBSEG/release_changes.htm#DBSEG800) for more information about privileges and roles in CDBs and PDBs

## LogMiner Dictionary Files and Redo Log Files

在开始使用LogMiner之前，了解LogMiner如何使用LogMiner字典文件(或多个文件)和重做日志文件是很重要的。这将帮助您获得准确的结果并计划系统资源的使用。

### LogMiner Dictionary Options

当ogMiner返回重做数据时，它需要一个字典来将对象id转换成对象名。LogMiner提供了三个提供字典的选项:

#### Using the Online Catalog

要指示LogMiner使用当前数据库中使用的字典，在启动LogMiner时指定源数据库数据字典，如下所示:
```sql
EXECUTE DBMS_LOGMNR.START_LOGMNR(OPTIONS => DBMS_LOGMNR.DICT_FROM_ONLINE_CATALOG);
```
除了使用源数据库数据字典分析联机重做日志文件外，如果您在生成归档重做日志文件的同一系统上，还可以使用源数据库数据字典分析归档重做日志文件。

源数据库数据字典包含关于数据库的最新信息，可能是开始分析的最快方法。因为更改重要表的DDL操作比较少见，所以源数据库数据字典通常包含分析所需的信息。

但是，请记住，源数据库数据字典只能重构在表的最新版本上执行的SQL语句。一旦表被更改，源数据库数据字典就不再反映表的前一个版本。这意味着LogMiner将无法重构在表的前一个版本上执行的任何SQL语句。相反，LogMiner在`V$LOGMNR_CONTENTS`视图的SQL_REDO列中生成不可执行的SQL(包括二进制值的十六进制到原始格式)，类似于下面的示例:

```sql
insert into HR.EMPLOYEES(col#1, col#2) values (hextoraw('4a6f686e20446f65'),
hextoraw('c306'));"
```
联机目录选项要求数据库是打开的。源数据库数据字典对于DBMS_LOGMNR.START_LOGMNR的DDL_DICT_TRACKING选项无效。

Oracle建议，当您可以访问创建重做日志文件的源数据库时，以及在预期不会更改相关表中的列定义时，使用此选项。这是最有效和最容易使用的选择。

#### Extracting a LogMiner Dictionary to the Redo Log Files

要将LogMiner字典提取到重做日志文件中，必须打开数据库，并且必须启用ARCHIVELOG模式和归档。当字典被提取到重做日志流时，不能执行DDL语句。因此，提取到重做日志文件的字典保证是一致的(而提取到平面文件的字典则不是)。

要将字典信息提取到重做日志文件中，请执行PL/SQL DBMS_LOGMNR_D。使用STORE_IN_REDO_LOGS选项构建过程。不要指定文件名或位置。
```sql
EXECUTE DBMS_LOGMNR_D.BUILD(OPTIONS=> DBMS_LOGMNR_D.STORE_IN_REDO_LOGS);
```

See Also:

* [Oracle Database Administrator's Guide](https://docs.oracle.com/database/121/ADMIN/archredo.htm#ADMIN11332) for more information about `ARCHIVELOG` mode

* [Oracle Database PL/SQL Packages and Types Reference](https://docs.oracle.com/database/121/ARPLS/d_logmnrd.htm#ARPLS66816) for a complete description of `DBMS_LOGMNR_D.BUILD`


将字典提取到重做日志文件的过程确实会消耗数据库资源，但是如果将提取限制在非高峰时间，那么这应该不是问题，而且它比提取到平面文件要快。根据字典的大小，它可能包含在多个重做日志文件中。如果相关的重做日志文件已经存档，那么您可以找出哪些重做日志文件包含提取的字典的开始和结束。为此，查询V$ARCHIVED_LOG视图，如下所示:

```sql
SELECT NAME FROM V$ARCHIVED_LOG WHERE DICTIONARY_BEGIN='YES';
SELECT NAME FROM V$ARCHIVED_LOG WHERE DICTIONARY_END='YES';
```
在准备开始LogMiner会话时，使用ADD_LOGFILE过程指定开始和结束重做日志文件的名称，以及它们之间可能的其他日志。

Oracle建议您定期备份重做日志文件，以便保存信息并在以后使用。理想情况下，这不会涉及任何额外的步骤，因为如果您的数据库得到了正确的管理，那么应该已经有了备份和恢复归档重做日志文件的过程。同样，由于所需的时间，最好在非高峰时间这样做。

Oracle建议，当您不希望访问创建重做日志文件的源数据库时，或者如果您预期将对相关表中的列定义进行更改时，请使用此选项。

#### Extracting the LogMiner Dictionary to a Flat File

当LogMiner字典位于平面文件中时，使用的系统资源要比包含在重做日志文件中时少。Oracle建议您定期备份字典提取，以确保对旧的重做日志文件的正确分析。

要将数据库字典信息提取到平面文件中，使用DBMS_LOGMNR_D。使用STORE_IN_FLAT_FILE选项构建过程。

确保在构建字典时没有发生DDL操作。

以下步骤描述如何将字典提取到平面文件中。步骤1和步骤2是准备步骤。您只需要执行一次，然后就可以根据需要多次将字典解压缩到平面文件中。

1.  DBMS_LOGMNR_D构建过程需要访问一个可以放置字典文件的目录。因为PL/SQL过程通常不访问用户目录，所以必须指定DBMS_LOGMNR_D使用的目录。要指定一个目录，请在初始化参数文件中设置初始化参数UTL_FILE_DIR。例如，要将UTL_FILE_DIR设置为使用/oracle/database作为字典文件所在的目录，请在初始化参数文件中放置以下内容:

    ```sql
    UTL_FILE_DIR = /oracle/database
    ```

    请记住，要使初始化参数文件的更改生效，必须停止并重新启动数据库。

2.  如果数据库已关闭，则使用SQL*Plus挂载并打开要分析其重做日志文件的数据库。例如，输入SQL STARTUP命令挂载并打开数据库:

    ```sql
    STARTUP
    ```

3.  执行PL/SQL过程DBMS_LOGMNR_D.BUILD来指定字典的文件名和文件的目录路径名。这个过程创建字典文件。例如，输入以下内容来在`/oracle/database`目录中创建`dictionary.ora`：

    ```sql
    EXECUTE DBMS_LOGMNR_D.BUILD('dictionary.ora', - 
       '/oracle/database/', -
        DBMS_LOGMNR_D.STORE_IN_FLAT_FILE);
    ```

    您还可以只指定文件名和位置，而不需要指定STORE_IN_FLAT_FILE选项。结果是一样的。




这个选项是为了向后兼容以前的版本而保留的。此选项不保证事务一致性。Oracle建议您使用在线目录或从重做日志文件中提取字典。

如下图显示一个决策树，根据您的情况帮助您选择LogMiner字典。

[](./img/logminer/1.png)

### Redo Log File Options

要在重做日志文件中挖掘数据，LogMiner需要关于要挖掘哪些重做日志文件的信息。在这些重做日志文件中对数据库所做的更改将通过`V$LOGMNR_CONTENTS`视图传递给你。

您可以指示LogMiner自动地、动态地创建要分析的重做日志文件列表，或者您可以显式地指定要分析的重做日志文件列表，如下所示:

1.  Automatically

   如果在源数据库上使用LogMiner，则可以指示LogMiner自动查找和创建用于分析的重做日志文件列表。使用DBMS_LOGMNR启动LogMiner时，请使用CONTINUOUS_MINE选项。START_LOGMNR过程，并指定时间或SCN范围。虽然本例指定了在线目录中的字典，但是任何LogMiner字典都可以使用。

    注意:CONTINUOUS_MINE选项要求挂载数据库并启用归档。

    LogMiner将使用数据库控制文件查找并将满足指定时间或SCN范围的重做日志文件添加到LogMiner重做日志文件列表中。例如:

    ```sql
    ALTER SESSION SET NLS_DATE_FORMAT = 'DD-MON-YYYY HH24:MI:SS';
    EXECUTE DBMS_LOGMNR.START_LOGMNR( -
       STARTTIME => '01-Jan-2012 08:30:00', -
       ENDTIME => '01-Jan-2012 08:45:00', -
       OPTIONS => DBMS_LOGMNR.DICT_FROM_ONLINE_CATALOG + -
       DBMS_LOGMNR.CONTINUOUS_MINE);
    ```

    (为了避免在对DBMS_LOGMNR的PL/SQL调用中指定日期格式。START_LOGMNR过程，本例首先使用SQL ALTER会话集NLS_DATE_FORMAT语句。)

    您还可以使用DBMS_LOGMNR指定一个重做日志文件，从而指示LogMiner自动构建要分析的重做日志文件列表。然后在启动LogMiner时指定CONTINUOUS_MINE选项。然而，前面描述的方法更典型。

2.  Manually

    使用DBMS_LOGMNR。在启动LogMiner之前手动创建重做日志文件列表的ADD_LOGFILE过程。将第一个重做日志文件添加到列表后，随后添加的每个重做日志文件必须来自相同的数据库，并与相同的数据库重做日志SCN相关联。使用此方法时，LogMiner不需要连接到源数据库。

    例如，要启动重做日志文件的新列表，请指定DBMS_LOGMNR的新选项。ADD_LOGFILE PL/SQL过程，表明这是一个新列表的开始。例如，输入以下命令来指定/oracle/logs/log1.f:

    ```sql
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
       LOGFILENAME => '/oracle/logs/log1.f', -
       OPTIONS => DBMS_LOGMNR.NEW);
    ```

    如果需要，可以通过指定PL/SQL DBMS_LOGMNR的ADDFILE选项来添加更多的重做日志文件。ADD_LOGFILE过程。例如，输入以下内容来添加/oracle/logs/log2.f:

    ```sql
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
       LOGFILENAME => '/oracle/logs/log2.f', -
       OPTIONS => DBMS_LOGMNR.ADDFILE);
    ```

    要确定在当前LogMiner会话中分析哪些重做日志文件，可以查询`V$LOGMNR_LOGS`视图，其中包含每个重做日志文件的一行。

## Starting LogMiner

调用`DBMS_LOGMNR.START_LOGMNR`来启动LogMiner。因为DBMS_LOGMNR提供了可用的选项。START_LOGMNR过程允许你控制输出到`V$LOGMNR_CONTENTS`视图，在查询`V$LOGMNR_CONTENTS` 视图之前执行必须调用`DBMS_LOGMNR.START_LOGMNR`。

当你启动LogMiner，你可以:

* 指定LogMiner应该如何过滤它返回的数据(例如，通过开始和结束时间或SCN值)

* 指定格式化LogMiner返回的数据的选项

* 指定要使用的LogMiner字典

下面的列表是LogMiner设置的摘要，您可以使用DBMS_LOGMNR.START_LOGMNR的OPTIONS参数指定这些设置。

* `DICT_FROM_ONLINE_CATALOG` — See "[Using the Online Catalog](https://docs.oracle.com/database/121/SUTIL/GUID-1D510A2F-4CE8-4D69-AB18-CDD58FB3458C.htm)"

* `DICT_FROM_REDO_LOGS` — See "[Start LogMiner](https://docs.oracle.com/database/121/SUTIL/GUID-319446A8-6FEC-42CE-A6A4-582CA65377CF.htm)"

* `CONTINUOUS_MINE` — See "[Redo Log File Options](https://docs.oracle.com/database/121/SUTIL/GUID-C50E9C76-ABA1-4A27-AAB4-C65479EDFDE0.htm)"

* `COMMITTED_DATA_ONLY` — See "[Showing Only Committed Transactions](https://docs.oracle.com/database/121/SUTIL/GUID-6A2398F7-D484-495A-8AD2-0A6B34C03536.htm)"

* `SKIP_CORRUPTION` — See "[Skipping Redo Corruptions](https://docs.oracle.com/database/121/SUTIL/GUID-FAA95EFA-4AC0-4F5B-BE30-D79A9AC4C6B9.htm)"

* `NO_SQL_DELIMITER` — See "[Formatting Reconstructed SQL Statements for Re-execution](https://docs.oracle.com/database/121/SUTIL/GUID-C2B8C741-9544-4A46-818E-16B233570599.htm)"

* `PRINT_PRETTY_SQL` — See "[Formatting the Appearance of Returned Data for Readability](https://docs.oracle.com/database/121/SUTIL/GUID-95841FA7-BE3F-4B78-B52B-47D5F6ED5623.htm)"

* `NO_ROWID_IN_STMT` — See "[Formatting Reconstructed SQL Statements for Re-execution](https://docs.oracle.com/database/121/SUTIL/GUID-C2B8C741-9544-4A46-818E-16B233570599.htm)"

* `DDL_DICT_TRACKING` — See "[Tracking DDL Statements in the LogMiner Dictionary](https://docs.oracle.com/database/121/SUTIL/GUID-56743517-A0C0-4CCD-9D20-2883AFB5683B.htm)"


当执行`DBMS_LOGMNR.START_LOGMNR`过程, LogMiner会检测确保你指定的参数是有效的并且重做日志和数据字典是存在可获得的。 在您查询视图之前，`V$LOGMNR_CONTENTS`视图不会被填充, 详见[How the V$LOGMNR_CONTENTS View Is Populated](https://docs.oracle.com/database/121/SUTIL/GUID-CD389496-1D82-4E39-881F-C0C18355C573.htm).

注意，在调用DBMS_LOGMNR.START_LOGMNR时，参数和选项不是持久的。每次调用DBMS_LOGMNR.START_LOGMNR时，必须指定所有需要的参数和选项(包括SCN和时间范围)。

## Querying V$LOGMNR_CONTENTS for Redo Data of Interest

通过查询`V$LOGMNR_CONTENTS`视图获取我们感兴趣的数据. (注意要有 `SYSDBA` or `LOGMINING` 权限来查询`V$LOGMNR_CONTENTS`.) 这个视图包括了数据库的历史变更信息，包括但不仅限于下列:

* 对数据库的更改类型:插入、更新、删除或DDL(`OPERATION` column).

* 对其进行更改的SCN(`SCN` column).

* 提交更改的SCN (`COMMIT_SCN` column).

* 变更所属的事务 (`XIDUSN`, `XIDSLT`, and `XIDSQN` columns).

* 修改对象对应的表和schema (`SEG_NAME` and `SEG_OWNER` columns).

* 发出DDL或DML语句进行更改的用户的名称(`USERNAME` column).

* 如果更改是由于SQL DML语句造成的，则重构的SQL语句将显示与用于生成重做记录的SQL DML相同(但不一定相同)的SQL DML (`SQL_REDO` column).

* 如果密码是SQL_REDO列中语句的一部分，则对密码进行加密。与DDL语句对应的SQL_REDO列值总是与用于生成redo记录的SQL DDL相同。

* 如果更改是由于SQL DML更改造成的，则重构的SQL语句显示撤消更改所需的SQL DML语句 (`SQL_UNDO` column).

    与DDL语句对应的SQL_UNDO列始终为空。对于某些数据类型和回滚操作，SQL_UNDO列可能也是NULL。

Note:

LogMiner支持透明数据加密(TDE)，`V$LOGMNR_CONTENTS`显示对具有加密列的表执行的DML操作(包括正在更新的加密列)，前提是LogMiner数据字典包含有关对象的元数据，并且Oracle wallet中有适当的主密钥。必须打开wallet，否则`V$LOGMNR_CONTENTS`无法解释相关的重做记录。如果数据库未打开(只读或读写)，则不支持TDE。

See [Oracle Database Advanced Security Guide](https://docs.oracle.com/database/121/ASOAG/asopart1.htm#ASOAG600) for more information about TDE.

Example of Querying `V$LOGMNR_CONTENTS`

假设你想要查找有一个叫Ron的用户对`oe.orders`所做的删除操作，你可以执行一个类似于下面的SQL语句:

```sql
SELECT OPERATION, SQL_REDO, SQL_UNDO
   FROM V$LOGMNR_CONTENTS
   WHERE SEG_OWNER = 'OE' AND SEG_NAME = 'ORDERS' AND
   OPERATION = 'DELETE' AND USERNAME = 'RON';
```

下面是执行SQL查询出来的结果：

```sql
OPERATION   SQL_REDO                        SQL_UNDO

DELETE      delete from "OE"."ORDERS"       insert into "OE"."ORDERS"        
            where "ORDER_ID" = '2413'       ("ORDER_ID","ORDER_MODE",
            and "ORDER_MODE" = 'direct'      "CUSTOMER_ID","ORDER_STATUS",
            and "CUSTOMER_ID" = '101'        "ORDER_TOTAL","SALES_REP_ID",
            and "ORDER_STATUS" = '5'         "PROMOTION_ID")
            and "ORDER_TOTAL" = '48552'      values ('2413','direct','101',
            and "SALES_REP_ID" = '161'       '5','48552','161',NULL);     
            and "PROMOTION_ID" IS NULL  
            and ROWID = 'AAAHTCAABAAAZAPAAN';

DELETE      delete from "OE"."ORDERS"        insert into "OE"."ORDERS"
            where "ORDER_ID" = '2430'        ("ORDER_ID","ORDER_MODE",
            and "ORDER_MODE" = 'direct'       "CUSTOMER_ID","ORDER_STATUS",
            and "CUSTOMER_ID" = '101'         "ORDER_TOTAL","SALES_REP_ID",
            and "ORDER_STATUS" = '8'          "PROMOTION_ID")
            and "ORDER_TOTAL" = '29669.9'     values('2430','direct','101',
            and "SALES_REP_ID" = '159'        '8','29669.9','159',NULL);
            and "PROMOTION_ID" IS NULL 
            and ROWID = 'AAAHTCAABAAAZAPAAe';
```

输出显示Ron从`oe.orders`表删除了两条数据. 他重构的SQL语句与Ron发出的实际语句是等价的，但不一定完全相同。. 造成这种差异的原因是原始的WHERE子句没有记录在重做日志文件中，所以LogMiner只能单独显示已删除(或更新或插入)的行。

T因此，即使一条DELETE语句可能负责删除这两行，`V$LOGMNR_CONTENTS`中的输出也不能反映这一事实。 实际执行的`DELETE`可能是 `DELETE FROM OE.ORDERS WHERE CUSTOMER_ID ='101`' 或者是`DELETE FROM OE.ORDERS WHERE PROMOTION_ID = NULL.`

### How the V$LOGMNR_CONTENTS View Is Populated

`V$LOGMNR_CONTENTS`与其他视图不同，不是反应表中数据关系，而是反应Redo日志的关系表示。

LogMiner仅在响应针对它的查询时填充视图。在查询`V$LOGMNR_CONTENTS`之前，必须成功启动LogMiner。

当对`V$LOGMNR_CONTENTS`视图执行select操作时，将按顺序读取重做日志文件。来自重做日志文件的翻译信息在`V$LOGMNR_CONTENTS`视图中以行形式返回。这将一直持续到满足在启动时指定的筛选条件或到达重做日志文件的结尾。

在某些情况下，`V$LOGMNR_CONTENTS`中的某些列可能不会被填充。例如：

* 对于OPERATION列的值为DDL的行，不会填充TABLE_SPACE列。这是因为DDL可以在多个表空间上操作。例如，可以使用跨越多个表空间的多个分区创建一个表;因此，填充列并不准确。
* LogMiner不为临时表生成SQL redo或SQL undo,  SQL_REDO列会包含"/* No SQL_REDO for temporary tables */"字符串，SQL_UNDO 列会包含"/* No SQL_UNDO for temporary tables */"字符串.

LogMiner以SCN顺序返回所有行，除非您使用COMMITTED_DATA_ONLY选项指定只检索提交的事务。SCN顺序是媒体恢复中常用的顺序。

See Also:

[Showing Only Committed Transactions](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-6A2398F7-D484-495A-8AD2-0A6B34C03536 "When using the COMMITTED_DATA_ONLY option to DBMS_LOGMNR.START_LOGMNR, only rows belonging to committed transactions are shown in the V$LOGMNR_CONTENTS view.") for more information about the `COMMITTED_DATA_ONLY` option to `DBMS_LOGMNR.START_LOGMNR`


Note:

因为LogMiner只在响应查询时填充V$LOGMNR_CONTENTS视图，而不将请求的数据存储在数据库中，所以以下是正确的:

* 每次查询`V$LOGMNR_CONTENTS`时，LogMiner都会分析您请求的数据的重做日志文件。

* 查询消耗的内存量不依赖于必须返回满足查询的行数。

* 返回请求的数据所需的时间取决于为找到该数据而必须挖掘的重做日志数据的数量和类型。

基于上面的注意事项，如果你需要保持查询结果以便日后分析，Oracle建议在实体表保存从`V$LOGMNR_CONTENTS`视图中查询到的结果，特别是当查询返回的数据量与LogMiner必须分析才能提供数据的重做数据量相比很小时。

### Querying V$LOGMNR_CONTENTS Based on Column Values

LogMiner允许您基于列值进行查询。

例如你可以查询所有对hr.employees做的salary增长超过一定值的update操作，这样的数据可以用来分析系统行为和执行审计任务。

使用两个挖掘函数从重做日志文件中提取数据:DBMS_LOGMNR。MINE_VALUE DBMS_LOGMNR.COLUMN_PRESENT。V$LOGMNR_CONTENTS视图中的REDO_VALUE和UNDO_VALUE列提供了对这些mine函数的支持。

下面是一个示例，演示如何使用MINE_VALUE函数来选择hr的所有更新。将工资栏增加到原来的两倍以上的员工:

```sql
SELECT SQL_REDO FROM V$LOGMNR_CONTENTS
   WHERE
   SEG_NAME = 'EMPLOYEES' AND
   SEG_OWNER = 'HR' AND
   OPERATION = 'UPDATE' AND
   DBMS_LOGMNR.MINE_VALUE(REDO_VALUE, 'HR.EMPLOYEES.SALARY') >
   2*DBMS_LOGMNR.MINE_VALUE(UNDO_VALUE, 'HR.EMPLOYEES.SALARY');
```
如下例所示，MINE_VALUE函数有两个参数:

* 第一个参数指定是挖掘数据的redo (REDO_VALUE)部分还是undo (UNDO_VALUE)部分。数据的重做部分是插入、更新或删除操作后列中的数据;数据的撤消部分是插入、更新或删除操作之前列中的数据。将REDO_VALUE视为新值，将UNDO_VALUE视为旧值可能会有所帮助。

* 第二个参数是一个字符串，它指定要挖掘的列的完全限定名(在本例中是hr.employee .salary)。MINE_VALUE函数总是返回一个可以转换回原始数据类型的字符串。

#### The Meaning of NULL Values Returned by the MINE_VALUE Function

描述MINE_VALUE函数返回的空值的含义。

如果MINE_VALUE函数返回一个空值，那么它可以表示:

* 指定的列在数据的重做或撤消部分中不存在。

* 指定的列是存在的，并且有一个空值。

要区分这两种情况，可以使用DBMS_LOGMNR.COLUMN_PRESENT函数，如果该列出现在数据的重做或撤消部分，则该函数返回1。否则，它返回0。例如，假设您希望找出修改salary列中的值的增量和相应的事务标识符。你可以发出以下SQL查询:

```sql
SELECT 
  (XIDUSN || '.' || XIDSLT || '.' || XIDSQN) AS XID,
  (DBMS_LOGMNR.MINE_VALUE(REDO_VALUE, 'HR.EMPLOYEES.SALARY') -
   DBMS_LOGMNR.MINE_VALUE(UNDO_VALUE, 'HR.EMPLOYEES.SALARY')) AS INCR_SAL
   FROM V$LOGMNR_CONTENTS
   WHERE
   OPERATION = 'UPDATE' AND
   DBMS_LOGMNR.COLUMN_PRESENT(REDO_VALUE, 'HR.EMPLOYEES.SALARY') = 1 AND
   DBMS_LOGMNR.COLUMN_PRESENT(UNDO_VALUE, 'HR.EMPLOYEES.SALARY') = 1;
```

#### Usage Rules for the MINE_VALUE and COLUMN_PRESENT Functions

描述应用于MINE_VALUE和COLUMN_PRESENT函数的使用规则。

具体来说:
* 它们只能在LogMiner会话中使用。
* 它们必须在`V$LOGMNR_CONTENTS`视图的select操作上下文中启动。
* 它们不支持LONG、LONG RAW、CLOB、BLOB、NCLOB、ADT或集合数据类型。

#### Restrictions When Using the MINE_VALUE Function To Get an NCHAR Value

描述使用MINE_VALUE函数时的限制。

如果DBMS_LOGMNR.MINE_VALUE函数用于获取一个NCHAR值，该值包含在数据库字符集中没有找到的字符，然后这些字符作为数据库字符集的替换字符(例如，反问号)返回。

### Querying V$LOGMNR_CONTENTS Based on XMLType Columns and Tables

(XMLType也不常用 就不一一翻译)
LogMiner支持为XMLType列生成重做。在兼容性设置为11.0.0.0或更高的情况下生成重做时，支持将XMLType数据存储为CLOB。

作为对象关系和二进制XML存储的XMLType数据支持在11.2.0.3或更高的兼容性设置下重新生成。

LogMiner根据XMLType存储以不同的方式在`V$LOGMNR_CONTENTS`中显示SQL_REDO。在所有情况下，SQL_REDO列的内容和STATUS列都需要仔细检查，并且通常需要重新组装才能生成SQL或PL/SQL语句来重新执行更改。在某些情况下，可能无法使用SQL_REDO数据来构造这样的更改。以下小节中的示例基于存储为CLOB的XMLType，这通常是用于重建完整行更改的最简单方法。

Note:存储为CLOB的XMLType数据在Oracle数据库12c版本1(12.1)中被弃用。

Querying `V$LOGMNR_CONTENTS` For Changes to Tables With XMLType Columns

The example in this section is for a table named `XML_CLOB_COL_TAB` that has the following columns:

* f1 `NUMBER`

* f2 `VARCHAR2(100)`

* f3 `XMLTYPE`

* f4 `XMLTYPE`

* f5 `VARCHAR2(10)`

Assume that a LogMiner session has been started with the logs and with the `COMMITED_DATA_ONLY` option. The following query is executed against `V$LOGMNR_CONTENTS` for changes to the `XML_CLOB_COL_TAB` table.

```sql
SELECT OPERATION, STATUS, SQL_REDO FROM V$LOGMNR_CONTENTS 
  WHERE SEG_OWNER = 'SCOTT' AND TABLE_NAME = 'XML_CLOB_COL_TAB';
```

The query output looks similar to the following:

```sql
OPERATION         STATUS  SQL_REDO

INSERT            0       insert into "SCOTT"."XML_CLOB_COL_TAB"("F1","F2","F5") values
                             ('5010','Aho40431','PETER')

XML DOC BEGIN     5       update "SCOTT"."XML_CLOB_COL_TAB" a set a."F3" = XMLType(:1)
                             where a."F1" = '5010' and a."F2" = 'Aho40431' and a."F5" = 'PETER'

XML DOC WRITE     5       XML Data

XML DOC WRITE     5       XML Data

XML DOC WRITE     5       XML Data

XML DOC END       5

```

In the `SQL_REDO` columns for the `XML DOC WRITE` operations there will be actual data for the XML document. It will not be the string 'XML Data'.

This output shows that the general model for an insert into a table with an `XMLType` column is the following:

1.  An initial insert with all of the scalar columns.

2.  An `XML DOC BEGIN `operation with an update statement that sets the value for one `XMLType` column using a bind variable.

3.  One or more `XML DOC WRITE` operations with the data for the XML document.

4.  An `XML DOC END` operation to indicate that all of the data for that XML document has been seen.

5.  If there is more than one `XMLType` column in the table, then steps 2 through 4 will be repeated for each `XMLType` column that is modified by the original DML.

If the XML document is not stored as an out-of-line column, then there will be no `XML DOC BEGIN`, `XML DOC WRITE`, or `XML DOC END` operations for that column. The document will be included in an update statement similar to the following:

```sql
OPERATION   STATUS         SQL_REDO

UPDATE      0              update "SCOTT"."XML_CLOB_COL_TAB" a
                           set a."F3" = XMLType('<?xml version="1.0"?>
                           <PO pono="1">
                           <PNAME>Po_99</PNAME> 
                           <CUSTNAME>Dave Davids</CUSTNAME> 
                           </PO>') 
                           where a."F1" = '5006' and a."F2" = 'Janosik' and a."F5" = 'MMM' 
```

<!-- class="section" -->

Querying V$LOGMNR_CONTENTS For Changes to XMLType Tables

DMLs to `XMLType` tables are slightly different from DMLs to `XMLType` columns. The XML document represents the value for the row in the `XMLType` table. Unlike the `XMLType` column case, an initial insert cannot be done which is then followed by an update containing the XML document. Rather, the whole document must be assembled before anything can be inserted into the table.

Another difference for `XMLType` tables is the presence of the `OBJECT_ID` column. An object identifier is used to uniquely identify every object in an object table. For `XMLType` tables, this value is generated by Oracle Database when the row is inserted into the table. The `OBJECT_ID` value cannot be directly inserted into the table using SQL. Therefore, LogMiner cannot generate `SQL_REDO` which is executable that includes this value.

The `V$LOGMNR_CONTENTS` view has a new `OBJECT_ID` column which is populated for changes to `XMLType` tables. This value is the object identifier from the original table. However, even if this same XML document is inserted into the same `XMLType` table, a new object identifier will be generated. The `SQL_REDO` for subsequent DMLs, such as updates and deletes, on the `XMLType` table will include the object identifier in the `WHERE` clause to uniquely identify the row from the original table.

#### Restrictions When Using LogMiner With XMLType Data

Describes restrictions when using LogMiner with XMLType data.

Mining `XMLType` data should only be done when using the `DBMS_LOGMNR.COMMITTED_DATA_ONLY` option. Otherwise, incomplete changes could be displayed or changes which should be displayed as XML might be displayed as `CLOB` changes due to missing parts of the row change. This can lead to incomplete and invalid `SQL_REDO` for these SQL DML statements.

The `SQL_UNDO` column is not populated for changes to `XMLType` data.

#### Example of a PL/SQL Procedure for Assembling XMLType Data

Example showing a procedure that can be used to mine and assemble XML redo for tables that contain out of line XML data. 

This shows how to assemble the XML data using a temporary LOB. Once the XML document is assembled, it can be used in a meaningful way. This example queries the assembled document for the `EmployeeName` element and then stores the returned name, the XML document and the `SQL_REDO` for the original DML in the `EMPLOYEE_XML_DOCS` table. 

Note:

This procedure is an example only and is simplified. It is only intended to illustrate that DMLs to tables with `XMLType` data can be mined and assembled using LogMiner.

Before calling this procedure, all of the relevant logs must be added to a LogMiner session and `DBMS_LOGMNR.START_LOGMNR()` must be called with the `COMMITTED_DATA_ONLY` option. The `MINE_AND_ASSEMBLE()` procedure can then be called with the schema and table name of the table that has XML data to be mined.

```sql
-- table to store assembled XML documents
create table employee_xml_docs  (
  employee_name         varchar2(100),
  sql_stmt                     varchar2(4000),
  xml_doc                     SYS.XMLType);

-- procedure to assemble the XML documents
create or replace procedure mine_and_assemble(
  schemaname        in varchar2,
  tablename         in varchar2)
AS
  loc_c      CLOB; 
  row_op     VARCHAR2(100); 
  row_status NUMBER; 
  stmt       VARCHAR2(4000);
  row_redo   VARCHAR2(4000);
  xml_data   VARCHAR2(32767 CHAR); 
  data_len   NUMBER; 
  xml_lob    clob;
  xml_doc    XMLType;
BEGIN 

-- Look for the rows in V$LOGMNR_CONTENTS that are for the appropriate schema 
-- and table name but limit it to those that are valid sql or that need assembly
-- because they are XML documents.

 For item in ( SELECT operation, status, sql_redo  FROM v$logmnr_contents
 where seg_owner = schemaname and table_name = tablename
 and status IN (DBMS_LOGMNR.VALID_SQL, DBMS_LOGMNR.ASSEMBLY_REQUIRED_SQL))
 LOOP
    row_op := item.operation;
    row_status := item.status;
    row_redo := item.sql_redo;

     CASE row_op 

          WHEN 'XML DOC BEGIN' THEN 
             BEGIN 
               -- save statement and begin assembling XML data 
               stmt := row_redo; 
               xml_data := ''; 
               data_len := 0; 
               DBMS_LOB.CreateTemporary(xml_lob, TRUE);
             END; 

          WHEN 'XML DOC WRITE' THEN 
             BEGIN 
               -- Continue to assemble XML data
               xml_data := xml_data || row_redo; 
               data_len := data_len + length(row_redo); 
               DBMS_LOB.WriteAppend(xml_lob, length(row_redo), row_redo);
             END; 

          WHEN 'XML DOC END' THEN 
             BEGIN 
               -- Now that assembly is complete, we can use the XML document 
              xml_doc := XMLType.createXML(xml_lob);
              insert into employee_xml_docs values
                        (extractvalue(xml_doc, '/EMPLOYEE/NAME'), stmt, xml_doc);
              commit;

              -- reset
              xml_data := ''; 
              data_len := 0; 
              xml_lob := NULL;
             END; 

          WHEN 'INSERT' THEN 
             BEGIN 
                stmt := row_redo;
             END; 

          WHEN 'UPDATE' THEN 
             BEGIN 
                stmt := row_redo;
             END; 

          WHEN 'INTERNAL' THEN 
             DBMS_OUTPUT.PUT_LINE('Skip rows marked INTERNAL'); 

          ELSE 
             BEGIN 
                stmt := row_redo;
                DBMS_OUTPUT.PUT_LINE('Other - ' || stmt); 
                IF row_status != DBMS_LOGMNR.VALID_SQL then 
                   DBMS_OUTPUT.PUT_LINE('Skip rows marked non-executable'); 
                ELSE 
                   dbms_output.put_line('Status : ' || row_status);
                END IF; 
             END; 

     END CASE;

 End LOOP; 

End;
/

show errors;
```

This procedure can then be called to mine the changes to the `SCOTT.XML_DATA_TAB` and apply the DMLs.

```sql
EXECUTE MINE_AND_ASSEMBLE ('SCOTT', 'XML_DATA_TAB');
```

As a result of this procedure, the `EMPLOYEE_XML_DOCS` table will have a row for each out-of-line XML column that was changed. The `EMPLOYEE_NAME` column will have the value extracted from the XML document and the `SQL_STMT` column and the `XML_DOC` column reflect the original row change.

The following is an example query to the resulting table that displays only the employee name and SQL statement:

```sql
SELECT EMPLOYEE_NAME, SQL_STMT FROM EMPLOYEE_XML_DOCS;

EMPLOYEE_NAME          SQL_STMT                                                                                           

Scott Davis          update "SCOTT"."XML_DATA_TAB" a set a."F3" = XMLType(:1) 
                         where a."F1" = '5000' and a."F2" = 'Chen' and a."F5" = 'JJJ'

Richard Harry        update "SCOTT"."XML_DATA_TAB" a set a."F4" = XMLType(:1)  
                         where a."F1" = '5000' and a."F2" = 'Chen' and a."F5" = 'JJJ'

Margaret Sally       update "SCOTT"."XML_DATA_TAB" a set a."F4" = XMLType(:1)  
                         where a."F1" = '5006' and a."F2" = 'Janosik' and a."F5" = 'MMM'
```

## Filtering and Formatting Data Returned to V$LOGMNR_CONTENTS

LogMiner可以处理大量的信息。您可以限制返回给`V$LOGMNR_CONTENTS`视图的信息，以及它返回的速度。

### Showing Only Committed TransactionsShowing Only Committed Transactions

当将COMMITTED_DATA_ONLY选项用于DBMS_LOGMNR时。START_LOGMNR中，只有属于提交事务的行才显示在`V$LOGMNR_CONTENTS`视图中。

这使您能够过滤回滚的事务、正在进行的事务和内部操作。

要启用此选项，请在启动LogMiner时指定它，如下所示:

```sql
EXECUTE DBMS_LOGMNR.START_LOGMNR(OPTIONS => DBMS_LOGMNR.COMMITTED_DATA_ONLY);
```

当您指定COMMITTED_DATA_ONLY选项时，LogMiner将属于同一事务的所有DML操作分组在一起。事务按提交的顺序返回。

注意:如果指定了COMMITTED_DATA_ONLY选项，并且发出了一个查询，那么LogMiner将在内存中的单个事务中执行所有重做记录，直到LogMiner找到该事务的提交记录。因此，可能会耗尽内存，在这种情况下将返回“内存不足”错误。如果发生这种情况，则必须在不指定COMMITTED_DATA_ONLY选项的情况下重新启动LogMiner并重新发出查询。

默认情况下，LogMiner将显示与所有事务对应的行，并按照它们在重做日志文件中遇到的顺序返回它们。

例如，假设您在没有指定COMMITTED_DATA_ONLY选项的情况下启动LogMiner，然后执行以下查询:

```sql
SELECT (XIDUSN || '.' || XIDSLT || '.' || XIDSQN) AS XID, 
   USERNAME, SQL_REDO FROM V$LOGMNR_CONTENTS WHERE USERNAME != 'SYS' 
   AND SEG_OWNER IS NULL OR SEG_OWNER NOT IN ('SYS', 'SYSTEM');
```
输出如下。提交和未提交的事务都会返回，不同事务的行会交织在一起。
```sql
XID         USERNAME  SQL_REDO

1.15.3045   RON       set transaction read write;
1.15.3045   RON       insert into "HR"."JOBS"("JOB_ID","JOB_TITLE",
                      "MIN_SALARY","MAX_SALARY") values ('9782',
                      'HR_ENTRY',NULL,NULL);
1.18.3046   JANE      set transaction read write;
1.18.3046   JANE      insert into "OE"."CUSTOMERS"("CUSTOMER_ID",
                      "CUST_FIRST_NAME","CUST_LAST_NAME",
                      "CUST_ADDRESS","PHONE_NUMBERS","NLS_LANGUAGE",
                      "NLS_TERRITORY","CREDIT_LIMIT","CUST_EMAIL",
                      "ACCOUNT_MGR_ID") values ('9839','Edgar',
                      'Cummings',NULL,NULL,NULL,NULL,
                       NULL,NULL,NULL);
1.9.3041    RAJIV      set transaction read write;
1.9.3041    RAJIV      insert into "OE"."CUSTOMERS"("CUSTOMER_ID",
                       "CUST_FIRST_NAME","CUST_LAST_NAME","CUST_ADDRESS",
                       "PHONE_NUMBERS","NLS_LANGUAGE","NLS_TERRITORY",
                       "CREDIT_LIMIT","CUST_EMAIL","ACCOUNT_MGR_ID") 
                       values ('9499','Rodney','Emerson',NULL,NULL,NULL,NULL,
                       NULL,NULL,NULL);
1.15.3045    RON       commit;
1.8.3054     RON       set transaction read write;
1.8.3054     RON       insert into "HR"."JOBS"("JOB_ID","JOB_TITLE",
                       "MIN_SALARY","MAX_SALARY") values ('9566',
                       'FI_ENTRY',NULL,NULL);
1.18.3046    JANE      commit;
1.11.3047    JANE      set transaction read write;
1.11.3047    JANE      insert into "OE"."CUSTOMERS"("CUSTOMER_ID",
                       "CUST_FIRST_NAME","CUST_LAST_NAME",
                       "CUST_ADDRESS","PHONE_NUMBERS","NLS_LANGUAGE",
                       "NLS_TERRITORY","CREDIT_LIMIT","CUST_EMAIL",
                       "ACCOUNT_MGR_ID") values ('8933','Ronald',
                       'Frost',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
1.11.3047    JANE      commit;
1.8.3054     RON       commit;
```
现在假设您启动了LogMiner，但是这一次您指定了COMMITTED_DATA_ONLY选项。如果再次执行前面的查询，则输出如下:
```sql
1.15.3045   RON       set transaction read write;
1.15.3045   RON       insert into "HR"."JOBS"("JOB_ID","JOB_TITLE",
                      "MIN_SALARY","MAX_SALARY") values ('9782',
                      'HR_ENTRY',NULL,NULL);
1.15.3045    RON       commit;
1.18.3046   JANE      set transaction read write;
1.18.3046   JANE      insert into "OE"."CUSTOMERS"("CUSTOMER_ID",
                      "CUST_FIRST_NAME","CUST_LAST_NAME",
                      "CUST_ADDRESS","PHONE_NUMBERS","NLS_LANGUAGE",
                      "NLS_TERRITORY","CREDIT_LIMIT","CUST_EMAIL",
                      "ACCOUNT_MGR_ID") values ('9839','Edgar',
                      'Cummings',NULL,NULL,NULL,NULL,
                       NULL,NULL,NULL);
1.18.3046    JANE      commit;
1.11.3047    JANE      set transaction read write;
1.11.3047    JANE      insert into "OE"."CUSTOMERS"("CUSTOMER_ID",
                       "CUST_FIRST_NAME","CUST_LAST_NAME",
                       "CUST_ADDRESS","PHONE_NUMBERS","NLS_LANGUAGE",
                       "NLS_TERRITORY","CREDIT_LIMIT","CUST_EMAIL",
                       "ACCOUNT_MGR_ID") values ('8933','Ronald',
                       'Frost',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
1.11.3047    JANE      commit;
1.8.3054     RON       set transaction read write;
1.8.3054     RON       insert into "HR"."JOBS"("JOB_ID","JOB_TITLE",
                       "MIN_SALARY","MAX_SALARY") values ('9566',
                       'FI_ENTRY',NULL,NULL);
1.8.3054     RON       commit;
```
因为1.15.3045事务的COMMIT语句是在1.18.3046事务的COMMIT语句之前发出的，所以整个1.15.3045事务首先返回。即使1.18.3046事务是在1.15.3045事务之前启动的，也是如此。因为没有为1.9.3041事务发出COMMIT语句，所以没有返回任何事务。

See Also:

See [Examples Using LogMiner](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-40619B3B-8BDF-4D90-B924-5A0F8A631F98 "Examples using LogMiner.") for a complete example that uses the `COMMITTED_DATA_ONLY` option

### Skipping Redo Corruptions

当您将SKIP_CORRUPTION选项用于DBMS_LOGMNR时。START_LOGMNR，在`V$LOGMNR_CONTENTS`视图的选择操作期间，将跳过重做日志文件中的任何损坏。

对于遇到的每个损坏的重做记录，都会返回一行，其中包含OPERATION列中的值ted_blocks、STATUS列中的1343和INFO列中跳过的块的数量。

请注意，跳过的记录可能包括对已损坏块中正在进行的事务的更改;这些更改不会反映在`V$LOGMNR_CONTENTS`视图返回的数据中。

默认情况下，select操作在重做日志文件中遇到第一个损坏时终止。

下面的SQL示例演示了这个选项的工作方式:

```sql
-- Add redo log files of interest.
--
EXECUTE DBMS_LOGMNR.ADD_LOGFILE(-
   logfilename => '/usr/oracle/data/db1arch_1_16_482701534.log' -
   options => DBMS_LOGMNR.NEW);

-- Start LogMiner
--
EXECUTE DBMS_LOGMNR.START_LOGMNR();

-- Select from the V$LOGMNR_CONTENTS view. This example shows corruptions are -- in the redo log files.
-- 
SELECT rbasqn, rbablk, rbabyte, operation, status, info 
   FROM V$LOGMNR_CONTENTS;

ERROR at line 3:
ORA-00368: checksum error in redo log block 
ORA-00353: log corruption near block 6 change 73528 time 11/06/2011 11:30:23 
ORA-00334: archived log: /usr/oracle/data/dbarch1_16_482701534.log

-- Restart LogMiner. This time, specify the SKIP_CORRUPTION option.
-- 
EXECUTE DBMS_LOGMNR.START_LOGMNR(-
   options => DBMS_LOGMNR.SKIP_CORRUPTION);

-- Select from the V$LOGMNR_CONTENTS view again. The output indicates that 
-- corrupted blocks were skipped: CORRUPTED_BLOCKS is in the OPERATION 
-- column, 1343 is in the STATUS column, and the number of corrupt blocks 
-- skipped is in the INFO column.
--
SELECT rbasqn, rbablk, rbabyte, operation, status, info 
   FROM V$LOGMNR_CONTENTS;

RBASQN  RBABLK RBABYTE  OPERATION        STATUS  INFO
13      2        76     START              0
13      2        76     DELETE             0
13      3       100     INTERNAL           0
13      3       380     DELETE             0
13      0         0     CORRUPTED_BLOCKS   1343  corrupt blocks 4 to 19 skipped
13      20      116     UPDATE             0
```

### Filtering Data by Time

要按时间过滤数据，请在DBMS_LOGMNR.START_LOGMNR过程中设置STARTTIME和ENDTIME参数。

为了避免在调用PL/SQL DBMS_LOGMNR时指定日期格式。START_LOGMNR过程中，可以首先使用SQL ALTER SESSION SET NLS_DATE_FORMAT语句，如下面的示例所示。

```sql
ALTER SESSION SET NLS_DATE_FORMAT = 'DD-MON-YYYY HH24:MI:SS';
EXECUTE DBMS_LOGMNR.START_LOGMNR( -
   DICTFILENAME => '/oracle/database/dictionary.ora', -
   STARTTIME => '01-Jan-2012 08:30:00', -
   ENDTIME => '01-Jan-2012 08:45:00'-
   ); 
```
不应该使用时间戳来推断重做记录的顺序。您可以使用SCN来推断重做记录的顺序。

### Filtering Data by SCN

要根据SCN(系统更改号)过滤数据，请使用PL/SQL DBMS_LOGMNR的STARTSCN和ENDSCN参数。START_LOGMNR过程。例如：

```sql
EXECUTE DBMS_LOGMNR.START_LOGMNR(-
    STARTSCN => 621047, -
    ENDSCN   => 625695, -
    OPTIONS  => DBMS_LOGMNR.DICT_FROM_ONLINE_CATALOG + -
                );
```

在指定所有参数的情况下，STARTSCN和ENDSCN参数会覆盖STARTTIME和ENDTIME参数。

### Formatting Reconstructed SQL Statements for Re-execution

默认情况下，重构的SQL_REDO和SQL_UNDO语句中包含一个ROWID子句，这些语句以分号结束。

但是，您可以覆盖默认设置，如下所示:

* 在启动LogMiner时指定NO_ROWID_IN_STMT选项。
  这将ROWID子句排除在重构语句之外。由于数据库之间的行id不一致，如果您打算针对不同于最初执行它们的数据库重新执行SQL_REDO或SQL_UNDO语句，那么在启动LogMiner时指定NO_ROWID_IN_STMT选项。

* 在启动LogMiner时指定NO_SQL_DELIMITER选项。这将从重构语句中取消分号。这对于打开游标然后执行重构语句的应用程序很有帮助。

注意，如果`V$LOGMNR_CONTENTS`视图的STATUS字段值为2(无效sql)，则无法执行关联的sql语句。

### Formatting the Appearance of Returned Data for Readability

LogMiner提供PRINT_PRETTY_SQL选项，用于格式化返回数据的外观，以提高可读性。

有时候，一个查询可能会导致包含重构SQL语句的大量列，这些语句在视觉上很繁忙，很难阅读。LogMiner提供PRINT_PRETTY_SQL选项来解决这个问题。DBMS_LOGMNR的PRINT_PRETTY_SQL选项。START_LOGMNR过程将重建的SQL语句格式化如下，使其更易于阅读:

```sql
insert into "HR"."JOBS"
 values
    "JOB_ID" = '9782',
    "JOB_TITLE" = 'HR_ENTRY',
    "MIN_SALARY" IS NULL,
    "MAX_SALARY" IS NULL;
  update "HR"."JOBS"
  set
    "JOB_TITLE" = 'FI_ENTRY'
  where
    "JOB_TITLE" = 'HR_ENTRY' and
    ROWID = 'AAAHSeAABAAAY+CAAX';

update "HR"."JOBS"
  set
    "JOB_TITLE" = 'FI_ENTRY'
  where
    "JOB_TITLE" = 'HR_ENTRY' and
    ROWID = 'AAAHSeAABAAAY+CAAX';

delete from "HR"."JOBS"
 where
    "JOB_ID" = '9782' and
    "JOB_TITLE" = 'FI_ENTRY' and
    "MIN_SALARY" IS NULL and
    "MAX_SALARY" IS NULL and
    ROWID = 'AAAHSeAABAAAY+CAAX';
```
当启用PRINT_PRETTY_SQL选项时重建的SQL语句是不可执行的，因为它们不使用标准的SQL语法。

## Reapplying DDL Statements Returned to V$LOGMNR_CONTENTS

您发出的一些DDL语句会导致Oracle在内部执行一个或多个其他DDL语句。

要从`V$LOGMNR_CONTENTS`视图的SQL_REDO或SQL_UNDO列重新应用最初应用于数据库的SQL DDL，请不要执行Oracle内部执行的语句。

Note:

If you execute DML statements that were executed internally by Oracle, then you may corrupt your database. See Step 5 of [Example 4: Using the LogMiner Dictionary in the Redo Log Files](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-90944343-46BB-4BD5-A0C6-7A4B79D9BEF0) for an example.

要区分用户发出的DDL语句和Oracle内部发出的DDL语句，请查询`V$LOGMNR_CONTENTS`的INFO列。INFO列的值指示DDL是由用户执行还是由Oracle执行。

## Calling DBMS_LOGMNR.START_LOGMNR Multiple Times

即使您已经成功地调用了DBMS_LOGMNR.START_LOGMNR并从`V$LOGMNR_CONTENTS`视图中开始查询。你也能够再次以不同的参数配置调用START_LOGMNR切仍然不结束当前LogMiner会话。下面列出了你可能想要这样做的原因:

* 您希望限制LogMiner必须分析的重做数据的数量。
* 您希望指定不同的选项。例如，您可能决定指定PRINT_PRETTY_SQL选项，或者只希望看到提交的事务(因此您可以指定COMMITTED_DATA_ONLY选项)。
* 您希望更改要分析的时间或SCN范围。

Examples: Calling DBMS_LOGMNR.START_LOGMNR Multiple Times

The following are some examples of when it could be useful to call` DBMS_LOGMNR.START_LOGMNR` multiple times.

Example 1:  Mining Only a Subset of the Data in the Redo Log Files

Suppose the list of redo log files that LogMiner has to mine include those generated for an entire week. However, you want to analyze only what happened from 12:00 to 1:00 each day. You could do this most efficiently by:

1.  Calling `DBMS_LOGMNR.START_LOGMNR` with this time range for Monday. 

2.  Selecting changes from the `V$LOGMNR_CONTENTS` view. 

3.  Repeating Steps 1 and 2 for each day of the week.

If the total amount of redo data is large for the week, then this method would make the whole analysis much faster, because only a small subset of each redo log file in the list would be read by LogMiner.

Example 2: Adjusting the Time Range or SCN Range

Suppose you specify a redo log file list and specify a time (or SCN) range when you start LogMiner. When you query the `V$LOGMNR_CONTENTS` view, you find that only part of the data of interest is included in the time range you specified. You can call `DBMS_LOGMNR.START_LOGMNR` again to expand the time range by an hour (or adjust the SCN range). 

Example 3: Analyzing Redo Log Files As They Arrive at a Remote Database

Suppose you have written an application to analyze changes or to replicate changes from one database to another database. The source database sends its redo log files to the mining database and drops them into an operating system directory. Your application: 

1.  Adds all redo log files currently in the directory to the redo log file list

2.  Calls `DBMS_LOGMNR.START_LOGMNR` with appropriate settings and selects from the `V$LOGMNR_CONTENTS` view

3.  Adds additional redo log files that have newly arrived in the directory

4.  Repeats Steps 2 and 3, indefinitely


## Supplemental Logging

描述补充日志记录。

重做日志文件通常用于实例恢复和媒体恢复。这些操作所需的数据自动记录在重做日志文件中。但是，基于恢复的应用程序可能需要在重做日志文件中记录其他列。记录这些附加列的过程称为辅助日志记录。

默认情况下，Oracle数据库不提供任何补充日志记录，这意味着在默认情况下LogMiner不可用。因此，在生成将由LogMiner分析的日志文件之前，必须至少启用最少的补充日志记录。

以下是可能需要增加列的例子：

* 将重新构造的SQL语句应用于不同数据库的应用程序必须通过一组列来标识update语句，这些列要是唯一地标识行(例如，主键)，不是由`V$LOGMNR_CONTENTS`视图返回的重构SQL中显示的ROWID，因为不同数据库的ROWID是不同的，因此在另一个数据库中没有意义。

* 应用程序可能要求记录整个行的前映像，而不只是记录修改后的列，以便更有效地跟踪行更改。

补充日志组是启用补充日志记录时要记录的一组附加列。有两种类型的补充日志组，它们决定了日志组中的列何时被记录:

* Unconditional supplemental log groups:无论更新是否影响任何指定列，在更新行时都会记录指定列的前映像。这有时被称为总是日志组。
* Conditional supplemental log groups: 只有更新日志组中的至少一列时，才会记录所有指定列的前映像。

补充日志组可以由系统生成，也可以由用户定义。

### Database-Level Supplemental Logging

LogMiner提供不同类型的数据库级补充日志记录:最小补充日志记录、标识键日志记录和过程性补充日志记录，如本部分所述。

最小的补充日志记录不会给生成重做日志文件的数据库带来很大的开销。但是，启用数据库范围的标识键日志记录会给生成重做日志文件的数据库带来开销。Oracle建议您至少为LogMiner启用最低限度的补充日志记录。

#### Minimal Supplemental Logging

最低限度的补充日志记录LogMiner识别、分组和合并与DML更改相关的重做操作所需的最低限度的信息。

它确保LogMiner(以及任何基于LogMiner技术的产品)有足够的信息来支持链式行和各种存储安排，比如集群表和索引组织的表。要启用最小的辅助日志记录，请执行以下SQL语句:
```sql
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA;
```

#### Database-Level Identification Key Logging

当源数据库实例上不会挖掘重做日志文件时(例如，当在逻辑备用数据库上挖掘重做日志文件时)，标识键日志记录是必要的。

使用数据库标识键日志记录，您可以通过为SQL ALTER database ADD additional LOG语句指定以下一个或多个选项来为所有更新启用数据库范围的before-image日志记录:

* 这个选项指定当更新一行时，该行的所有列(lob、long和adt除外)都放在重做日志文件中。要启用数据库级别的所有列日志记录，请执行以下语句:这个选项指定当更新一行时，该行的所有列(lob、long和adt除外)都放在重做日志文件中。要启用数据库级别的所有列日志记录，请执行以下语句:
      
   ```sql
      SQL> ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (ALL) COLUMNS;
   ```
* 主密钥系统生成的无条件补充日志组
此选项使数据库在更新包含主键的行(即使主键中的值没有改变)时，将行主键的所有列放在重做日志文件中。
如果一个表没有主键，但是有一个或多个非空惟一索引键约束或索引键，那么将选择其中一个惟一索引键进行日志记录，作为惟一标识更新行的一种方法。
如果表既没有主键也没有非空的惟一索引键，那么除了LONG和LOB之外的所有列都被记录;这相当于为该行指定所有补充日志记录。因此，Oracle建议在使用数据库级主键补充日志记录时，将所有或大多数表定义为具有主键或惟一索引键。
若要在数据库级别启用主键日志记录，请执行以下语句:
   ```sql
   SQL> ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;
   ```
* 如果属于复合唯一键或位图索引的任何列被修改，则此选项会导致数据库将行的复合唯一键或位图索引的所有列放在重做日志文件中。惟一键可以由惟一约束或惟一索引决定。要在数据库级别启用唯一索引键和位图索引日志记录，请执行以下语句:
   ```sql
   SQL> ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (UNIQUE) COLUMNS;
   ```
* 外键系统生成的条件补充日志groupThis选项使数据库在任何属于外键的列被修改时将行外键的所有列放在重做日志文件中。要在数据库级别启用外键日志记录，请执行以下SQL语句:
   ```sql
   ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (FOREIGN KEY) COLUMNS;
   ```

Note:

Regardless of whether identification key logging is enabled, the SQL statements returned by LogMiner always contain the `ROWID` clause. You can filter out the `ROWID` clause by using the `NO_ROWID_IN_STMT` option to the `DBMS_LOGMNR.START_LOGMNR` procedure call. See [Formatting Reconstructed SQL Statements for Re-execution](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-C2B8C741-9544-4A46-818E-16B233570599 "By default, a ROWID clause is included in the reconstructed SQL_REDO and SQL_UNDO statements and the statements are ended with a semicolon.") for details.


当您使用识别键记录时，请记住以下几点:

* 如果启用标识键记录时数据库处于打开状态，那么游标缓存中的所有DML游标都将无效。这会影响性能，直到重新填充游标缓存。
* 当您在数据库级别启用标识键日志记录时，将隐式启用最低限度的补充日志记录。
* 补充的日志语句是累积的。如果您发出以下SQL语句，那么主键和唯一键补充日志记录都是启用的:
   ```sql
   ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;

   ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (UNIQUE) COLUMNS;
   ```


要重新应用最初应用的SQL DDL，重新执行`V$LOGMNR_CONTENTS`INFO列包含USER_DDL值的SQL_REDO或SQL_UNDO列中包含的DDL SQL。

#### Procedural Supplemental Logging

过程性补充日志记录会导致LogMiner记录某些过程性调用来重做，以便通过滚动升级或Oracle GoldenGate来复制它们。

对于滚动升级和Oracle GoldenGate必须启用过程性补充日志记录，以支持复制AQ队列表、启用分层结构的表以及具有SDO_TOPO_GEOMETRY或SDO_GEORASTER列的表。使用以下SQL语句来启用过程性补充日志记录:

```sql
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA FOR PROCEDURAL REPLICATION END SUBHEADING
```

如果启用了过程性补充日志记录，则除非首先删除过程性补充日志记录，否则无法删除最低限度的补充日志记录。

###  Disabling Database-Level Supplemental Logging
使用带有DROP补充日志子句的SQL ALTER DATABASE语句禁用数据库级补充日志记录。

您可以增量地删除附加的日志属性。例如，假设您按以下顺序发出以下SQL语句:

```sql
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (UNIQUE) COLUMNS;
ALTER DATABASE DROP SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;
ALTER DATABASE DROP SUPPLEMENTAL LOG DATA;

```
这些声明将产生下列影响:

* 在第一个语句之后，启用主键补充日志记录。

* 在第二个语句之后，将启用主键和惟一键补充日志记录。

* 在第三条语句之后，只启用惟一的键补充日志记录。

* 在第四个语句之后，没有禁用所有补充日志记录。返回以下错误: `ORA-32589: unable to drop minimal supplemental logging`.

要禁用所有数据库补充日志记录，必须首先禁用已启用的任何标识键日志记录，然后禁用最小补充日志记录。下面的例子显示了正确的顺序:

```sql
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (UNIQUE) COLUMNS;
ALTER DATABASE DROP SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;
ALTER DATABASE DROP SUPPLEMENTAL LOG DATA (UNIQUE) COLUMNS;
ALTER DATABASE DROP SUPPLEMENTAL LOG DATA;
```

只有在不启用数据库级补充日志记录的其他变体的情况下，才允许删除最小的补充日志数据。

###  Table-Level Supplemental Logging
（表级别的一般就不关心了，就不逐一分析了）
在表级，级别的补充日志指定哪些列将被补充到日志中。
#### Table-Level Identification Key Logging

Identification key logging at the table level offers the same options as those provided at the database level: all, primary key, foreign key, and unique key. 

However, when you specify identification key logging at the table level, only the specified table is affected. For example, if you enter the following SQL statement (specifying database-level supplemental logging), then whenever a column in any database table is changed, the entire row containing that column (except columns for LOBs, `LONG`s, and `ADT`s) will be placed in the redo log file:

```sql
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (ALL) COLUMNS;
```

However, if you enter the following SQL statement (specifying table-level supplemental logging) instead, then only when a column in the `employees` table is changed will the entire row (except for LOB, `LONG`s, and `ADT`s) of the table be placed in the redo log file. If a column changes in the `departments` table, then only the changed column will be placed in the redo log file.

```sql
ALTER TABLE HR.EMPLOYEES ADD SUPPLEMENTAL LOG DATA (ALL) COLUMNS;
```

Keep the following in mind when you use table-level identification key logging:

* If the database is open when you enable identification key logging on a table, then all DML cursors for that table in the cursor cache are invalidated. This can affect performance until the cursor cache is repopulated.

* Supplemental logging statements are cumulative. If you issue the following SQL statements, then both primary key and unique index key table-level supplemental logging is enabled:

    ```sql
    ALTER TABLE HR.EMPLOYEES 
      ADD SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;
    ALTER TABLE HR.EMPLOYEES 
      ADD SUPPLEMENTAL LOG DATA (UNIQUE) COLUMNS;
    ```

See [Database-Level Identification Key Logging](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-E3E015C4-B0EB-4072-92A6-FD3079C68242 "Identification key logging is necessary when redo log files will not be mined at the source database instance, for example, when the redo log files will be mined at a logical standby database.") for a description of each of the identification key logging options.


#### Table-Level User-Defined Supplemental Log Groups

In addition to table-level identification key logging, Oracle supports user-defined supplemental log groups. 

With user-defined supplemental log groups, you can specify which columns are supplementally logged. You can specify conditional or unconditional log groups, as follows:

* User-defined unconditional log groups

    To enable supplemental logging that uses user-defined unconditional log groups, use the `ALWAYS` clause as shown in the following example:

    ```sql
    ALTER TABLE HR.EMPLOYEES
       ADD SUPPLEMENTAL LOG GROUP emp_parttime (EMPLOYEE_ID, LAST_NAME, 
       DEPARTMENT_ID) ALWAYS;
    ```

    This creates a log group named `emp_parttime` on the `hr.employees` table that consists of the columns `employee_id`, `last_name`, and `department_id`. These columns are logged every time an `UPDATE` statement is executed on the `hr.employees` table, regardless of whether the update affected these columns. (To have the entire row image logged any time an update is made, use table-level `ALL` identification key logging, as described previously). 

    Note:

    LOB, `LONG`, and `ADT` columns cannot be supplementally logged.

* User-defined conditional supplemental log groups

    To enable supplemental logging that uses user-defined conditional log groups, omit the `ALWAYS` clause from the SQL `ALTER` `TABLE` statement, as shown in the following example: 

    ```sql
    ALTER TABLE HR.EMPLOYEES
       ADD SUPPLEMENTAL LOG GROUP emp_fulltime (EMPLOYEE_ID, LAST_NAME, 
       DEPARTMENT_ID);
    ```

    This creates a log group named `emp_fulltime` on table `hr.employees`. As in the previous example, it consists of the columns `employee_id`, `last_name`, and `department_id`. But because the `ALWAYS` clause was omitted, before-images of the columns are logged only if at least one of the columns is updated.

For both unconditional and conditional user-defined supplemental log groups, you can explicitly specify that a column in the log group be excluded from supplemental logging by specifying the `NO LOG` option. When you specify a log group and use the `NO LOG` option, you must specify at least one column in the log group without the `NO LOG` option, as shown in the following example:

```sql
ALTER TABLE HR.EMPLOYEES
   ADD SUPPLEMENTAL LOG GROUP emp_parttime(
   DEPARTMENT_ID NO LOG, EMPLOYEE_ID);
```

This enables you to associate this column with other columns in the named supplemental log group such that any modification to the `NO LOG` column causes the other columns in the supplemental log group to be placed in the redo log file. This might be useful, for example, for logging certain columns in a group if a `LONG` column changes. You cannot supplementally log the `LONG` column itself; however, you can use changes to that column to trigger supplemental logging of other columns in the same row.


#### Usage Notes for User-Defined Supplemental Log Groups

Hints for using user-defined supplemental log groups.

Keep the following in mind when you specify user-defined supplemental log groups:

* A column can belong to more than one supplemental log group. However, the before-image of the columns gets logged only once.

* If you specify the same columns to be logged both conditionally and unconditionally, then the columns are logged unconditionally.

### Tracking DDL Statements in the LogMiner Dictionary

LogMiner从LogMiner字典自动构建自己的内部字典，该字典是在启动LogMiner时指定的(在线目录、重做日志文件中的字典或平面文件)。

此字典提供数据库对象及其定义的快照。

如果LogMiner字典在重做日志文件中，或者是平面文件，那么可以使用PL/SQL DBMS_LOGMNR.START_LOGMNR过程的DDL_DICT_TRACKING选项，用于指示LogMiner跟踪数据定义语言(DDL)语句。DDL跟踪使LogMiner能够成功地跟踪对数据库对象所做的结构更改，比如从表中添加或删除列。例如:

```sql
EXECUTE DBMS_LOGMNR.START_LOGMNR(OPTIONS => -
   DBMS_LOGMNR.DDL_DICT_TRACKING + DBMS_LOGMNR.DICT_FROM_REDO_LOGS);
```

过设置这个选项，LogMiner将在重做日志文件中看到的任何DDL语句应用到它的内部字典中。

注意:一般来说，最好启用补充日志记录和DDL跟踪功能，因为如果没有启用这些功能，并且发生了DDL事件，那么LogMiner将一些重做数据作为二进制数据返回。此外，可能会出现元数据版本不匹配。

启用DDL_DICT_TRACKING时，可以正确显示在提取LogMiner字典后创建的表上执行的数据操作语言(DML)操作。

例如，如果通过两个连续的DDL操作更新一个表employees，比如在一个操作中添加列gender，在下一个操作中删除列commiton_pct，那么LogMiner将为每个这些更改保留雇员的版本信息。这意味着LogMiner可以成功地挖掘来自这些DDL更改之前和之后的重做日志文件，并且不会为SQL_REDO或SQL_UNDO列显示二进制数据。

因为LogMiner自动将版本分配给数据库元数据，所以它将检测并通知您其内部字典与重做日志文件中的字典之间的任何不匹配。如果LogMiner检测到不匹配，那么它将在`V$LOGMNR_CONTENTS`视图的SQL_REDO列中生成二进制数据，INFO列包含字符串“Dictionary Version mismatch”，STATUS列将包含值2。

注意:LogMiner内部字典与平面文件、重做日志文件或在线目录中包含的LogMiner字典不同，理解这一点很重要。LogMiner会更新它的内部字典，但它不会更新平面文件、重做日志文件或在线目录中包含的字典。

下面的列表描述了使用DBMS_LOGMNR.START_LOGMNR过程指定DDL_DICT_TRACKING选项的要求。

* DDL_DICT_TRACKING选项对于DICT_FROM_ONLINE_CATALOG选项无效。
* DDL_DICT_TRACKING选项要求数据库打开。
* 必须在整个数据库范围内启用补充日志记录，或者必须为感兴趣的表创建日志组。

###  DDL_DICT_TRACKING and Supplemental Logging Settings

描述合并字典跟踪和辅助日志记录的各种设置时发生的交互。

Note the following:

* If `DDL_DICT_TRACKING` is enabled, but supplemental logging is not enabled and:

    * A DDL transaction is encountered in the redo log file, then a query of `V$LOGMNR_CONTENTS` will terminate with the ORA-01347 error.

    * A DML transaction is encountered in the redo log file, then LogMiner will not assume that the current version of the table (underlying the DML) in its dictionary is correct, and columns in `V$LOGMNR_CONTENTS` will be set as follows:

        * The `SQL_REDO` column will contain binary data.

        * The `STATUS` column will contain a value of `2` (which indicates that the SQL is not valid).

        * The `INFO` column will contain the string 'Dictionary Mismatch'.

* If `DDL_DICT_TRACKING` is not enabled and supplemental logging is not enabled, and the columns referenced in a DML operation match the columns in the LogMiner dictionary, then LogMiner assumes that the latest version in its dictionary is correct, and columns in `V$LOGMNR_CONTENTS` will be set as follows:

    * LogMiner will use the definition of the object in its dictionary to generate values for the `SQL_REDO` and `SQL_UNDO` columns. 

    * The status column will contain a value of `3` (which indicates that the SQL is not guaranteed to be accurate). 

    * The `INFO` column will contain the string 'no supplemental log data found'. 

* If `DDL_DICT_TRACKING` is not enabled and supplemental logging is not enabled and there are more modified columns in the redo log file for a table than the LogMiner dictionary definition for the table defines, then:

    * The `SQL_REDO` and `SQL_UNDO` columns will contain the string 'Dictionary Version Mismatch'. 

    * The `STATUS` column will contain a value of `2` (which indicates that the SQL is not valid). 

    * The `INFO` column will contain the string 'Dictionary Mismatch'.

    Also be aware that it is possible to get unpredictable behavior if the dictionary definition of a column indicates one type but the column is really another type.

### DDL_DICT_TRACKING and Specified Time or SCN Ranges

Because LogMiner must not miss a DDL statement if it is to ensure the consistency of its dictionary, LogMiner may start reading redo log files before your requested starting time or SCN (as specified with `DBMS_LOGMNR.START_LOGMNR`) when the `DDL_DICT_TRACKING` option is enabled. 

The actual time or SCN at which LogMiner starts reading redo log files is referred to as the required starting time or the required starting SCN. 

No missing redo log files (based on sequence numbers) are allowed from the required starting time or the required starting SCN.

LogMiner determines where it will start reading redo log data as follows:

* After the dictionary is loaded, the first time that you call `DBMS_LOGMNR.START_LOGMNR`, LogMiner begins reading as determined by one of the following, whichever causes it to begin earlier:

    * Your requested starting time or SCN value 

    * The commit SCN of the dictionary dump

* On subsequent calls to `DBMS_LOGMNR.START_LOGMNR`, LogMiner begins reading as determined for one of the following, whichever causes it to begin earliest:

    * Your requested starting time or SCN value

    * The start of the earliest DDL transaction where the `COMMIT` statement has not yet been read by LogMiner

    * The highest SCN read by LogMiner

The following scenario helps illustrate this: 

Suppose you create a redo log file list containing five redo log files. Assume that a dictionary is contained in the first redo file, and the changes that you have indicated you want to see (using `DBMS_LOGMNR.START_LOGMNR`) are recorded in the third redo log file. You then do the following:

1.  Call `DBMS_LOGMNR.START_LOGMNR`. LogMiner will read:

    1.  The first log file to load the dictionary

    2.  The second redo log file to pick up any possible DDLs contained within it

    3.  The third log file to retrieve the data of interest

2.  Call `DBMS_LOGMNR.START_LOGMNR` again with the same requested range. 

    LogMiner will begin with redo log file 3; it no longer needs to read redo log file 2, because it has already processed any DDL statements contained within it.

3.  Call `DBMS_LOGMNR.START_LOGMNR` again, this time specifying parameters that require data to be read from redo log file 5. 

    LogMiner will start reading from redo log file 4 to pick up any DDL statements that may be contained within it. 

Query the `REQUIRED_START_DATE` or the `REQUIRED_START_SCN` columns of the `V$LOGMNR_PARAMETERS` view to see where LogMiner will actually start reading. Regardless of where LogMiner starts reading, only rows in your requested range will be returned from the `V$LOGMNR_CONTENTS` view.

## Accessing LogMiner Operational Information in Views

LogMiner操作信息(相对于重做数据)包含在视图中。

可以像查询其他视图一样使用SQL查询它们。

1.  `V$LOGMNR_DICTIONARY`

    Shows information about a LogMiner dictionary file that was created using the `STORE_IN_FLAT_FILE` option to `DBMS_LOGMNR.START_LOGMNR`. The information shown includes information about the database from which the LogMiner dictionary was created.

2.  `V$LOGMNR_LOGS`

    Shows information about specified redo log files, as described in [Querying `V$LOGMNR_LOGS`](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-A4779AA3-EE5B-43CA-A64A-0A6B8CFC5D4F "You can query the V$LOGMNR_LOGS view to determine which redo log files have been manually or automatically added to the list of redo log files for LogMiner to analyze.").

3.  `V$LOGMNR_PARAMETERS`

    Shows information about optional LogMiner parameters, including starting and ending system change numbers (SCNs) and starting and ending times.

4.  `V$DATABASE`, `DBA_LOG_GROUPS`, `ALL_LOG_GROUPS`, `USER_LOG_GROUPS`, `DBA_LOG_GROUP_COLUMNS`, `ALL_LOG_GROUP_COLUMNS`, `USER_LOG_GROUP_COLUMNS`

### Querying V$LOGMNR_LOGS

您可以查询`V$LOGMNR_LOGS`视图，以确定哪些重做日志文件已手动或自动添加到重做日志文件列表中，以便LogMiner进行分析。

此视图包含每个重做日志文件的一行。它提供关于每个重做日志文件的有价值的信息，包括文件名、SCN和时间范围，以及它是否包含LogMiner字典的全部或部分内容。
成功调用DBMS_LOGMNR.START_LOGMNR之后, `V$LOGMNR_LOGS`视图的STATUS 列包含以下值之一:

1.  `0`

    指示将在`V$LOGMNR_CONTENTS`视图的查询期间处理重做日志文件。

2.  `1`

    指示这将是LogMiner在对`V$LOGMNR_CONTENTS`视图执行选择操作期间要处理的第一个重做日志文件。

3.  `2`

    指示重做日志文件已被删除，因此在查询`V$LOGMNR_CONTENTS`视图期间LogMiner不会处理该文件。它已经修剪，因为它不需要满足您所要求的时间或SCN范围。.

4.  `4`

    指示在LogMiner重做日志文件列表中缺少重做日志文件(基于序列号)。

`V$LOGMNR_LOGS`视图包含列表中缺少的每个重做日志文件的行，如下所示:

1.  FILENAME列将包含序列号的连续范围和总SCN范围间隔。

    例如:线程1的日志文件丢失，序列号从100到102'。

2. NFO列将包含字符串'MISSING_LOGFILE'。

关于从重做日志文件列表中丢失的文件的信息是有用的，原因如下:

1.  The `DDL_DICT_TRACKING` option that can be specified when you call `DBMS_LOGMNR.START_LOGMNR` will not allow redo log files to be missing from the LogMiner redo log file list for the requested time or SCN range. If a call to `DBMS_LOGMNR.START_LOGMNR` fails, then you can query the `STATUS` column in the `V$LOGMNR_LOGS` view to determine which redo log files are missing from the list. You can then find and manually add these redo log files and attempt to call `DBMS_LOGMNR.START_LOGMNR` again.

    Note:The `continuous_mine` option for the `dbms_logmnr.start_logmnr` package is desupported in Oracle Database 19c (19.1), and is no longer available.

2.  Although all other options that can be specified when you call `DBMS_LOGMNR.START_LOGMNR` allow files to be missing from the LogMiner redo log file list, you may not want to have missing files. You can query the `V$LOGMNR_LOGS` view before querying the `V$LOGMNR_CONTENTS` view to ensure that all required files are in the list. If the list is left with missing files and you query the `V$LOGMNR_CONTENTS` view, then a row is returned in `V$LOGMNR_CONTENTS` with the following column values:

    * In the `OPERATION` column, a value of 'MISSING_SCN'

    * In the `STATUS` column, a value of `1291`

    * In the `INFO` column, a string indicating the missing SCN range (for example, 'Missing SCN 100 - 200')


### Querying Views for Supplemental Logging Settings

描述如何查询多个视图以确定补充日志记录的当前设置。

Specificallyt:

* `V$DATABASE` view

    * `SUPPLEMENTAL_LOG_DATA_FK` column

        This column contains one of the following values:
        * `NO` - if database-level identification key logging with the `FOREIGN KEY` option is not enabled

        * `YES` - if database-level identification key logging with the `FOREIGN KEY` option is enabled

    * `SUPPLEMENTAL_LOG_DATA_ALL` column

        This column contains one of the following values:
        * `NO` - if database-level identification key logging with the `ALL` option is not enabled

        * `YES` - if database-level identification key logging with the `ALL` option is enabled

    * `SUPPLEMENTAL_LOG_DATA_UI` column

        * `NO` - if database-level identification key logging with the `UNIQUE` option is not enabled

        * `YES` - if database-level identification key logging with the `UNIQUE` option is enabled

    * `SUPPLEMENTAL_LOG_DATA_MIN` column

        This column contains one of the following values:
        * `NO` - if no database-level supplemental logging is enabled

        * `IMPLICIT` - if minimal supplemental logging is enabled because database-level identification key logging options is enabled

        * `YES` - if minimal supplemental logging is enabled because the SQL `ALTER` `DATABASE` `ADD` `SUPPLEMENTAL` `LOG` `DATA` statement was issued

* `DBA_LOG_GROUPS`, `ALL_LOG_GROUPS`, and `USER_LOG_GROUPS` views

    * `ALWAYS` column

        This column contains one of the following values:
        * `ALWAYS` - indicates that the columns in this log group will be supplementally logged if any column in the associated row is updated

        * `CONDITIONAL` - indicates that the columns in this group will be supplementally logged only if a column in the log group is updated

    * `GENERATED` column

        This column contains one of the following values:
        * `GENERATED NAME` - if the `LOG_GROUP` name was system-generated

        * `USER NAME` - if the `LOG_GROUP` name was user-defined

    * `LOG_GROUP_TYPE` column

        This column contains one of the following values to indicate the type of logging defined for this log group. `USER LOG GROUP` indicates that the log group was user-defined (as opposed to system-generated).

        * `ALL COLUMN LOGGING`

        * `FOREIGN KEY LOGGING`

        * `PRIMARY KEY LOGGING`

        * `UNIQUE KEY LOGGING`

        * `USER LOG GROUP`

* `DBA_LOG_GROUP_COLUMNS`, `ALL_LOG_GROUP_COLUMNS`, and `USER_LOG_GROUP_COLUMNS` views

    * The `LOGGING_PROPERTY` column 

        This column contains one of the following values:
        * `LOG` - indicates that this column in the log group will be supplementally logged

        * `NO` `LOG` - indicates that this column in the log group will not be supplementally logged

## Steps in a Typical LogMiner Session

描述典型LogMiner会话中的步骤。

要运行LogMiner，可以使用DBMS_LOGMNR PL/SQL包。此外，如果选择提取LogMiner字典而不是使用联机编目，还可以使用DBMS_LOGMNR_D包。

DBMS_LOGMNR包包含用于初始化和运行LogMiner的过程，包括用于指定重做日志文件名称、筛选条件和会话特征的接口。DBMS_LOGMNR_D包查询当前数据库的数据库字典表，以创建LogMiner字典文件。

ogMiner PL/SQL包属于SYS模式。因此，如果您没有作为用户系统连接，则:

1.  You must include `SYS` in your call. For example:

    ```codeph
    EXECUTE SYS.DBMS_LOGMNR.END_LOGMNR
    ```;

2.  You must have been granted the `EXECUTE_CATALOG_ROLE` role.

    See Also:

    * [Oracle Database PL/SQL Packages and Types Reference](https://www.oracle.com/pls/topic/lookup?ctx=en/database/oracle/oracle-database/19/sutil&id=ARPLS022) for details about syntax and parameters for these LogMiner packages

    * [Oracle Database Development Guide](https://www.oracle.com/pls/topic/lookup?ctx=en/database/oracle/oracle-database/19/sutil&id=ADFNS1398) for more information about PL/SQL packages

### Typical LogMiner Session Task 1: Enable Supplemental Logging

使补充日志记录。启用要使用的辅助日志记录类型。至少，您必须启用最低限度的补充日志记录，如下所示:

```sql
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA;
```

### Typical LogMiner Session Task 2: Extract a LogMiner Dictionary

提取LogMiner字典。要使用LogMiner，您必须通过以下操作之一为它提供一个字典:

1.  Specify use of the online catalog by using the `DICT_FROM_ONLINE_CATALOG` option when you start LogMiner. See [Using the Online Catalog](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-1D510A2F-4CE8-4D69-AB18-CDD58FB3458C "To direct LogMiner to use the dictionary currently in use for the database, specify the online catalog as your dictionary source when you start LogMiner.").

2.  Extract database dictionary information to the redo log files. See [Extracting a LogMiner Dictionary to the Redo Log Files](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-A0D89906-C787-4EB4-BA47-171A457445EC "To extract a LogMiner dictionary to the redo log files, the database must be open and in ARCHIVELOG mode and archiving must be enabled."). 

3.  Extract database dictionary information to a flat file. See [Extracting the LogMiner Dictionary to a Flat File ](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-DA37874F-6637-4205-AB5C-A8AC1914D018 "When the LogMiner dictionary is in a flat file, fewer system resources are used than when it is contained in the redo log files. Oracle recommends that you regularly back up the dictionary extract to ensure correct analysis of older redo log files.").

### Typical LogMiner Session Task 3: Specify Redo Log Files for Analysis

指定用于分析的重做日志文件。在启动LogMiner之前，必须指定要分析的重做日志文件。为此，执行DBMS_LOGMNR。ADD_LOGFILE过程，如下面的步骤所示。您可以按任何顺序添加和删除重做日志文件。

Note:

If you are mining in the database instance that is generating the redo log files, then you only need to specify one of the following when you start LogMiner:

* The `STARTSCN` parameter

* The `STARTTIME` parameter

1.  Use SQL*Plus to start an Oracle instance, with the database either mounted or unmounted. For example, enter the `STARTUP` statement at the SQL prompt:

    ```
    STARTUP
    ```

2.  Create a list of redo log files. Specify the `NEW` option of the `DBMS_LOGMNR.ADD_LOGFILE` PL/SQL procedure to signal that this is the beginning of a new list. For example, enter the following to specify the `/oracle/logs/log1.f` redo log file: 

    ```
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
       LOGFILENAME => '/oracle/logs/log1.f', -
       OPTIONS => DBMS_LOGMNR.NEW);
    ```

3.  If desired, add more redo log files by specifying the `ADDFILE` option of the `DBMS_LOGMNR.ADD_LOGFILE` PL/SQL procedure. For example, enter the following to add the `/oracle/logs/log2.f` redo log file:

    ```
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
       LOGFILENAME => '/oracle/logs/log2.f', -
       OPTIONS => DBMS_LOGMNR.ADDFILE);
    ```

    The `OPTIONS` parameter is optional when you are adding additional redo log files. For example, you could simply enter the following:

    ```
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
       LOGFILENAME=>'/oracle/logs/log2.f');
    ```

4.  If desired, remove redo log files by using the `DBMS_LOGMNR.REMOVE_LOGFILE `PL/SQL procedure. For example, enter the following to remove the `/oracle/logs/log2.f` redo log file:

    ```
    EXECUTE DBMS_LOGMNR.REMOVE_LOGFILE( -
       LOGFILENAME => '/oracle/logs/log2.f');
    ```

### Typical LogMiner Session Task 4: Start LogMiner

LogMiner开始。创建LogMiner字典文件并指定要分析哪些重做日志文件之后，必须启动LogMiner。采取以下步骤:

1.  Execute the `DBMS_LOGMNR.START_LOGMNR` procedure to start LogMiner.

    Oracle recommends that you specify a LogMiner dictionary option. If you do not, then LogMiner cannot translate internal object identifiers and data types to object names and external data formats. Therefore, it would return internal object IDs and present data as binary data. Additionally, the `MINE_VALUE` and `COLUMN_PRESENT` functions cannot be used without a dictionary.

    If you are specifying the name of a flat file LogMiner dictionary, then you must supply a fully qualified file name for the dictionary file. For example, to start LogMiner using `/oracle/database/dictionary.ora`, issue the following statement:

    ```
    EXECUTE DBMS_LOGMNR.START_LOGMNR( -
       DICTFILENAME =>'/oracle/database/dictionary.ora');
    ```

    If you are not specifying a flat file dictionary name, then use the `OPTIONS` parameter to specify either the `DICT_FROM_REDO_LOGS` or `DICT_FROM_ONLINE_CATALOG` option. 

    If you specify `DICT_FROM_REDO_LOGS`, then LogMiner expects to find a dictionary in the redo log files that you specified with the `DBMS_LOGMNR.ADD_LOGFILE` procedure. To determine which redo log files contain a dictionary, look at the `V$ARCHIVED_LOG` view. See [Extracting a LogMiner Dictionary to the Redo Log Files](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-A0D89906-C787-4EB4-BA47-171A457445EC "To extract a LogMiner dictionary to the redo log files, the database must be open and in ARCHIVELOG mode and archiving must be enabled.") for an example.

    Note:

    If you add additional redo log files after LogMiner has been started, you must restart LogMiner. LogMiner will not retain options that were included in the previous call to `DBMS_LOGMNR.START_LOGMNR`; you must respecify the options you want to use. However, LogMiner will retain the dictionary specification from the previous call if you do not specify a dictionary in the current call to `DBMS_LOGMNR.START_LOGMNR`.

    For more information about the `DICT_FROM_ONLINE_CATALOG` option, see [Using the Online Catalog](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-1D510A2F-4CE8-4D69-AB18-CDD58FB3458C "To direct LogMiner to use the dictionary currently in use for the database, specify the online catalog as your dictionary source when you start LogMiner.").

2.  Optionally, you can filter your query by time or by SCN. See [Filtering Data by Time](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-0AA13EFD-8118-4061-A215-9D3AF9EEB1D5 "To filter data by time, set the STARTTIME and ENDTIME parameters in the DBMS_LOGMNR.START_LOGMNR procedure.") or [Filtering Data by SCN](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-011AA230-32A7-4DE7-9DC0-CE1FF55CFAF3 "To filter data by SCN (system change number), use the STARTSCN and ENDSCN parameters to the PL/SQL DBMS_LOGMNR.START_LOGMNR procedure.").
3.  You can also use the `OPTIONS` parameter to specify additional characteristics of your LogMiner session. For example, you might decide to use the online catalog as your LogMiner dictionary and to have only committed transactions shown in the `V$LOGMNR_CONTENTS` view, as follows:

    ```
    EXECUTE DBMS_LOGMNR.START_LOGMNR(OPTIONS => -
       DBMS_LOGMNR.DICT_FROM_ONLINE_CATALOG + -
       DBMS_LOGMNR.COMMITTED_DATA_ONLY);
    ```

    For more information about `DBMS_LOGMNR.START_LOGMNR` options, see [Oracle Database PL/SQL Packages and Types Reference](https://www.oracle.com/pls/topic/lookup?ctx=en/database/oracle/oracle-database/19/sutil&id=ARPLS022).

    You can execute the `DBMS_LOGMNR`.`START_LOGMNR` procedure multiple times, specifying different options each time. This can be useful, for example, if you did not get the desired results from a query of `V$LOGMNR_CONTENTS`, and want to restart LogMiner with different options. Unless you need to respecify the LogMiner dictionary, you do not need to add redo log files if they were already added with a previous call to `DBMS_LOGMNR`.`START_LOGMNR`.

   
### Typical LogMiner Session Task 5: Query V$LOGMNR_CONTENTS

Querying the `V$LOGMNR_CONTENTS` view.

At this point, LogMiner is started. You can perform queries against the `V$LOGMNR_CONTENTS` view. See[Filtering and Formatting Data Returned to `V$LOGMNR_CONTENTS`](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-C659DAB0-03D0-4958-BB2F-E81C2928BE24 "LogMiner can potentially deal with large amounts of information. You can limit the information that is returned to the V$LOGMNR_CONTENTS view, and the speed at which it is returned.") for examples of this.

###  Typical LogMiner Session Task 6: End the LogMiner Session

Ending the LogMiner session.

To properly end a LogMiner session, use the `DBMS_LOGMNR.END_LOGMNR` PL/SQL procedure, as follows:

```
EXECUTE DBMS_LOGMNR.END_LOGMNR;
```

This procedure closes all the redo log files and allows all the database and system resources allocated by LogMiner to be released. 

If this procedure is not executed, then LogMiner retains all its allocated resources until the end of the Oracle session in which it was called. It is particularly important to use this procedure to end the LogMiner session if either the `DDL_DICT_TRACKING` option or the `DICT_FROM_REDO_LOGS` option was used.

## Examples Using LogMiner

This section provides several examples of using LogMiner.

Note:

All examples in this section assume that minimal supplemental logging has been enabled:

```
SQL> ALTER DATABASE ADD SUPPLEMENTAL LOG DATA;
```

See [Supplemental Logging](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-D857AF96-AC24-4CA1-B620-8EA3DF30D72E "Describes supplemental logging.") for more information.

All examples, except [Example 2: Mining the Redo Log Files in a Given SCN Range](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-97F5B369-A905-4BCF-AA7F-E9F932D3D14A) and the [Example Scenarios](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-143798E2-B0E0-4E9D-A70C-08593A117027 "Examples of how to use LogMiner for typical scenarios."), assume that the `NLS_DATE_FORMAT` parameter has been set as follows:

```
SQL>  ALTER SESSION SET NLS_DATE_FORMAT = 'dd-mon-yyyy hh24:mi:ss';
```

```

```

Because LogMiner displays date data using the setting for the `NLS_DATE_FORMAT`   parameter that is active for the user session, this step is optional. However, setting the parameter explicitly lets you predict the date format.


### Examples of Mining by Explicitly Specifying the Redo Log Files of Interest

Examples specifying redo log files.

These examples demonstrate how to use LogMiner when you know which redo log files contain the data of interest. These examples are best read sequentially, because each example builds on the example or examples that precede it.

The SQL output formatting may be different on your display than that shown in these examples.  


#### Example 1: Finding All Modifications in the Last Archived Redo Log File

The easiest way to examine the modification history of a database is to mine at the source database and use the online catalog to translate the redo log files. This example shows how to do the simplest analysis using LogMiner. 

This example assumes that you know you want to mine the redo log file that was most recently archived. It finds all modifications that are contained in the last archived redo log generated by the database (assuming that the database is not an Oracle Real Application Clusters (Oracle RAC) database). 

1.  Determine which redo log file was most recently archived.

```
    SELECT NAME FROM V$ARCHIVED_LOG
       WHERE FIRST_TIME = (SELECT MAX(FIRST_TIME) FROM V$ARCHIVED_LOG);   
    NAME                            
    -------------------------------------------
    /usr/oracle/data/db1arch_1_16_482701534.dbf
```
2.  Specify the list of redo log files to be analyzed. In this case, it is the redo log file that was returned by the query in Step 1.

```
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
      LOGFILENAME => '/usr/oracle/data/db1arch_1_16_482701534.dbf', -
      OPTIONS => DBMS_LOGMNR.NEW);
```

3.  Start LogMiner and specify the dictionary to use.

```
    EXECUTE DBMS_LOGMNR.START_LOGMNR( -
       OPTIONS => DBMS_LOGMNR.DICT_FROM_ONLINE_CATALOG);
```

4.  Query the `V$LOGMNR_CONTENTS` view.

    Note that there are four transactions (two of them were committed within the redo log file being analyzed, and two were not). The output shows the DML statements in the order in which they were executed; thus transactions interleave among themselves.

```
    SELECT username AS USR, (XIDUSN || '.' || XIDSLT || '.' ||  XIDSQN) AS XID, 
       SQL_REDO, SQL_UNDO FROM V$LOGMNR_CONTENTS WHERE username IN ('HR', 'OE');

    USR    XID          SQL_REDO                        SQL_UNDO
    ----   ---------  ----------------------------------------------------
    HR     1.11.1476  set transaction read write;

    HR     1.11.1476  insert into "HR"."EMPLOYEES"(     delete from "HR"."EMPLOYEES" 
                      "EMPLOYEE_ID","FIRST_NAME",       where "EMPLOYEE_ID" = '306'
                      "LAST_NAME","EMAIL",              and "FIRST_NAME" = 'Nandini'
                      "PHONE_NUMBER","HIRE_DATE",       and "LAST_NAME" = 'Shastry'
                      "JOB_ID","SALARY",                and "EMAIL" = 'NSHASTRY'
                      "COMMISSION_PCT","MANAGER_ID",    and "PHONE_NUMBER" = '1234567890'
                      "DEPARTMENT_ID") values           and "HIRE_DATE" = TO_DATE('10-JAN-2012
                      ('306','Nandini','Shastry',       13:34:43', 'dd-mon-yyyy hh24:mi:ss') 
                      'NSHASTRY', '1234567890',         and "JOB_ID" = 'HR_REP' and 
                      TO_DATE('10-jan-2012 13:34:43',   "SALARY" = '120000' and 
                      'dd-mon-yyyy hh24:mi:ss'),         "COMMISSION_PCT" = '.05' and
                      'HR_REP','120000', '.05',         "DEPARTMENT_ID" = '10' and
                      '105','10');                      ROWID = 'AAAHSkAABAAAY6rAAO';

    OE     1.1.1484   set transaction read write;

    OE     1.1.1484   update "OE"."PRODUCT_INFORMATION"  update "OE"."PRODUCT_INFORMATION" 
                      set "WARRANTY_PERIOD" =            set "WARRANTY_PERIOD" = 
                      TO_YMINTERVAL('+05-00') where      TO_YMINTERVAL('+01-00') where
                      "PRODUCT_ID" = '1799' and          "PRODUCT_ID" = '1799' and
                      "WARRANTY_PERIOD" =                "WARRANTY_PERIOD" = 
                      TO_YMINTERVAL('+01-00') and        TO_YMINTERVAL('+05-00') and
                      ROWID = 'AAAHTKAABAAAY9mAAB';      ROWID = 'AAAHTKAABAAAY9mAAB'; 

    OE     1.1.1484   update "OE"."PRODUCT_INFORMATION"  update "OE"."PRODUCT_INFORMATION"
                      set "WARRANTY_PERIOD" =            set "WARRANTY_PERIOD" =
                      TO_YMINTERVAL('+05-00') where      TO_YMINTERVAL('+01-00') where
                      "PRODUCT_ID" = '1801' and          "PRODUCT_ID" = '1801' and
                      "WARRANTY_PERIOD" =                "WARRANTY_PERIOD" = 
                      TO_YMINTERVAL('+01-00') and        TO_YMINTERVAL('+05-00') and
                      ROWID = 'AAAHTKAABAAAY9mAAC';      ROWID ='AAAHTKAABAAAY9mAAC';

    HR     1.11.1476  insert into "HR"."EMPLOYEES"(     delete from "HR"."EMPLOYEES"
                      "EMPLOYEE_ID","FIRST_NAME",       "EMPLOYEE_ID" = '307' and 
                      "LAST_NAME","EMAIL",              "FIRST_NAME" = 'John' and
                      "PHONE_NUMBER","HIRE_DATE",       "LAST_NAME" = 'Silver' and
                      "JOB_ID","SALARY",                "EMAIL" = 'JSILVER' and 
                      "COMMISSION_PCT","MANAGER_ID",    "PHONE_NUMBER" = '5551112222'
                      "DEPARTMENT_ID") values           and "HIRE_DATE" = TO_DATE('10-jan-2012
                      ('307','John','Silver',           13:41:03', 'dd-mon-yyyy hh24:mi:ss') 
                       'JSILVER', '5551112222',         and "JOB_ID" ='105' and "DEPARTMENT_ID" 
                      TO_DATE('10-jan-2012 13:41:03',   = '50' and ROWID = 'AAAHSkAABAAAY6rAAP'; 
                      'dd-mon-yyyy hh24:mi:ss'),
                      'SH_CLERK','110000', '.05',
                      '105','50');                

    OE     1.1.1484   commit;

    HR     1.15.1481   set transaction read write;

    HR     1.15.1481  delete from "HR"."EMPLOYEES"      insert into "HR"."EMPLOYEES"(
                      where "EMPLOYEE_ID" = '205' and   "EMPLOYEE_ID","FIRST_NAME",
                      "FIRST_NAME" = 'Shelley' and      "LAST_NAME","EMAIL","PHONE_NUMBER",
                      "LAST_NAME" = 'Higgins' and       "HIRE_DATE", "JOB_ID","SALARY",
                      "EMAIL" = 'SHIGGINS' and          "COMMISSION_PCT","MANAGER_ID",
                      "PHONE_NUMBER" = '515.123.8080'   "DEPARTMENT_ID") values
                      and "HIRE_DATE" = TO_DATE(        ('205','Shelley','Higgins',
                      '07-jun-1994 10:05:01',           and     'SHIGGINS','515.123.8080',
                      'dd-mon-yyyy hh24:mi:ss')         TO_DATE('07-jun-1994 10:05:01',
                      and "JOB_ID" = 'AC_MGR'           'dd-mon-yyyy hh24:mi:ss'),
                      and "SALARY"= '12000'            'AC_MGR','12000',NULL,'101','110'); 
                      and "COMMISSION_PCT" IS NULL 
                      and "MANAGER_ID" 
                      = '101' and "DEPARTMENT_ID" = 
                      '110' and ROWID = 
                      'AAAHSkAABAAAY6rAAM';

    OE     1.8.1484   set transaction read write;

    OE     1.8.1484   update "OE"."PRODUCT_INFORMATION"  update "OE"."PRODUCT_INFORMATION"
                      set "WARRANTY_PERIOD" =            set "WARRANTY_PERIOD" = 
                      TO_YMINTERVAL('+12-06') where      TO_YMINTERVAL('+20-00') where
                      "PRODUCT_ID" = '2350' and          "PRODUCT_ID" = '2350' and
                      "WARRANTY_PERIOD" =                "WARRANTY_PERIOD" =
                      TO_YMINTERVAL('+20-00') and        TO_YMINTERVAL('+20-00') and
                      ROWID = 'AAAHTKAABAAAY9tAAD';       ROWID ='AAAHTKAABAAAY9tAAD'; 

    HR     1.11.1476  commit;
```

5.  End the LogMiner session.

```
    SQL> EXECUTE DBMS_LOGMNR.END_LOGMNR();
```


#### Example 2: Grouping DML Statements into Committed Transactions 

As shown in the first example, [Example 1: Finding All Modifications in the Last Archived Redo Log File](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-E3820793-B482-48C4-9F44-C0D7A062E318), LogMiner displays all modifications it finds in the redo log files that it analyzes by default, regardless of whether the transaction has been committed or not. In addition, LogMiner shows modifications in the same order in which they were executed. Because DML statements that belong to the same transaction are not grouped together, visual inspection of the output can be difficult. Although you can use SQL to group transactions, LogMiner provides an easier way. In this example, the latest archived redo log file will again be analyzed, but it will return only committed transactions.

1.  Determine which redo log file was most recently archived by the database.

```
    SELECT NAME FROM V$ARCHIVED_LOG
       WHERE FIRST_TIME = (SELECT MAX(FIRST_TIME) FROM V$ARCHIVED_LOG);

    NAME                            
    -------------------------------------------
    /usr/oracle/data/db1arch_1_16_482701534.dbf
```

2.  Specify the redo log file that was returned by the query in Step 1. The list will consist of one redo log file.

```
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
       LOGFILENAME => '/usr/oracle/data/db1arch_1_16_482701534.dbf', -
       OPTIONS => DBMS_LOGMNR.NEW);
```

3.  Start LogMiner by specifying the dictionary to use and the `COMMITTED_DATA_ONLY` option.

```
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
       LOGFILENAME => '/usr/oracle/data/db1arch_1_16_482701534.dbf', -
       OPTIONS => DBMS_LOGMNR.NEW);
```

4.  Query the `V$LOGMNR_CONTENTS` view.

    Although transaction 1.11.1476 was started before transaction 1.1.1484 (as revealed in [Example 1: Finding All Modifications in the Last Archived Redo Log File](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-E3820793-B482-48C4-9F44-C0D7A062E318)), it committed after transaction 1.1.1484 committed. In this example, therefore, transaction 1.1.1484 is shown in its entirety before transaction 1.11.1476. The two transactions that did not commit within the redo log file being analyzed are not returned.

```
    SELECT username AS USR, (XIDUSN || '.' || XIDSLT || '.' ||  XIDSQN) AS XID, SQL_REDO, 
       SQL_UNDO FROM V$LOGMNR_CONTENTS WHERE username IN ('HR', 'OE');
    ;
    USR    XID          SQL_REDO                        SQL_UNDO
    ----   ---------    ------------------------------- ---------------------------------

    OE     1.1.1484   set transaction read write;

    OE     1.1.1484   update "OE"."PRODUCT_INFORMATION"  update "OE"."PRODUCT_INFORMATION" 
                      set "WARRANTY_PERIOD" =            set "WARRANTY_PERIOD" = 
                      TO_YMINTERVAL('+05-00') where      TO_YMINTERVAL('+01-00') where
                      "PRODUCT_ID" = '1799' and          "PRODUCT_ID" = '1799' and
                      "WARRANTY_PERIOD" =                "WARRANTY_PERIOD" = 
                      TO_YMINTERVAL('+01-00') and        TO_YMINTERVAL('+05-00') and
                      ROWID = 'AAAHTKAABAAAY9mAAB';      ROWID = 'AAAHTKAABAAAY9mAAB'; 

    OE     1.1.1484   update "OE"."PRODUCT_INFORMATION"  update "OE"."PRODUCT_INFORMATION"
                      set "WARRANTY_PERIOD" =            set "WARRANTY_PERIOD" =
                      TO_YMINTERVAL('+05-00') where      TO_YMINTERVAL('+01-00') where
                      "PRODUCT_ID" = '1801' and          "PRODUCT_ID" = '1801' and
                      "WARRANTY_PERIOD" =                "WARRANTY_PERIOD" = 
                      TO_YMINTERVAL('+01-00') and        TO_YMINTERVAL('+05-00') and
                      ROWID = 'AAAHTKAABAAAY9mAAC';      ROWID ='AAAHTKAABAAAY9mAAC';

    OE     1.1.1484   commit;

    HR     1.11.1476  set transaction read write;

    HR     1.11.1476  insert into "HR"."EMPLOYEES"(     delete from "HR"."EMPLOYEES" 
                      "EMPLOYEE_ID","FIRST_NAME",       where "EMPLOYEE_ID" = '306'
                      "LAST_NAME","EMAIL",              and "FIRST_NAME" = 'Nandini'
                      "PHONE_NUMBER","HIRE_DATE",       and "LAST_NAME" = 'Shastry'
                      "JOB_ID","SALARY",                and "EMAIL" = 'NSHASTRY'
                      "COMMISSION_PCT","MANAGER_ID",    and "PHONE_NUMBER" = '1234567890'
                      "DEPARTMENT_ID") values           and "HIRE_DATE" = TO_DATE('10-JAN-2012
                      ('306','Nandini','Shastry',       13:34:43', 'dd-mon-yyyy hh24:mi:ss') 
                      'NSHASTRY', '1234567890',         and "JOB_ID" = 'HR_REP' and 
                      TO_DATE('10-jan-2012 13:34:43',   "SALARY" = '120000' and 
                      'dd-mon-yyy hh24:mi:ss'),         "COMMISSION_PCT" = '.05' and
                      'HR_REP','120000', '.05',         "DEPARTMENT_ID" = '10' and
                      '105','10');                      ROWID = 'AAAHSkAABAAAY6rAAO';

    HR     1.11.1476  insert into "HR"."EMPLOYEES"(     delete from "HR"."EMPLOYEES"
                      "EMPLOYEE_ID","FIRST_NAME",       "EMPLOYEE_ID" = '307' and 
                      "LAST_NAME","EMAIL",              "FIRST_NAME" = 'John' and
                      "PHONE_NUMBER","HIRE_DATE",       "LAST_NAME" = 'Silver' and
                      "JOB_ID","SALARY",                "EMAIL" = 'JSILVER' and 
                      "COMMISSION_PCT","MANAGER_ID",    "PHONE_NUMBER" = '5551112222'
                      "DEPARTMENT_ID") values           and "HIRE_DATE" = TO_DATE('10-jan-2012
                      ('307','John','Silver',           13:41:03', 'dd-mon-yyyy hh24:mi:ss') 
                       'JSILVER', '5551112222',         and "JOB_ID" ='105' and "DEPARTMENT_ID" 
                      TO_DATE('10-jan-2012 13:41:03',   = '50' and ROWID = 'AAAHSkAABAAAY6rAAP'; 
                      'dd-mon-yyyy hh24:mi:ss'),
                      'SH_CLERK','110000', '.05',
                      '105','50');                

    HR     1.11.1476  commit;
```

5.  End the LogMiner session.

```
    EXECUTE DBMS_LOGMNR.END_LOGMNR();
```



#### Example 3: Formatting the Reconstructed SQL

As shown in [Example 2: Grouping DML Statements into Committed Transactions ](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-9CCAC3BD-EF59-4370-BAA8-5451082577A0), using the `COMMITTED_DATA_ONLY` option with the dictionary in the online redo log file is an easy way to focus on committed transactions. However, one aspect remains that makes visual inspection difficult: the association between the column names and their respective values in an `INSERT` statement are not apparent. This can be addressed by specifying the `PRINT_PRETTY_SQL` option. Note that specifying this option will make some of the reconstructed SQL statements nonexecutable.

1.  Determine which redo log file was most recently archived.

```
    SELECT NAME FROM V$ARCHIVED_LOG
       WHERE FIRST_TIME = (SELECT MAX(FIRST_TIME) FROM V$ARCHIVED_LOG);

    NAME                            
    -------------------------------------------
    /usr/oracle/data/db1arch_1_16_482701534.dbf
```

2.  Specify the redo log file that was returned by the query in Step 1.

```
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
       LOGFILENAME => '/usr/oracle/data/db1arch_1_16_482701534.dbf', -
```

3.  Start LogMiner by specifying the dictionary to use and the `COMMITTED_DATA_ONLY` and `PRINT_PRETTY_SQL` options.

    ```
    EXECUTE DBMS_LOGMNR.START_LOGMNR(-
       OPTIONS => DBMS_LOGMNR.DICT_FROM_ONLINE_CATALOG + -
                  DBMS_LOGMNR.COMMITTED_DATA_ONLY + -
                  DBMS_LOGMNR.PRINT_PRETTY_SQL);
    ```

    The `DBMS_LOGMNR.PRINT_PRETTY_SQL` option changes only the format of the reconstructed SQL, and therefore is useful for generating reports for visual inspection.

4.  Query the `V$LOGMNR_CONTENTS` view for `SQL_REDO` statements.

    ```
    SELECT username AS USR, (XIDUSN || '.' || XIDSLT || '.' ||  XIDSQN) AS XID, SQL_REDO 
       FROM V$LOGMNR_CONTENTS;

    USR    XID          SQL_REDO                     
    ----   ---------  -----------------------------------------------------

    OE     1.1.1484   set transaction read write;

    OE     1.1.1484   update "OE"."PRODUCT_INFORMATION"  
                        set 
                          "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00') 
                        where
                          "PRODUCT_ID" = '1799' and          
                          "WARRANTY_PERIOD" = TO_YMINTERVAL('+01-00') and        
                          ROWID = 'AAAHTKAABAAAY9mAAB';  

    OE     1.1.1484   update "OE"."PRODUCT_INFORMATION"
                        set 
                          "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00') 
                        where
                          "PRODUCT_ID" = '1801' and
                          "WARRANTY_PERIOD" = TO_YMINTERVAL('+01-00') and   
                          ROWID = 'AAAHTKAABAAAY9mAAC'; 

    OE     1.1.1484   commit;

    HR     1.11.1476  set transaction read write;

    HR     1.11.1476  insert into "HR"."EMPLOYEES"
                       values
                         "EMPLOYEE_ID" = 306,
                         "FIRST_NAME" = 'Nandini',
                         "LAST_NAME" = 'Shastry',
                         "EMAIL" = 'NSHASTRY',
                         "PHONE_NUMBER" = '1234567890',
                         "HIRE_DATE" = TO_DATE('10-jan-2012 13:34:43', 
                         'dd-mon-yyyy hh24:mi:ss',
                         "JOB_ID" = 'HR_REP',
                         "SALARY" = 120000,
                         "COMMISSION_PCT" = .05,
                         "MANAGER_ID" = 105,
                         "DEPARTMENT_ID" = 10;

    HR     1.11.1476   insert into "HR"."EMPLOYEES"
                        values
                           "EMPLOYEE_ID" = 307,
                           "FIRST_NAME" = 'John',
                           "LAST_NAME" = 'Silver',
                           "EMAIL" = 'JSILVER',
                           "PHONE_NUMBER" = '5551112222',
                           "HIRE_DATE" = TO_DATE('10-jan-2012 13:41:03',
                           'dd-mon-yyyy hh24:mi:ss'),
                           "JOB_ID" = 'SH_CLERK',
                           "SALARY" = 110000,
                           "COMMISSION_PCT" = .05,
                           "MANAGER_ID" = 105,
                           "DEPARTMENT_ID" = 50;
    HR     1.11.1476    commit;
    ```

5.  Query the `V$LOGMNR_CONTENTS` view for reconstructed `SQL_UNDO` statements.

    ```
    SELECT username AS USR, (XIDUSN || '.' || XIDSLT || '.' ||  XIDSQN) AS XID, SQL_UNDO 
       FROM V$LOGMNR_CONTENTS;

    USR   XID        SQL_UNDO                     
    ----   ---------  -----------------------------------------------------


    OE     1.1.1484   set transaction read write;

    OE     1.1.1484   update "OE"."PRODUCT_INFORMATION"  
                        set 
                          "WARRANTY_PERIOD" = TO_YMINTERVAL('+01-00') 
                        where
                          "PRODUCT_ID" = '1799' and          
                          "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00') and        
                          ROWID = 'AAAHTKAABAAAY9mAAB';  

    OE     1.1.1484   update "OE"."PRODUCT_INFORMATION"
                        set 
                          "WARRANTY_PERIOD" = TO_YMINTERVAL('+01-00') 
                        where
                          "PRODUCT_ID" = '1801' and
                          "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00') and   
                          ROWID = 'AAAHTKAABAAAY9mAAC'; 

    OE     1.1.1484   commit;

    HR     1.11.1476  set transaction read write;

    HR     1.11.1476  delete from "HR"."EMPLOYEES"
                      where
                         "EMPLOYEE_ID" = 306 and
                         "FIRST_NAME" = 'Nandini' and
                         "LAST_NAME" = 'Shastry' and
                         "EMAIL" = 'NSHASTRY' and
                         "PHONE_NUMBER" = '1234567890' and
                         "HIRE_DATE" = TO_DATE('10-jan-2012 13:34:43',
                         'dd-mon-yyyy hh24:mi:ss') and
                         "JOB_ID" = 'HR_REP' and 
                         "SALARY" = 120000 and
                         "COMMISSION_PCT" = .05 and
                         "MANAGER_ID" = 105 and
                         "DEPARTMENT_ID" = 10 and
                         ROWID = 'AAAHSkAABAAAY6rAAO';

    HR     1.11.1476   delete from "HR"."EMPLOYEES"
                       where
                           "EMPLOYEE_ID" = 307 and
                           "FIRST_NAME" = 'John' and
                           "LAST_NAME" = 'Silver' and
                           "EMAIL" = 'JSILVER' and
                           "PHONE_NUMBER" = '555122122' and
                           "HIRE_DATE" = TO_DATE('10-jan-2012 13:41:03',
                           'dd-mon-yyyy hh24:mi:ss') and
                           "JOB_ID" = 'SH_CLERK' and
                           "SALARY" = 110000 and
                           "COMMISSION_PCT" = .05 and
                           "MANAGER_ID" = 105 and
                           "DEPARTMENT_ID" = 50 and
                           ROWID = 'AAAHSkAABAAAY6rAAP'; 
    HR     1.11.1476    commit;
    ```

6.  End the LogMiner session.

    ```
    EXECUTE DBMS_LOGMNR.END_LOGMNR();
    ```


#### Example 4: Using the LogMiner Dictionary in the Redo Log Files

This example shows how to use the dictionary that has been extracted to the redo log files. When you use the dictionary in the online catalog, you must mine the redo log files in the same database that generated them. Using the dictionary contained in the redo log files enables you to mine redo log files in a different database. 

1.  Determine which redo log file was most recently archived by the database.

    ```
    SELECT NAME, SEQUENCE# FROM V$ARCHIVED_LOG
       WHERE FIRST_TIME = (SELECT MAX(FIRST_TIME) FROM V$ARCHIVED_LOG);

    NAME                                           SEQUENCE#
    --------------------------------------------   --------------
    /usr/oracle/data/db1arch_1_210_482701534.dbf   210
    ```

2.  The dictionary may be contained in more than one redo log file. Therefore, you need to determine which redo log files contain the start and end of the dictionary. Query the `V$ARCHIVED_LOG` view, as follows:

    1.  Find a redo log file that contains the end of the dictionary extract. This redo log file must have been created before the redo log file that you want to analyze, but should be as recent as possible. 

        ```
        SELECT NAME, SEQUENCE#, DICTIONARY_BEGIN d_beg, DICTIONARY_END d_end
           FROM V$ARCHIVED_LOG
           WHERE SEQUENCE# = (SELECT MAX (SEQUENCE#) FROM V$ARCHIVED_LOG
           WHERE DICTIONARY_END = 'YES' and SEQUENCE# <= 210);

        NAME                                           SEQUENCE#    D_BEG  D_END
        --------------------------------------------   ----------   -----  ------
        /usr/oracle/data/db1arch_1_208_482701534.dbf   208          NO     YES
        ```

    2.  Find the redo log file that contains the start of the data dictionary extract that matches the end of the dictionary found in the previous step: 

        ```
        SELECT NAME, SEQUENCE#, DICTIONARY_BEGIN d_beg, DICTIONARY_END d_end
           FROM V$ARCHIVED_LOG
           WHERE SEQUENCE# = (SELECT MAX (SEQUENCE#) FROM V$ARCHIVED_LOG
           WHERE DICTIONARY_BEGIN = 'YES' and SEQUENCE# <= 208);

        NAME                                           SEQUENCE#    D_BEG  D_END
        --------------------------------------------   ----------   -----  ------
        /usr/oracle/data/db1arch_1_207_482701534.dbf   207          YES     NO
        ```

    3.  Specify the list of the redo log files of interest. Add the redo log files that contain the start and end of the dictionary and the redo log file that you want to analyze. You can add the redo log files in any order.

        ```
        EXECUTE DBMS_LOGMNR.ADD_LOGFILE(-
           LOGFILENAME => '/usr/oracle/data/db1arch_1_210_482701534.dbf', -
               OPTIONS => DBMS_LOGMNR.NEW);
        EXECUTE DBMS_LOGMNR.ADD_LOGFILE(-
           LOGFILENAME => '/usr/oracle/data/db1arch_1_208_482701534.dbf');
        EXECUTE DBMS_LOGMNR.ADD_LOGFILE(-
           LOGFILENAME => '/usr/oracle/data/db1arch_1_207_482701534.dbf');
        ```

    4.  Query the `V$LOGMNR_LOGS` view to display the list of redo log files to be analyzed, including their timestamps. 

        In the output, LogMiner flags a missing redo log file. LogMiner lets you proceed with mining, provided that you do not specify an option that requires the missing redo log file for proper functioning.

3.  Start LogMiner by specifying the dictionary to use and the `COMMITTED_DATA_ONLY` and `PRINT_PRETTY_SQL` options.

    ```
    EXECUTE DBMS_LOGMNR.START_LOGMNR(-
       OPTIONS => DBMS_LOGMNR.DICT_FROM_REDO_LOGS + -
                  DBMS_LOGMNR.COMMITTED_DATA_ONLY + -
                  DBMS_LOGMNR.PRINT_PRETTY_SQL);
    ```

4.  Query the `V$LOGMNR_CONTENTS` view.

    To reduce the number of rows returned by the query, exclude from the query all DML statements done in the `SYS` or `SYSTEM` schemas. (This query specifies a timestamp to exclude transactions that were involved in the dictionary extraction.)

    The output shows three transactions: two DDL transactions and one DML transaction. The DDL transactions, 1.2.1594 and 1.18.1602, create the table `oe.product_tracking` and create a trigger on table `oe.product_information`, respectively. In both transactions, the DML statements done to the system tables (tables owned by `SYS`) are filtered out because of the query predicate. 

    The DML transaction, 1.9.1598, updates the `oe.product_information` table. The update operation in this transaction is fully translated. However, the query output also contains some untranslated reconstructed SQL statements. Most likely, these statements were done on the `oe.product_tracking` table that was created after the data dictionary was extracted to the redo log files. 

    (The next example shows how to run LogMiner with the `DDL_DICT_TRACKING` option so that all SQL statements are fully translated; no binary data is returned.)

    ```
    SELECT USERNAME AS usr, SQL_REDO FROM V$LOGMNR_CONTENTS 
       WHERE SEG_OWNER IS NULL OR SEG_OWNER NOT IN ('SYS', 'SYSTEM') AND
       TIMESTAMP > '10-jan-2012 15:59:53';

    USR             XID         SQL_REDO
    ---             --------    -----------------------------------
    SYS             1.2.1594    set transaction read write;
    SYS             1.2.1594    create table oe.product_tracking (product_id number not null,
                                modified_time date,
                                old_list_price number(8,2),
                                old_warranty_period interval year(2) to month);
    SYS             1.2.1594    commit;

    SYS             1.18.1602   set transaction read write;
    SYS             1.18.1602   create or replace trigger oe.product_tracking_trigger
                                before update on oe.product_information
                                for each row
                                when (new.list_price <> old.list_price or
                                      new.warranty_period <> old.warranty_period)
                                declare
                                begin
                                insert into oe.product_tracking values 
                                   (:old.product_id, sysdate,
                                    :old.list_price, :old.warranty_period);
                                end;
    SYS             1.18.1602   commit;

    OE              1.9.1598    update "OE"."PRODUCT_INFORMATION"
                                  set
                                    "WARRANTY_PERIOD" = TO_YMINTERVAL('+08-00'),
                                    "LIST_PRICE" = 100
                                  where
                                    "PRODUCT_ID" = 1729 and
                                    "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00') and
                                    "LIST_PRICE" = 80 and
                                    ROWID = 'AAAHTKAABAAAY9yAAA';

    OE              1.9.1598    insert into "UNKNOWN"."OBJ# 33415"
                                  values
                                    "COL 1" = HEXTORAW('c2121e'),
                                    "COL 2" = HEXTORAW('7867010d110804'),
                                    "COL 3" = HEXTORAW('c151'),
                                    "COL 4" = HEXTORAW('800000053c');

    OE              1.9.1598    update "OE"."PRODUCT_INFORMATION"
                                  set
                                    "WARRANTY_PERIOD" = TO_YMINTERVAL('+08-00'),
                                    "LIST_PRICE" = 92
                                  where
                                    "PRODUCT_ID" = 2340 and
                                    "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00') and
                                    "LIST_PRICE" = 72 and
                                    ROWID = 'AAAHTKAABAAAY9zAAA';

    OE              1.9.1598    insert into "UNKNOWN"."OBJ# 33415"
                                  values
                                    "COL 1" = HEXTORAW('c21829'),
                                    "COL 2" = HEXTORAW('7867010d110808'),
                                    "COL 3" = HEXTORAW('c149'),
                                    "COL 4" = HEXTORAW('800000053c');

    OE              1.9.1598     commit;
    ```

5.  Issue additional queries, if desired.

    Display all the DML statements that were executed as part of the `CREATE TABLE` DDL statement. This includes statements executed by users and internally by Oracle. 

    Note:

    If you choose to reapply statements displayed by a query such as the one shown here, then reapply DDL statements only. Do not reapply DML statements that were executed internally by Oracle, or you risk corrupting your database. In the following output, the only statement that you should use in a reapply operation is the `CREATE TABLE OE.PRODUCT_TRACKING` statement.

    ```sql
    SELECT SQL_REDO FROM V$LOGMNR_CONTENTS
       WHERE XIDUSN  = 1 and XIDSLT = 2 and XIDSQN = 1594;

    SQL_REDO
    --------------------------------------------------------------------------------
    set transaction read write;

    insert into "SYS"."OBJ$"
     values
        "OBJ#" = 33415,
        "DATAOBJ#" = 33415,
        "OWNER#" = 37,
        "NAME" = 'PRODUCT_TRACKING',
        "NAMESPACE" = 1,
        "SUBNAME" IS NULL,
        "TYPE#" = 2,
        "CTIME" = TO_DATE('13-jan-2012 14:01:03', 'dd-mon-yyyy hh24:mi:ss'),
        "MTIME" = TO_DATE('13-jan-2012 14:01:03', 'dd-mon-yyyy hh24:mi:ss'),
        "STIME" = TO_DATE('13-jan-2012 14:01:03', 'dd-mon-yyyy hh24:mi:ss'),
        "STATUS" = 1,
        "REMOTEOWNER" IS NULL,
        "LINKNAME" IS NULL,
        "FLAGS" = 0,
        "OID$" IS NULL,
        "SPARE1" = 6,
        "SPARE2" = 1,
        "SPARE3" IS NULL,
        "SPARE4" IS NULL,
        "SPARE5" IS NULL,
        "SPARE6" IS NULL;

    insert into "SYS"."TAB$"
     values
        "OBJ#" = 33415,
        "DATAOBJ#" = 33415,
        "TS#" = 0,
        "FILE#" = 1,
        "BLOCK#" = 121034,
        "BOBJ#" IS NULL,
        "TAB#" IS NULL,
        "COLS" = 5,
        "CLUCOLS" IS NULL,
        "PCTFREE$" = 10,
        "PCTUSED$" = 40,
        "INITRANS" = 1,
        "MAXTRANS" = 255,
        "FLAGS" = 1,
        "AUDIT$" = '--------------------------------------',
        "ROWCNT" IS NULL,
        "BLKCNT" IS NULL,
        "EMPCNT" IS NULL,
        "AVGSPC" IS NULL,
        "CHNCNT" IS NULL,
        "AVGRLN" IS NULL,
        "AVGSPC_FLB" IS NULL,
        "FLBCNT" IS NULL,
        "ANALYZETIME" IS NULL,
        "SAMPLESIZE" IS NULL,
        "DEGREE" IS NULL,
        "INSTANCES" IS NULL,
        "INTCOLS" = 5,
        "KERNELCOLS" = 5,
        "PROPERTY" = 536870912,
        "TRIGFLAG" = 0,
        "SPARE1" = 178,
        "SPARE2" IS NULL,
        "SPARE3" IS NULL,
        "SPARE4" IS NULL,
        "SPARE5" IS NULL,
        "SPARE6" = TO_DATE('13-jan-2012 14:01:05', 'dd-mon-yyyy hh24:mi:ss'),

    insert into "SYS"."COL$"
     values
        "OBJ#" = 33415,
        "COL#" = 1,
        "SEGCOL#" = 1,
        "SEGCOLLENGTH" = 22,
        "OFFSET" = 0,
        "NAME" = 'PRODUCT_ID',
        "TYPE#" = 2,
        "LENGTH" = 22,
        "FIXEDSTORAGE" = 0,
        "PRECISION#" IS NULL,
        "SCALE" IS NULL,
        "NULL$" = 1,
        "DEFLENGTH" IS NULL,
        "SPARE6" IS NULL,
        "INTCOL#" = 1,
        "PROPERTY" = 0,
        "CHARSETID" = 0,
        "CHARSETFORM" = 0,
        "SPARE1" = 0,
        "SPARE2" = 0,
        "SPARE3" = 0,
        "SPARE4" IS NULL,
        "SPARE5" IS NULL,
        "DEFAULT$" IS NULL;

    insert into "SYS"."COL$"
     values
        "OBJ#" = 33415,
        "COL#" = 2,
        "SEGCOL#" = 2,
        "SEGCOLLENGTH" = 7,
        "OFFSET" = 0,
        "NAME" = 'MODIFIED_TIME',
        "TYPE#" = 12,
        "LENGTH" = 7,
        "FIXEDSTORAGE" = 0,
        "PRECISION#" IS NULL,
        "SCALE" IS NULL,
        "NULL$" = 0,
        "DEFLENGTH" IS NULL,
        "SPARE6" IS NULL,
        "INTCOL#" = 2,
        "PROPERTY" = 0,
        "CHARSETID" = 0,
        "CHARSETFORM" = 0,
        "SPARE1" = 0,
        "SPARE2" = 0,
        "SPARE3" = 0,
        "SPARE4" IS NULL,
        "SPARE5" IS NULL,
        "DEFAULT$" IS NULL;

    insert into "SYS"."COL$"
     values
        "OBJ#" = 33415,
        "COL#" = 3,
        "SEGCOL#" = 3,
        "SEGCOLLENGTH" = 22,
        "OFFSET" = 0,
        "NAME" = 'OLD_LIST_PRICE',
        "TYPE#" = 2,
        "LENGTH" = 22,
        "FIXEDSTORAGE" = 0,
        "PRECISION#" = 8,
        "SCALE" = 2,
        "NULL$" = 0,
        "DEFLENGTH" IS NULL,
        "SPARE6" IS NULL,
        "INTCOL#" = 3,
        "PROPERTY" = 0,
        "CHARSETID" = 0,
        "CHARSETFORM" = 0,
        "SPARE1" = 0,
        "SPARE2" = 0,
        "SPARE3" = 0,
        "SPARE4" IS NULL,
        "SPARE5" IS NULL,
        "DEFAULT$" IS NULL;

    insert into "SYS"."COL$"
     values
        "OBJ#" = 33415,
        "COL#" = 4,
        "SEGCOL#" = 4,
        "SEGCOLLENGTH" = 5,
        "OFFSET" = 0,
        "NAME" = 'OLD_WARRANTY_PERIOD',
        "TYPE#" = 182,
        "LENGTH" = 5,
        "FIXEDSTORAGE" = 0,
        "PRECISION#" = 2,
        "SCALE" = 0,
        "NULL$" = 0,
        "DEFLENGTH" IS NULL,
        "SPARE6" IS NULL,
        "INTCOL#" = 4,
        "PROPERTY" = 0,
        "CHARSETID" = 0,
        "CHARSETFORM" = 0,
        "SPARE1" = 0,
        "SPARE2" = 2,
        "SPARE3" = 0,
        "SPARE4" IS NULL,
        "SPARE5" IS NULL,
        "DEFAULT$" IS NULL;

    insert into "SYS"."CCOL$"
     values
        "OBJ#" = 33415,
        "CON#" = 2090,
        "COL#" = 1,
        "POS#" IS NULL,
        "INTCOL#" = 1,
        "SPARE1" = 0,
        "SPARE2" IS NULL,
        "SPARE3" IS NULL,
        "SPARE4" IS NULL,
        "SPARE5" IS NULL,
        "SPARE6" IS NULL;

    insert into "SYS"."CDEF$"
     values
        "OBJ#" = 33415,
        "CON#" = 2090,
        "COLS" = 1,
        "TYPE#" = 7,
        "ROBJ#" IS NULL,
        "RCON#" IS NULL,
        "RRULES" IS NULL,
        "MATCH#" IS NULL,
        "REFACT" IS NULL,
        "ENABLED" = 1,
        "CONDLENGTH" = 24,
        "SPARE6" IS NULL,
        "INTCOLS" = 1,
        "MTIME" = TO_DATE('13-jan-2012 14:01:08', 'dd-mon-yyyy hh24:mi:ss'),
        "DEFER" = 12,
        "SPARE1" = 6,
        "SPARE2" IS NULL,
        "SPARE3" IS NULL,
        "SPARE4" IS NULL,
        "SPARE5" IS NULL,
        "CONDITION" = '"PRODUCT_ID" IS NOT NULL';

    create table oe.product_tracking (product_id number not null,
      modified_time date,
      old_product_description varchar2(2000),
      old_list_price number(8,2),
      old_warranty_period interval year(2) to month);

    update "SYS"."SEG$"
      set
        "TYPE#" = 5,
        "BLOCKS" = 5,
        "EXTENTS" = 1,
        "INIEXTS" = 5,
        "MINEXTS" = 1,
        "MAXEXTS" = 121,
        "EXTSIZE" = 5,
        "EXTPCT" = 50,
        "USER#" = 37,
        "LISTS" = 0,
        "GROUPS" = 0,
        "CACHEHINT" = 0,
        "HWMINCR" = 33415,
        "SPARE1" = 1024
      where
        "TS#" = 0 and
        "FILE#" = 1 and
        "BLOCK#" = 121034 and
        "TYPE#" = 3 and
        "BLOCKS" = 5 and
        "EXTENTS" = 1 and
        "INIEXTS" = 5 and
        "MINEXTS" = 1 and
        "MAXEXTS" = 121 and
        "EXTSIZE" = 5 and
        "EXTPCT" = 50 and
        "USER#" = 37 and
        "LISTS" = 0 and
        "GROUPS" = 0 and
        "BITMAPRANGES" = 0 and
        "CACHEHINT" = 0 and
        "SCANHINT" = 0 and
        "HWMINCR" = 33415 and
        "SPARE1" = 1024 and
        "SPARE2" IS NULL and
        ROWID = 'AAAAAIAABAAAdMOAAB';

    insert into "SYS"."CON$"
     values
        "OWNER#" = 37,
        "NAME" = 'SYS_C002090',
        "CON#" = 2090,
        "SPARE1" IS NULL,
        "SPARE2" IS NULL,
        "SPARE3" IS NULL,
        "SPARE4" IS NULL,
        "SPARE5" IS NULL,
        "SPARE6" IS NULL;

    commit;
```

1.  End the LogMiner session.

  ```sql
    EXECUTE DBMS_LOGMNR.END_LOGMNR();
 ```

#### Example 5: Tracking DDL Statements in the Internal Dictionary

By using the `DBMS_LOGMNR.DDL_DICT_TRACKING` option, this example ensures that the LogMiner internal dictionary is updated with the DDL statements encountered in the redo log files.

1.  Determine which redo log file was most recently archived by the database.

    ```
    SELECT NAME, SEQUENCE# FROM V$ARCHIVED_LOG 
       WHERE FIRST_TIME = (SELECT MAX(FIRST_TIME) FROM V$ARCHIVED_LOG);

    NAME                                           SEQUENCE#
    --------------------------------------------   --------------
    /usr/oracle/data/db1arch_1_210_482701534.dbf   210
    ```

2.  Because the dictionary may be contained in more than one redo log file, you need to determine which redo log files contain the start and end of the data dictionary. Query the `V$ARCHIVED_LOG` view, as follows:

    1.  Find a redo log that contains the end of the data dictionary extract. This redo log file must have been created before the redo log files that you want to analyze, but should be as recent as possible. 

        ```
        SELECT NAME, SEQUENCE#, DICTIONARY_BEGIN d_beg, DICTIONARY_END d_end
           FROM V$ARCHIVED_LOG
           WHERE SEQUENCE# = (SELECT MAX (SEQUENCE#) FROM V$ARCHIVED_LOG
           WHERE DICTIONARY_END = 'YES' and SEQUENCE# < 210);

        NAME                                           SEQUENCE#    D_BEG  D_END
        --------------------------------------------   ----------   -----  ------
        /usr/oracle/data/db1arch_1_208_482701534.dbf   208          NO     YES
        ```

    2.  Find the redo log file that contains the start of the data dictionary extract that matches the end of the dictionary found by the previous SQL statement: 

        ```
        SELECT NAME, SEQUENCE#, DICTIONARY_BEGIN d_beg, DICTIONARY_END d_end
           FROM V$ARCHIVED_LOG
           WHERE SEQUENCE# = (SELECT MAX (SEQUENCE#) FROM V$ARCHIVED_LOG
           WHERE DICTIONARY_BEGIN = 'YES' and SEQUENCE# <= 208);

        NAME                                           SEQUENCE#    D_BEG  D_END
        --------------------------------------------   ----------   -----  ------
        /usr/oracle/data/db1arch_1_208_482701534.dbf   207          YES     NO
        ```

3.  Ensure that you have a complete list of redo log files.

    To successfully apply DDL statements encountered in the redo log files, ensure that all files are included in the list of redo log files to mine. The missing log file corresponding to sequence# 209 must be included in the list. Determine the names of the redo log files that you need to add to the list by issuing the following query:

    ```
    SELECT NAME FROM V$ARCHIVED_LOG
       WHERE SEQUENCE# >= 207 AND SEQUENCE# <= 210 
       ORDER BY SEQUENCE# ASC;

    NAME                                           
    --------------------------------------------   
    /usr/oracle/data/db1arch_1_207_482701534.dbf  
    /usr/oracle/data/db1arch_1_208_482701534.dbf  
    /usr/oracle/data/db1arch_1_209_482701534.dbf  
    /usr/oracle/data/db1arch_1_210_482701534.dbf  
    ```

4.  Specify the list of the redo log files of interest.

    Include the redo log files that contain the beginning and end of the dictionary, the redo log file that you want to mine, and any redo log files required to create a list without gaps. You can add the redo log files in any order.

    ```
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE(-
       LOGFILENAME => '/usr/oracle/data/db1arch_1_210_482701534.dbf', -
    ```

    ```
          OPTIONS => DBMS_LOGMNR.NEW);
    ```

    ```
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE(-
       LOGFILENAME => '/usr/oracle/data/db1arch_1_209_482701534.dbf');
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE(-
       LOGFILENAME => '/usr/oracle/data/db1arch_1_208_482701534.dbf');
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE(-
       LOGFILENAME => '/usr/oracle/data/db1arch_1_207_482701534.dbf');
    ```

5.  Start LogMiner by specifying the dictionary to use and the `DDL_DICT_TRACKING`, `COMMITTED_DATA_ONLY`, and `PRINT_PRETTY_SQL` options.

    ```
    EXECUTE DBMS_LOGMNR.START_LOGMNR(-
       OPTIONS => DBMS_LOGMNR.DICT_FROM_REDO_LOGS + -
                  DBMS_LOGMNR.DDL_DICT_TRACKING + -
                  DBMS_LOGMNR.COMMITTED_DATA_ONLY + -
                  DBMS_LOGMNR.PRINT_PRETTY_SQL);
    ```

6.  Query the `V$LOGMNR_CONTENTS` view.

    To reduce the number of rows returned, exclude from the query all DML statements done in the `SYS` or `SYSTEM` schemas. (This query specifies a timestamp to exclude transactions that were involved in the dictionary extraction.)

    The query returns all the reconstructed SQL statements correctly translated and the insert operations on the `oe.product_tracking` table that occurred because of the trigger execution.

    ```
    SELECT USERNAME AS usr,(XIDUSN || '.' || XIDSLT || '.' || XIDSQN) as XID, SQL_REDO FROM  
       V$LOGMNR_CONTENTS 
       WHERE SEG_OWNER IS NULL OR SEG_OWNER NOT IN ('SYS', 'SYSTEM') AND
       TIMESTAMP > '10-jan-2012 15:59:53';

    USR             XID         SQL_REDO
    -----------     --------    -----------------------------------
    SYS             1.2.1594    set transaction read write;
    SYS             1.2.1594    create table oe.product_tracking (product_id number not null,
                                modified_time date,
                                old_list_price number(8,2),
                                old_warranty_period interval year(2) to month);
    SYS             1.2.1594    commit;

    SYS             1.18.1602   set transaction read write;
    SYS             1.18.1602   create or replace trigger oe.product_tracking_trigger
                                before update on oe.product_information
                                for each row
                                when (new.list_price <> old.list_price or
                                      new.warranty_period <> old.warranty_period)
                                declare
                                begin
                                insert into oe.product_tracking values 
                                   (:old.product_id, sysdate,
                                    :old.list_price, :old.warranty_period);
                                end;
    SYS             1.18.1602   commit;

    OE              1.9.1598    update "OE"."PRODUCT_INFORMATION"
                                  set
                                    "WARRANTY_PERIOD" = TO_YMINTERVAL('+08-00'),
                                    "LIST_PRICE" = 100
                                  where
                                    "PRODUCT_ID" = 1729 and
                                    "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00') and
                                    "LIST_PRICE" = 80 and
                                    ROWID = 'AAAHTKAABAAAY9yAAA';
    OE              1.9.1598    insert into "OE"."PRODUCT_TRACKING"
                                  values
                                    "PRODUCT_ID" = 1729,
                                    "MODIFIED_TIME" = TO_DATE('13-jan-2012 16:07:03', 
                                    'dd-mon-yyyy hh24:mi:ss'),
                                    "OLD_LIST_PRICE" = 80,
                                    "OLD_WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00');

    OE              1.9.1598    update "OE"."PRODUCT_INFORMATION"
                                  set
                                    "WARRANTY_PERIOD" = TO_YMINTERVAL('+08-00'),
                                    "LIST_PRICE" = 92
                                  where
                                    "PRODUCT_ID" = 2340 and
                                    "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00') and
                                    "LIST_PRICE" = 72 and
                                    ROWID = 'AAAHTKAABAAAY9zAAA';

    OE              1.9.1598    insert into "OE"."PRODUCT_TRACKING"
                                  values
                                    "PRODUCT_ID" = 2340,
                                    "MODIFIED_TIME" = TO_DATE('13-jan-2012 16:07:07', 
                                    'dd-mon-yyyy hh24:mi:ss'),
                                    "OLD_LIST_PRICE" = 72,
                                    "OLD_WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00');

    OE              1.9.1598     commit;
    ```

7.  End the LogMiner session.

    ```
    EXECUTE DBMS_LOGMNR.END_LOGMNR();
    ```

#### Example 6: Filtering Output by Time Range

In the previous two examples, rows were filtered by specifying a timestamp-based predicate (timestamp > '10-jan-2012 15:59:53') in the query. However, a more efficient way to filter out redo records based on timestamp values is by specifying the time range in the `DBMS_LOGMNR.START_LOGMNR` procedure call, as shown in this example. 

1.  Create a list of redo log files to mine.

    Suppose you want to mine redo log files generated since a given time. The following procedure creates a list of redo log files based on a specified time. The subsequent SQL `EXECUTE` statement calls the procedure and specifies the starting time as 2 p.m. on Jan-13-2012.

    ```
    --
    -- my_add_logfiles
    -- Add all archived logs generated after a specified start_time.
    --
    CREATE OR REPLACE PROCEDURE my_add_logfiles (in_start_time  IN DATE) AS
      CURSOR  c_log IS 
        SELECT NAME FROM V$ARCHIVED_LOG 
          WHERE FIRST_TIME >= in_start_time;

    count      pls_integer := 0;
    my_option  pls_integer := DBMS_LOGMNR.NEW;

    BEGIN
      FOR c_log_rec IN c_log
      LOOP
        DBMS_LOGMNR.ADD_LOGFILE(LOGFILENAME => c_log_rec.name, 
                                OPTIONS => my_option);
        my_option := DBMS_LOGMNR.ADDFILE;
        DBMS_OUTPUT.PUT_LINE('Added logfile ' || c_log_rec.name);
      END LOOP;
    END;
    /

    EXECUTE my_add_logfiles(in_start_time => '13-jan-2012 14:00:00');
    ```

2.  Query the `V$LOGMNR_LOGS` to see the list of redo log files.

    This example includes the size of the redo log files in the output.

    ```
    SELECT FILENAME name, LOW_TIME start_time, FILESIZE bytes 
        FROM V$LOGMNR_LOGS;

    NAME                                START_TIME            BYTES
    ----------------------------------- --------------------  ----------------
    /usr/orcl/arch1_310_482932022.dbf    13-jan-2012 14:02:35  23683584
    /usr/orcl/arch1_311_482932022.dbf    13-jan-2012 14:56:35  2564096
    /usr/orcl/arch1_312_482932022.dbf    13-jan-2012 15:10:43  23683584
    /usr/orcl/arch1_313_482932022.dbf    13-jan-2012 15:17:52  23683584
    /usr/orcl/arch1_314_482932022.dbf    13-jan-2012 15:23:10  23683584
    /usr/orcl/arch1_315_482932022.dbf    13-jan-2012 15:43:22  23683584
    /usr/orcl/arch1_316_482932022.dbf    13-jan-2012 16:03:10  23683584
    /usr/orcl/arch1_317_482932022.dbf    13-jan-2012 16:33:43  23683584
    /usr/orcl/arch1_318_482932022.dbf    13-jan-2012 17:23:10  23683584
    ```

3.  Adjust the list of redo log files.

    Suppose you realize that you want to mine just the redo log files generated between 3 p.m. and 4 p.m. 

    You could use the query predicate (`timestamp > '13-jan-2012 15:00:00' and timestamp < '13-jan-2012 16:00:00'`) to accomplish this. However, the query predicate is evaluated on each row returned by LogMiner, and the internal mining engine does not filter rows based on the query predicate. Thus, although you only wanted to get rows out of redo log files `arch1_311_482932022.dbf` to `arch1_315_482932022.dbf,` your query would result in mining all redo log files registered to the LogMiner session. 

    Furthermore, although you could use the query predicate and manually remove the redo log files that do not fall inside the time range of interest, the simplest solution is to specify the time range of interest in the `DBMS_LOGMNR.START_LOGMNR` procedure call. 

    Although this does not change the list of redo log files, LogMiner will mine only those redo log files that fall in the time range specified. 

    ```
    EXECUTE DBMS_LOGMNR.START_LOGMNR(-
       STARTTIME => '13-jan-2012 15:00:00', -
       ENDTIME   => '13-jan-2012 16:00:00', -
       OPTIONS   => DBMS_LOGMNR.DICT_FROM_ONLINE_CATALOG + -
                    DBMS_LOGMNR.COMMITTED_DATA_ONLY + -
                    DBMS_LOGMNR.PRINT_PRETTY_SQL);
    ```

4.  Query the `V$LOGMNR_CONTENTS` view.

    ```
    SELECT TIMESTAMP, (XIDUSN || '.' || XIDSLT || '.' || XIDSQN) AS XID,
    ```

    ```
    SQL_REDO FROM V$LOGMNR_CONTENTS WHERE SEG_OWNER = 'OE';

    TIMESTAMP              XID          SQL_REDO
    ---------------------  -----------  --------------------------------
    13-jan-2012 15:29:31   1.17.2376    update "OE"."PRODUCT_INFORMATION"
                                          set
                                            "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00')
                                          where
                                            "PRODUCT_ID" = 3399 and
                                            "WARRANTY_PERIOD" = TO_YMINTERVAL('+02-00') and
                                            ROWID = 'AAAHTKAABAAAY9TAAE';
    13-jan-2012 15:29:34   1.17.2376      insert into "OE"."PRODUCT_TRACKING"
                                            values
                                            "PRODUCT_ID" = 3399,
                                            "MODIFIED_TIME" = TO_DATE('13-jan-2012 15:29:34', 
                                            'dd-mon-yyyy hh24:mi:ss'),
                                            "OLD_LIST_PRICE" = 815,
                                            "OLD_WARRANTY_PERIOD" = TO_YMINTERVAL('+02-00');

    13-jan-2012 15:52:43   1.15.1756      update "OE"."PRODUCT_INFORMATION"
                                            set
                                              "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00')
                                            where
                                              "PRODUCT_ID" = 1768 and
                                              "WARRANTY_PERIOD" = TO_YMINTERVAL('+02-00') and
                                              ROWID = 'AAAHTKAABAAAY9UAAB';

    13-jan-2012 15:52:43   1.15.1756      insert into "OE"."PRODUCT_TRACKING"
                                            values
                                            "PRODUCT_ID" = 1768,
                                            "MODIFIED_TIME" = TO_DATE('13-jan-2012 16:52:43', 
                                            'dd-mon-yyyy hh24:mi:ss'),
                                            "OLD_LIST_PRICE" = 715,
                                            "OLD_WARRANTY_PERIOD" = TO_YMINTERVAL('+02-00');
    ```

5.  End the LogMiner session.

    ```
    EXECUTE DBMS_LOGMNR.END_LOGMNR();
    ```

### Examples of Mining Without Specifying the List of Redo Log Files Explicitly

Examples that do not specify redo log files.

The previous set of examples explicitly specified the redo log file or files to be mined. However, if you are mining in the same database that generated the redo log files, then you can mine the appropriate list of redo log files by just specifying the time (or SCN) range of interest. To mine a set of redo log files without explicitly specifying them, specify either a time range or an SCN range of interest.

Note:The `continuous_mine` option for the `dbms_logmnr.start_logmnr` package is desupported in Oracle Database 19c (19.1), and is no longer available.

This section contains the following list of examples; these examples are best read in sequential order, because each example builds on the example or examples that precede it:

The SQL output formatting may be different on your display than that shown in these examples. 


#### Example 1: Mining Redo Log Files in a Given Time Range

This example is similar to Example 4: Using the LogMiner Dictionary in the Redo Log Files, except the list of redo log files are not specified explicitly. This example assumes that you want to use the data dictionary extracted to the redo log files.

1.  Determine the timestamp of the redo log file that contains the start of the data dictionary.

    ```
    SELECT NAME, FIRST_TIME FROM V$ARCHIVED_LOG
    ```

    ```
       WHERE SEQUENCE# = (SELECT MAX(SEQUENCE#) FROM V$ARCHIVED_LOG 
        WHERE DICTIONARY_BEGIN = 'YES');

    NAME                                          FIRST_TIME
    --------------------------------------------  --------------------
    /usr/oracle/data/db1arch_1_207_482701534.dbf  10-jan-2012 12:01:34
    ```

2.  Display all the redo log files that have been generated so far.

    ```
    SELECT FILENAME name FROM V$LOGMNR_LOGS
       WHERE LOW_TIME > '10-jan-2012 12:01:34';

    NAME
    ----------------------------------------------
    /usr/oracle/data/db1arch_1_207_482701534.dbf
    /usr/oracle/data/db1arch_1_208_482701534.dbf
    /usr/oracle/data/db1arch_1_209_482701534.dbf
    /usr/oracle/data/db1arch_1_210_482701534.dbf
    ```

3.  Start LogMiner by specifying the dictionary to use and the `COMMITTED_DATA_ONLY` and `PRINT_PRETTY_SQL` options.

    ```
    EXECUTE DBMS_LOGMNR.START_LOGMNR(-
       STARTTIME => '10-jan-2012 12:01:34', -
         ENDTIME => SYSDATE, -
         OPTIONS => DBMS_LOGMNR.DICT_FROM_REDO_LOGS + -
                    DBMS_LOGMNR.COMMITTED_DATA_ONLY + -
                    DBMS_LOGMNR.PRINT_PRETTY_SQL + -
                        );
    ```

4.  Query the `V$LOGMNR_LOGS` view.

    This step shows that the `DBMS_LOGMNR.START_LOGMNR` procedure includes all of the redo log files that have been generated so far, as expected. (Compare the output in this step to the output in Step 2.)

    ```
    SELECT FILENAME name FROM V$LOGMNR_LOGS;

    NAME
    ------------------------------------------------------
    /usr/oracle/data/db1arch_1_207_482701534.dbf
    /usr/oracle/data/db1arch_1_208_482701534.dbf
    /usr/oracle/data/db1arch_1_209_482701534.dbf
    /usr/oracle/data/db1arch_1_210_482701534.dbf
    ```

5.  Query the `V$LOGMNR_CONTENTS` view.

    To reduce the number of rows returned by the query, exclude all DML statements done in the `SYS` or `SYSTEM` schema. (This query specifies a timestamp to exclude transactions that were involved in the dictionary extraction.)

    Note that all reconstructed SQL statements returned by the query are correctly translated.

    ```
    SELECT USERNAME AS usr,(XIDUSN || '.' || XIDSLT || '.' || XIDSQN) as XID, 
       SQL_REDO FROM V$LOGMNR_CONTENTS 
       WHERE SEG_OWNER IS NULL OR SEG_OWNER NOT IN ('SYS', 'SYSTEM') AND
       TIMESTAMP > '10-jan-2012 15:59:53';

    USR             XID         SQL_REDO
    -----------     --------    -----------------------------------
    SYS             1.2.1594    set transaction read write;
    SYS             1.2.1594    create table oe.product_tracking (product_id number not null,
                                modified_time date,
                                old_list_price number(8,2),
                                old_warranty_period interval year(2) to month);
    SYS             1.2.1594    commit;

    SYS             1.18.1602   set transaction read write;
    SYS             1.18.1602   create or replace trigger oe.product_tracking_trigger
                                before update on oe.product_information
                                for each row
                                when (new.list_price <> old.list_price or
                                      new.warranty_period <> old.warranty_period)
                                declare
                                begin
                                insert into oe.product_tracking values 
                                   (:old.product_id, sysdate,
                                    :old.list_price, :old.warranty_period);
                                end;
    SYS             1.18.1602   commit;

    OE              1.9.1598    update "OE"."PRODUCT_INFORMATION"
                                  set
                                    "WARRANTY_PERIOD" = TO_YMINTERVAL('+08-00'),
                                    "LIST_PRICE" = 100
                                  where
                                    "PRODUCT_ID" = 1729 and
                                    "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00') and
                                    "LIST_PRICE" = 80 and
                                    ROWID = 'AAAHTKAABAAAY9yAAA';
    OE              1.9.1598    insert into "OE"."PRODUCT_TRACKING"
                                  values
                                    "PRODUCT_ID" = 1729,
                                    "MODIFIED_TIME" = TO_DATE('13-jan-2012 16:07:03', 
                                    'dd-mon-yyyy hh24:mi:ss'),
                                    "OLD_LIST_PRICE" = 80,
                                    "OLD_WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00');

    OE              1.9.1598    update "OE"."PRODUCT_INFORMATION"
                                  set
                                    "WARRANTY_PERIOD" = TO_YMINTERVAL('+08-00'),
                                    "LIST_PRICE" = 92
                                  where
                                    "PRODUCT_ID" = 2340 and
                                    "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00') and
                                    "LIST_PRICE" = 72 and
                                    ROWID = 'AAAHTKAABAAAY9zAAA';

    OE              1.9.1598    insert into "OE"."PRODUCT_TRACKING"
                                  values
                                    "PRODUCT_ID" = 2340,
                                    "MODIFIED_TIME" = TO_DATE('13-jan-2012 16:07:07', 
                                    'dd-mon-yyyy hh24:mi:ss'),
                                    "OLD_LIST_PRICE" = 72,
                                    "OLD_WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00');

    OE              1.9.1598     commit;
    ```

6.  End the LogMiner session.

    ```
    EXECUTE DBMS_LOGMNR.END_LOGMNR();
    ```


#### Example 2: Mining the Redo Log Files in a Given SCN Range

This example shows how to specify an SCN range of interest and mine the redo log files that satisfy that range. You can use LogMiner to see all committed DML statements whose effects have not yet been made permanent in the data files.

Note that in this example (unlike the other examples) it is not assumed that you have set the `NLS_DATE_FORMAT` parameter.

1.  Determine the SCN of the last checkpoint taken.

    ```
    SELECT CHECKPOINT_CHANGE#, CURRENT_SCN FROM V$DATABASE;
    ```

    ```
    CHECKPOINT_CHANGE#  CURRENT_SCN
    ------------------  ---------------
              56453576         56454208
    ```

2.  Start LogMiner.

    ```
    EXECUTE DBMS_LOGMNR.START_LOGMNR(-
    ```

    ```
      STARTSCN => 56453576, -
       ENDSCN   => 56454208, -
       OPTIONS  => DBMS_LOGMNR.DICT_FROM_ONLINE_CATALOG + -
                   DBMS_LOGMNR.COMMITTED_DATA_ONLY + -
                   DBMS_LOGMNR.PRINT_PRETTY_SQL + -
                   );
    ```

3.  Display the list of archived redo log files added by LogMiner.

    ```
    SELECT FILENAME name, LOW_SCN, NEXT_SCN FROM V$LOGMNR_LOGS;
    ```

    ```
    NAME                                           LOW_SCN   NEXT_SCN
    --------------------------------------------   --------  --------
    /usr/oracle/data/db1arch_1_215_482701534.dbf   56316771  56453579
    ```

    Note that the redo log file that LogMiner added does not contain the whole SCN range. LogMiner adds the rest of the SCN range contained in the online redo log files automatically, as needed during the query execution. Use the following query to determine whether the redo log file added is the latest archived redo log file produced.

    ```
    SELECT NAME FROM V$ARCHIVED_LOG 
       WHERE SEQUENCE# = (SELECT MAX(SEQUENCE#) FROM V$ARCHIVED_LOG);

    NAME
    -------------------------------------------- 
    /usr/oracle/data/db1arch_1_215_482701534.dbf 
    ```

4.  Query the `V$LOGMNR_CONTENTS` view for changes made to the user tables.

    The following query does not return the `SET TRANSACTION READ WRITE` and `COMMIT` statements associated with transaction 1.6.1911 because these statements do not have a segment owner (`SEG_OWNER`) associated with them.

    Note that the default `NLS_DATE_FORMAT`, 'DD-MON-RR', is used to display the column `MODIFIED_TIME` of type `DATE`.

    ```
    SELECT SCN, (XIDUSN || '.' || XIDSLT || '.' ||  XIDSQN) as XID, SQL_REDO 
        FROM V$LOGMNR_CONTENTS
        WHERE SEG_OWNER NOT IN ('SYS', 'SYSTEM');

    SCN        XID        SQL_REDO
    ---------- ---------- -------------
    56454198   1.6.1911   update "OE"."PRODUCT_INFORMATION"
                            set
                              "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00')
                            where
                              "PRODUCT_ID" = 2430 and
                              "WARRANTY_PERIOD" = TO_YMINTERVAL('+02-00') and
                              ROWID = 'AAAHTKAABAAAY9AAAC';

    56454199   1.6.1911   insert into "OE"."PRODUCT_TRACKING"
                            values
                              "PRODUCT_ID" = 2430,
                              "MODIFIED_TIME" = TO_DATE('17-JAN-03', 'DD-MON-RR'),
                              "OLD_LIST_PRICE" = 175,
                              "OLD_WARRANTY_PERIOD" = TO_YMINTERVAL('+02-00');

    56454204   1.6.1911    update "OE"."PRODUCT_INFORMATION"
                             set
                               "WARRANTY_PERIOD" = TO_YMINTERVAL('+05-00')
                             where
                               "PRODUCT_ID" = 2302 and
                               "WARRANTY_PERIOD" = TO_YMINTERVAL('+02-00') and
                               ROWID = 'AAAHTKAABAAAY9QAAA';
    56454206   1.6.1911    insert into "OE"."PRODUCT_TRACKING"
                             values
                               "PRODUCT_ID" = 2302,
                               "MODIFIED_TIME" = TO_DATE('17-JAN-03', 'DD-MON-RR'),
                               "OLD_LIST_PRICE" = 150,
                               "OLD_WARRANTY_PERIOD" = TO_YMINTERVAL('+02-00');
    ```

5.  End the LogMiner session.

    ```
    EXECUTE DBMS_LOGMNR.END_LOGMNR();
    ```


#### Example 3: Using Continuous Mining to Include Future Values in a Query 

To specify that a query not finishes until some future time occurs or SCN is reached, set either the `ENDTIME` or `ENDSCN` option in your call to the `DBMS_LOGMNR.START_LOGMNR` procedure to a time in the future or to an SCN value that has not yet been reached. 

This examples assumes that you want to monitor all changes made to the table `hr.employees` from now until 5 hours from now, and that you are using the dictionary in the online catalog.

1.  Start LogMiner.

    ```
    EXECUTE DBMS_LOGMNR.START_LOGMNR(-
    ```

    ```
      STARTTIME => SYSDATE, -
       ENDTIME   => SYSDATE + 5/24, -
       OPTIONS   => DBMS_LOGMNR.DICT_FROM_ONLINE_CATALOG);
    ```

2.  Query the `V$LOGMNR_CONTENTS` view.

    This select operation will not complete until it encounters the first redo log file record that is generated after the time range of interest (5 hours from now). You can end the select operation prematurely by pressing Ctrl+C.

    This example specifies the `SET` `ARRAYSIZE` statement so that rows are displayed as they are entered in the redo log file. If you do not specify the `SET ARRAYSIZE` statement, then rows are not returned until the SQL internal buffer is full. 

    ```
    SET ARRAYSIZE 1;
    SELECT USERNAME AS usr, SQL_REDO FROM V$LOGMNR_CONTENTS
       WHERE  SEG_OWNER = 'HR' AND TABLE_NAME = 'EMPLOYEES';
    ```

3.  End the LogMiner session.

    ```
    EXECUTE DBMS_LOGMNR.END_LOGMNR();
    ```


### Example Scenarios

Examples of how to use LogMiner for typical scenarios.

These examples include:


#### Scenario 1: Using LogMiner to Track Changes Made by a Specific User

This example shows how to see all changes made to the database in a specific time range by a single user: `joedevo`. Connect to the database and then take the following steps:

1.  Create the LogMiner dictionary file.

    To use LogMiner to analyze `joedevo`'s data, you must either create a LogMiner dictionary file before any table definition changes are made to tables that `joedevo` uses or use the online catalog at LogMiner startup. See [Extract a LogMiner Dictionary](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-8D74F78A-E7D1-48E6-8E65-5E8CC55F0757 "Extracting a LogMiner dictionary.") for examples of creating LogMiner dictionaries. This example uses a LogMiner dictionary that has been extracted to the redo log files.

2.  Add redo log files.

    Assume that `joedevo` has made some changes to the database. You can now specify the names of the redo log files that you want to analyze, as follows:

    ```
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
       LOGFILENAME => 'log1orc1.ora', -
       OPTIONS => DBMS_LOGMNR.NEW);
    ```

    If desired, add additional redo log files, as follows:

    ```
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
       LOGFILENAME => 'log2orc1.ora', -
       OPTIONS => DBMS_LOGMNR.ADDFILE);
    ```

3.  Start LogMiner and limit the search to the specified time range:

    ```
    EXECUTE DBMS_LOGMNR.START_LOGMNR( -
       DICTFILENAME => 'orcldict.ora', -
       STARTTIME => TO_DATE('01-Jan-1998 08:30:00','DD-MON-YYYY HH:MI:SS'), -
       ENDTIME => TO_DATE('01-Jan-1998 08:45:00', 'DD-MON-YYYY HH:MI:SS'));
    ```

4.  Query the `V$LOGMNR_CONTENTS` view.

    At this point, the `V$LOGMNR_CONTENTS` view is available for queries. You decide to find all of the changes made by user `joedevo` to the `salary` table. Execute the following `SELECT` statement:

    ```
    SELECT SQL_REDO, SQL_UNDO FROM V$LOGMNR_CONTENTS 
       WHERE USERNAME = 'joedevo' AND SEG_NAME = 'salary';
    ```

    For both the `SQL_REDO` and `SQL_UNDO` columns, two rows are returned (the format of the data display will be different on your screen). You discover that `joedevo` requested two operations: he deleted his old salary and then inserted a new, higher salary. You now have the data necessary to undo this operation. 

    ```
    SQL_REDO                              SQL_UNDO
    --------                              --------
    delete from SALARY                    insert into SALARY(NAME, EMPNO, SAL)
    where EMPNO = 12345                    values ('JOEDEVO', 12345, 500)
    and NAME='JOEDEVO'
    and SAL=500;

    insert into SALARY(NAME, EMPNO, SAL)  delete from SALARY
    values('JOEDEVO',12345, 2500)         where EMPNO = 12345
                                          and NAME = 'JOEDEVO'
    2 rows selected                       and SAL = 2500;
    ```

5.  End the LogMiner session.

    Use the `DBMS_LOGMNR.END_LOGMNR` procedure to finish the LogMiner session properly:

    ```
    DBMS_LOGMNR.END_LOGMNR( );
    ```


#### Scenario 2: Using LogMiner to Calculate Table Access Statistics

This scenario describes how to use LogMiner to calculate table access statistics.

In this example, assume you manage a direct marketing database and want to determine how productive the customer contacts have been in generating revenue for a 2-week period in January. Assume that you have already created the LogMiner dictionary and added the redo log files that you want to search (as demonstrated in the previous example). Take the following steps:

1.  Start LogMiner and specify a range of times:

    ```
    EXECUTE DBMS_LOGMNR.START_LOGMNR( -
       STARTTIME => TO_DATE('07-Jan-2012 08:30:00','DD-MON-YYYY HH:MI:SS'), -
       ENDTIME => TO_DATE('21-Jan-2012 08:45:00','DD-MON-YYYY HH:MI:SS'), -
       DICTFILENAME => '/usr/local/dict.ora');
    ```

2.  Query the `V$LOGMNR_CONTENTS` view to determine which tables were modified in the time range you specified, as shown in the following example. (This query filters out system tables that traditionally have a `$` in their name.)

    ```
    SELECT SEG_OWNER, SEG_NAME, COUNT(*) AS Hits FROM
       V$LOGMNR_CONTENTS WHERE SEG_NAME NOT LIKE '%$' GROUP BY
       SEG_OWNER, SEG_NAME ORDER BY Hits DESC;
    ```

3.  The following data is displayed. (The format of your display may be different.)

    ```
    SEG_OWNER          SEG_NAME          Hits
    ---------          --------          ----
    CUST               ACCOUNT            384
    UNIV               EXECDONOR          325
    UNIV               DONOR              234
    UNIV               MEGADONOR           32
    HR                 EMPLOYEES           12
    SYS                DONOR               12
    ```

    The values in the `Hits` column show the number of times that the named table had an insert, delete, or update operation performed on it during the 2-week period specified in the query. In this example, the `cust.account` table was modified the most during the specified 2-week period, and the `hr.employees` and `sys.donor` tables were modified the least during the same time period.

4.  End the LogMiner session.

    Use the `DBMS_LOGMNR.END_LOGMNR` procedure to finish the LogMiner session properly:
    `DBMS_LOGMNR.END_LOGMNR( );`


## Supported Data Types, Storage Attributes, and Database and Redo Log File Versions

Describes information about data type and storage attribute support and the releases of the database and redo log files that are supported.


### Supported Data Types and Table Storage Attributes

Describes supported data types and table storage attributes.

Note:

As of Oracle Database 12c Release 1 (12.1), the maximum size of the `VARCHAR2`, `NVARCHAR2`, and `RAW` data types has been increased to 32 KB when the `COMPATIBLE` initialization parameter is set to 12.0 or higher and the `MAX_STRING_SIZE` initialization parameter is set to `EXTENDED`. 

LogMiner treats 32 KB columns as LOBs for the purposes of supplemental logging. 

A 32 KB column cannot be part of an ALWAYS supplemental logging group. 

LogMiner supports the following data types and table storage attributes. As described in [Compatibility Requirements](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-8811DF7C-6A84-4DA7-9639-F9509289FA2F "LogMiner support for certain data types and table storage attributes has database compatibility requirements."), some data types are supported only in certain releases.

<!-- class="section" -->

Data Types

<!-- class="section" -->

* `BINARY_DOUBLE`

* `BINARY_FLOAT`

* `BLOB`

* `CHAR`

* `CLOB` and `NCLOB`

* `DATE`

* `INTERVAL YEAR TO MONTH`

* `INTERVAL DAY TO SECOND`

* LOBs stored as SecureFiles (requires that the database be run at a compatibility of 11.2 or higher.

* `LONG`

* `LONG RAW`

* `NCHAR`

* `NUMBER`

* `NVARCHAR2`

* Objects stored as `VARRAY`s

* Objects (Simple and Nested ADTs without Collections)

    Object support (including Oracle-supplied types such as `SDO_GEOMETRY`, `ORDIMAGE`, and so on) requires that the database be running Oracle Database 12c Release 1 (12.1) or higher with a redo compatibility setting of 12.0.0.0 or higher. The contents of the `SQL_REDO` column for the XML data-related operations is never valid SQL or PL/SQL.

* Oracle Text

* `RAW`

* `TIMESTAMP`

* `TIMESTAMP WITH  TIMEZONE`

* `TIMESTAMP WITH LOCAL TIMEZONE`

* `VARCHAR` and `VARCHAR2`

* XDB

* `XMLType` data for all storage models, assuming the following primary database compatibility requirements:

    * `XMLType` stored in `CLOB` format requires that the database be run at a compatibility setting of 11.0 or higher (`XMLType` stored as `CLOB` is deprecated as of Oracle Database 12c Release 1 (12.1).)

    * `XMLType` stored in object-relational format or as binary XML requires that the database be running Oracle Database 11g Release 2 (11.2.0.3) or higher with a redo compatibility setting of 11.2.0.3 or higher. The contents of the `SQL_REDO` column for the XML data-related operations is never valid SQL or PL/SQL.

<!-- class="section" -->

Table Storage Types

<!-- class="section" -->

* Cluster tables (including index clusters and heap clusters).

* Index-organized tables (IOTs) (partitioned and nonpartitioned, including overflow segments).

* Heap-organized tables (partitioned and nonpartitioned).

* Advanced row compression and basic table compression. Both of these options require a database compatibility setting of 11.1.0 or higher.

* Tables containing LOB columns stored as SecureFiles, when database compatibility is set to 11.2 or higher.

* Tables using Hybrid Columnar Compression, when database compatibility is set to 11.2.0.2 or higher.

    See Also:

    * [Oracle Database Concepts](https://www.oracle.com/pls/topic/lookup?ctx=en/database/oracle/oracle-database/19/sutil&id=CNCPT89198) for more information about Hybrid Columnar Compression

<!-- class="section" -->

* [Compatibility Requirements](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-8811DF7C-6A84-4DA7-9639-F9509289FA2F)  
    LogMiner support for certain data types and table storage attributes has database compatibility requirements.


#### Compatibility Requirements

LogMiner support for certain data types and table storage attributes has database compatibility requirements.

Specifically:

* Multibyte `CLOB` support requires the database to run at a compatibility of 10.1 or higher. 

* IOT support without `LOB`s and Overflows requires the database to run at a compatibility of 10.1 or higher.

* IOT support with `LOB` and Overflow requires the database to run at a compatibility of 10.2 or higher.

* TDE and TSE support require the database to run at a compatibility of 11.1 or higher.

* Basic compression and advanced row compression require the database to run at a compatibility of 11.1 or higher.

* Hybrid Columnar Compression support is dependent on the underlying storage system and requires the database to run at a compatibility of 11.2 or higher.

<!-- class="section" -->

See Also:

* [Oracle Database Concepts](https://www.oracle.com/pls/topic/lookup?ctx=en/database/oracle/oracle-database/19/sutil&id=CNCPT89198) for more information about Hybrid Columnar Compression



### Unsupported Data Types and Table Storage Attributes

Describes unsupported data types and table storage attributes.

LogMiner does not support the following data types and table storage attributes. If a table contains columns having any of these unsupported data types, then the entire table is ignored by LogMiner.

* `BFILE`

* Nested tables

* Objects with nested tables

* Tables with identity columns

* Temporal validity columns

* PKREF columns

* PKOID columns

* Nested table attributes and stand-alone nested table columns

<!-- class="section" -->


#### 22.14.3 Supported Databases and Redo Log File Versions

Describes supported database releases and redo log file versions.

LogMiner runs only on databases of release 8.1 or later, but you can use it to analyze redo log files from release 8.0 databases. However, the information that LogMiner is able to retrieve from a redo log file depends on the version of the log, not the release of the database in use. For example, redo log files for Oracle9i can be augmented to capture additional information when supplemental logging is enabled. This allows LogMiner functionality to be used to its fullest advantage. Redo log files created with older releases of Oracle will not have that additional data and may therefore have limitations on the operations and data types supported by LogMiner.

See Also:

[Steps in a Typical LogMiner Session](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-6609EBA2-B2D7-4EAE-8344-A1F6C0A24760 "Describes the steps in a typical LogMiner session.") and [Supplemental Logging](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html#GUID-D857AF96-AC24-4CA1-B620-8EA3DF30D72E "Describes supplemental logging.")


### SecureFiles LOB Considerations

SecureFiles LOBs are supported when database compatibility is set to 11.2 or later. 

Only `SQL_REDO` columns can be filled in for SecureFiles LOB columns; `SQL_UNDO` columns are not filled in.

Transparent Data Encryption (TDE) and data compression can be enabled on SecureFiles LOB columns at the primary database.

Deduplication of SecureFiles LOB columns is fully supported. Fragment operations are not supported.

If LogMiner encounters redo generated by unsupported operations, then it generates rows with the `OPERATION` column set to `UNSUPPORTED`. No SQL_REDO or SQL_UNDO will be generated for these redo records.