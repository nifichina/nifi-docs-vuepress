# Java HashMap 新增方法(merge,compute)（转）
***
编辑人：__**酷酷的诚**__  邮箱：**zhangchengk@foxmail.com**
***
内容：

Java8 Map里新增了几个方法，很多同学不知道具体功能是啥。

---

先从最简单的开始。

## putIfAbsent()

```java
HashMap<String, String> map = new HashMap<String, String>();
map.putIfAbsent("k", "v");
```

等价于：（功能等价，效率并不等价）

```java
HashMap<String, String> map = new HashMap<String, String>();
if(!map.containsKey("k")) {
    map.put("k", "v");    
}
```

**key不存在才put，存在就跳过。**

---

##### 源码：

```java
@Override
    public V putIfAbsent(K key, V value) {
        return putVal(hash(key), key, value, true, true);
    }
    final V putVal(int hash, K key, V value, boolean onlyIfAbsent,
                   boolean evict) {
        ...// 省略一部分无关代码
            if (e != null) { 
                V oldValue = e.value;
                if (!onlyIfAbsent || oldValue == null) // 直接看这里
                    e.value = value;
                afterNodeAccess(e);
                return oldValue;
            }
        }
      ...// 继续省略一部分代码
    }
```

可以看到，`putIfAbsent()`调用了`putVal()`，第四个参数`onlyIfAbsent`传true，表示_只有无此key时才put_。如果`putIfAbsent()`的key不存在，和`put()`逻辑相同。如果已存在，`onlyIfAbsent`延迟到`putVal()`的 `if (e != null)`时才做判断。

## merge()

```java
String k = "key";
        HashMap<String, Integer> map = new HashMap<String, Integer>() {{
            put(k, 1);
        }};
        map.merge(k, 2, (oldVal, newVal) -> oldVal + newVal);
```

等价于：

```java
String k = "key";
        HashMap<String, Integer> map = new HashMap<String, Integer>() {{
            put(k, 1);
        }};
        Integer newVal = 2;
        if(map.containsKey(k)) {
            map.put(k, map.get(k) + newVal);
        } else {
            map.put(k, newVal);
        }
```

**如果key存在，则执行lambda表达式，表达式入参为`oldVal`和`newVal`(neVal即`merge()`的第二个参数)。表达式返回最终put的val。如果key不存在，则直接put`newVal`。**

---

源码：

```java
public V merge(K key, V value,
                   BiFunction<? super V, ? super V, ? extends V> remappingFunction) {
      ···// 删除无关代码
        int hash = hash(key);
        Node<K,V>[] tab; Node<K,V> first; int n, i;
        int binCount = 0;
        TreeNode<K,V> t = null;
        Node<K,V> old = null; // 该key原来的节点对象
        if (size > threshold || (tab = table) == null ||
            (n = tab.length) == 0) //第一个if，判断是否需要扩容
            n = (tab = resize()).length;
        if ((first = tab[i = (n - 1) & hash]) != null) {
           // 第二个if，取出old Node对象
          ··· // 继续省略
        }
        if (old != null) {// 第三个if，如果 old Node 存在
            V v;
            if (old.value != null)
            // 如果old存在，执行lambda，算出新的val并写入old Node后返回。
                v = remappingFunction.apply(old.value, value);
            else
                v = value;
            if (v != null) {

                old.value = v;
                afterNodeAccess(old);
            }
            else
                removeNode(hash, key, null, false, true);
            return v;
        }
        if (value != null) {
        //如果old不存在且传入的newVal不为null，则put新的kv
            if (t != null)
                t.putTreeVal(this, tab, hash, key, value);
            else {
                tab[i] = newNode(hash, key, value, first);
                if (binCount >= TREEIFY_THRESHOLD - 1)
                    treeifyBin(tab, hash);
            }
            ...// 省略
        }
        return value;
    }
```

解释见注释。

## compute()

```java
String k = "key";
        HashMap<String, Integer> map = new HashMap<String, Integer>() {{
            put(k, 1);
        }};
        map.compute(k, (key, oldVal) -> oldVal + 1);
```

等价于

```java
map.put(k, func(k, map.get(k)));

    public Integer func(String k, Integer oldVal) {
        return oldVal + 1;
    }
```

**根据已知的 k v 算出新的v并put。  
注意：**如果无此key，那么oldVal为null，lambda中涉及到oldVal的计算会报空指针。  
源码和merge大同小异，就不放了。

## computeIfAbsent()

由上可知，compute()有空指针的风险。所以用`computeIfAbsent()`来规避。

```java
map.computeIfAbsent(k, key ->  1);
// 该方法等价于
map.putIfAbsent(k, 1);
// 所以computeIfAbsent在涉及到用key来计算val时才有使用价值。否则可以用putIfAbsent代替。
```

**当key不存在时，才compute。其他行为见注释。**

源码略。

## computeIfPresent()

`compute()`的补充，key存在时才`compute()`，避免潜在的空指针情况。其他和`compute()`相同。  
源码略。