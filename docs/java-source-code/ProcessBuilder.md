# Java ProcessBuilder
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com**
***
内容：

ProcessBuilder用来创建一个操作系统进程。

## ProcessBuilder部分源码解读

* 属性信息

```java
public final class ProcessBuilder
{
    private List<String> command;//字符串组成的操作系统命令集
    private File directory;  //默认值是当前进程的当前工作目录
    private Map<String,String> environment;
    private boolean redirectErrorStream;
    private Redirect[] redirects;
    ........
}
```
* 三个重载的command处理函数：对List\<String\> command属性的处理
```java
public ProcessBuilder command(List<String> command) {
    if (command == null)<br>
        throw new NullPointerException();<br>
    this.command = command;<br>
    return this;<br>
}
public ProcessBuilder command(String... command) {
    this.command = new ArrayList<>(command.length);
    for (String arg : command)
        this.command.add(arg);
    return this;
}
public List<String> command() {
    return command;
}
```

- ProcessBuilder中的start()方法开启进程会调用command命令列表和相关参数，这个函数会检测command的正确性以及做系统安全性检查。ProcessBuilder的start()方法最后的返回值如下：

```java
return ProcessImpl.start(cmdarray,environment,dir,redirects,redirectErrorStream);
```

它调用了ProcessImpl的start()方法。看一下ProcessImpl，从类名上看他是Process的实现。
- Process为一个抽象类，start()方法返回值为Process的子类的一个实例，这个实例可以用来控制进程以及获得进程的信息。Process源码如下：

```java
package java.lang;
import java.io.*;

public abstract class Process {

    //返回连接子进程正常输入的输出流
    abstract public OutputStream getOutputStream();

    //返回连接子进程输出的输入流
    abstract public InputStream getInputStream();

    //返回连接子进程异常输出的输入流
    abstract public InputStream getErrorStream();

    //促使当前线程等待，直至只当进程已经结束。子进程结束时函数立即返回
    abstract public int waitFor() throws InterruptedException;

    //返回子进程结束时候的退出值
    abstract public int exitValue();

    //杀死子进程
    abstract public void destroy();
}
```
## ProcessBuilder的使用
- 示例1：执行java程序（注：.class文件已经生成且在指定路径下）
```java
public static void main(String[] args) throws IOException {
        List<String> commands = new ArrayList<>();
        commands.add("java");
        commands.add("FileTest");

        ProcessBuilder processBuilder = new ProcessBuilder();
        processBuilder.command(commands);
        File file = new File("/Users/lujiafeng/Desktop/SpringBoot-Learning/Java_Test/src");
        processBuilder.directory(file);  //切换到工作目录
        //processBuilder.redirectErrorStream(true);
        Process process = null;
        try {
            process = processBuilder.start();
        } catch (Exception e) {
            e.printStackTrace();
        }

        String result = null;
        String errorresult = null;
        InputStream in = process.getInputStream(); //得到命令执行的流
        BufferedReader br = new BufferedReader(new InputStreamReader(in));

        InputStream error = process.getErrorStream(); //得到命令执行的错误流
        BufferedReader errorbr = new BufferedReader(new InputStreamReader(error));
        String lineStr;
        while ((lineStr = br.readLine()) != null) {
            result = lineStr;
        }

        br.close();
        in.close();
        System.out.println("result: " + result);
        while ((lineStr = errorbr.readLine()) != null) {
            errorresult = lineStr;
        }
        errorbr.close();
        error.close();
        System.out.println("errorresult: " + errorresult);

        try {
            final int status = process.waitFor(); //阻塞，直到上述命令执行完
        } catch (InterruptedException e) {
            e.printStackTrace();
        } finally {
            System.out.println("执行结束");
        }
    }
```
- 示例2：执行终端命令
```java
public static void main(String[] args) throws IOException {
        ProcessBuilder pb = new ProcessBuilder("ls");
        Process process = pb.start();
        String line;
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), "GBK"));
        while ((line = reader.readLine()) != null) {
            System.out.println(line);
        }
        reader.close();
    }
```
- 示例3：打开.exe程序
```java
ProcessBuilder p = new ProcessBuilder("C:/Program Files/Notepad++/Notepad++.exe");
p.start();
```

原文地址：简书https://www.jianshu.com/p/06158611c539 感谢Dear_diary大神的知识分享

