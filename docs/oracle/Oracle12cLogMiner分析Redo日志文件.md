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

    <pre dir="ltr">
    INSERT INTO HR.JOBS(JOB_ID, JOB_TITLE, MIN_SALARY, MAX_SALARY)  VALUES('IT_WT','Technical Writer', 4000, 11000);
    </pre>

    没有字典，LogMiner会显示:

    <pre dir="ltr">
    insert into "UNKNOWN"."OBJ# 45522"("COL 1","COL 2","COL 3","COL 4") values
    (HEXTORAW('45465f4748'),HEXTORAW('546563686e6963616c20577269746572'),
    HEXTORAW('c229'),HEXTORAW('c3020b'));
    </pre>

* 重做日志文件包含对数据库或数据库字典所做的更改。


### Directing LogMiner Operations and Retrieving Data of Interest

你可以直接使用LogMiner`DBMS_LOGMNR` and `DBMS_LOGMNR_D` PL/SQL程序包, 并使用 `V$LOGMNR_CONTENTS`视图, 如下:


1.  知道LogMiner字典.

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

    <pre dir="ltr">
    UTL_FILE_DIR = /oracle/database
    </pre>

    请记住，要使初始化参数文件的更改生效，必须停止并重新启动数据库。

2.  如果数据库已关闭，则使用SQL*Plus挂载并打开要分析其重做日志文件的数据库。例如，输入SQL STARTUP命令挂载并打开数据库:

    <pre dir="ltr">
    STARTUP
    </pre>

3.  执行PL/SQL过程DBMS_LOGMNR_D.BUILD来指定字典的文件名和文件的目录路径名。这个过程创建字典文件。例如，输入以下内容来在`/oracle/database`目录中创建`dictionary.ora`：

    <pre dir="ltr">
    EXECUTE DBMS_LOGMNR_D.BUILD('dictionary.ora', - 
       '/oracle/database/', -
        DBMS_LOGMNR_D.STORE_IN_FLAT_FILE);
    </pre>

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

    <pre dir="ltr">
    ALTER SESSION SET NLS_DATE_FORMAT = 'DD-MON-YYYY HH24:MI:SS';
    EXECUTE DBMS_LOGMNR.START_LOGMNR( -
       STARTTIME => '01-Jan-2012 08:30:00', -
       ENDTIME => '01-Jan-2012 08:45:00', -
       OPTIONS => DBMS_LOGMNR.DICT_FROM_ONLINE_CATALOG + -
       DBMS_LOGMNR.CONTINUOUS_MINE);
    </pre>

    (为了避免在对DBMS_LOGMNR的PL/SQL调用中指定日期格式。START_LOGMNR过程，本例首先使用SQL ALTER会话集NLS_DATE_FORMAT语句。)

    您还可以使用DBMS_LOGMNR指定一个重做日志文件，从而指示LogMiner自动构建要分析的重做日志文件列表。然后在启动LogMiner时指定CONTINUOUS_MINE选项。然而，前面描述的方法更典型。

2.  Manually

    使用DBMS_LOGMNR。在启动LogMiner之前手动创建重做日志文件列表的ADD_LOGFILE过程。将第一个重做日志文件添加到列表后，随后添加的每个重做日志文件必须来自相同的数据库，并与相同的数据库重做日志SCN相关联。使用此方法时，LogMiner不需要连接到源数据库。

    例如，要启动重做日志文件的新列表，请指定DBMS_LOGMNR的新选项。ADD_LOGFILE PL/SQL过程，表明这是一个新列表的开始。例如，输入以下命令来指定/oracle/logs/log1.f:

    <pre dir="ltr">
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
       LOGFILENAME => '/oracle/logs/log1.f', -
       OPTIONS => DBMS_LOGMNR.NEW);
    </pre>

    如果需要，可以通过指定PL/SQL DBMS_LOGMNR的ADDFILE选项来添加更多的重做日志文件。ADD_LOGFILE过程。例如，输入以下内容来添加/oracle/logs/log2.f:

    <pre dir="ltr">
    EXECUTE DBMS_LOGMNR.ADD_LOGFILE( -
       LOGFILENAME => '/oracle/logs/log2.f', -
       OPTIONS => DBMS_LOGMNR.ADDFILE);
    </pre>

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


## Querying V$LOGMNR_CONTENTS for Redo Data of Interest

通过查询`V$LOGMNR_CONTENTS`视图获取我们感兴趣的数据. (注意要有 `SYSDBA` or `LOGMINING` 权限来查询`V$LOGMNR_CONTENTS`.) 这个视图包括了数据库的历史变更信息，包括但不仅限于下列:

* The type of change made to the database: `INSERT`, `UPDATE`, `DELETE`, or `DDL` (`OPERATION` column).

* The SCN at which a change was made (`SCN` column).

* The SCN at which a change was committed (`COMMIT_SCN` column).

* The transaction to which a change belongs (`XIDUSN`, `XIDSLT`, and `XIDSQN` columns).

* The table and schema name of the modified object (`SEG_NAME` and `SEG_OWNER` columns).

* The name of the user who issued the DDL or DML statement to make the change (`USERNAME` column).

* If the change was due to a SQL DML statement, the reconstructed SQL statements showing SQL DML that is equivalent (but not necessarily identical) to the SQL DML used to generate the redo records (`SQL_REDO` column).

* If a password is part of the statement in a `SQL_REDO` column, then the password is encrypted. `SQL_REDO` column values that correspond to DDL statements are always identical to the SQL DDL used to generate the redo records.

* If the change was due to a SQL DML change, the reconstructed SQL statements showing the SQL DML statements needed to undo the change (`SQL_UNDO` column).

    `SQL_UNDO` columns that correspond to DDL statements are always `NULL`. The `SQL_UNDO` column may be `NULL` also for some data types and for rolled back operations.

Note:

LogMiner supports Transparent Data Encryption (TDE) in that `V$LOGMNR_CONTENTS` shows DML operations performed on tables with encrypted columns (including the encrypted columns being updated), provided the LogMiner data dictionary contains the metadata for the object in question and provided the appropriate master key is in the Oracle wallet. The wallet must be open or `V$LOGMNR_CONTENTS` cannot interpret the associated redo records. TDE support is not available if the database is not open (either read-only or read-write). See [Oracle Database Advanced Security Guide](https://docs.oracle.com/database/121/ASOAG/asopart1.htm#ASOAG600) for more information about TDE.

Example of Querying V$LOGMNR_CONTENTS

<!-- class="section" -->

Suppose you wanted to find out about any delete operations that a user named Ron had performed on the `oe.orders` table. You could issue a SQL query similar to the following:

<pre dir="ltr">
SELECT OPERATION, SQL_REDO, SQL_UNDO
   FROM V$LOGMNR_CONTENTS
   WHERE SEG_OWNER = 'OE' AND SEG_NAME = 'ORDERS' AND
   OPERATION = 'DELETE' AND USERNAME = 'RON';
</pre>

The following output would be produced. The formatting may be different on your display than that shown here.

<pre dir="ltr">
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
</pre>

This output shows that user Ron deleted two rows from the `oe.orders` table. The reconstructed SQL statements are equivalent, but not necessarily identical, to the actual statement that Ron issued. The reason for this is that the original `WHERE` clause is not logged in the redo log files, so LogMiner can only show deleted (or updated or inserted) rows individually.

Therefore, even though a single `DELETE` statement may have been responsible for the deletion of both rows, the output in `V$LOGMNR_CONTENTS` does not reflect that. Thus, the actual `DELETE` statement may have been `DELETE FROM OE.ORDERS WHERE CUSTOMER_ID ='101`' or it might have been `DELETE FROM OE.ORDERS WHERE PROMOTION_ID = NULL.`

注意，在调用DBMS_LOGMNR.START_LOGMNR时，参数和选项不是持久的。每次调用DBMS_LOGMNR.START_LOGMNR时，必须指定所有需要的参数和选项(包括SCN和时间范围)。


你可以从命令行使用LogMiner，也可以通过Oracle LogMiner Viewer图形用户界面访问它。Oracle LogMiner Viewer是Oracle Enterprise Manager的一部分。有关Oracle LogMiner查看器的更多信息，请参阅Oracle Enterprise Manager联机帮助。