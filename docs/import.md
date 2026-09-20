# SDU Story Game 剧情校验与导入说明

说明如何把人物故事 JSON 导入 MySQL 剧情，导入是一次性管理操作

## 1. 前置条件

导入前必须满足：

- 已安装并配置 JDK 21；
- 已安装 Maven，`mvn -v` 可以正常执行；
- MySQL 8.0 正在运行；
- 已按 `schema.sql` 建好九张表；
- `application.yml` 中的数据库连接正确；
- 项目中存在以下文件。

```text
src/main/resources/story/
├── pan-chengdong-story.json
├── hua-gang-story.json
└── lu-yao-story.json

tools/
└── validate_story.py
```

## 2. 当前剧情数据

| 顺序 | 人物   | chapter_code    | JSON                       | 节点 | 台词 | 选项 | 成就 |
| ---: | ------ | --------------- | -------------------------- | ---: | ---: | ---: | ---: |
|    1 | 潘承洞 | `pan_chengdong` | `pan-chengdong-story.json` |   16 |  101 |   10 |    1 |
|    2 | 华岗   | `hua_gang`      | `hua-gang-story.json`      |   22 |   88 |   14 |    1 |
|    3 | 路遥   | `lu_yao`        | `lu-yao-story.json`        |   29 |  147 |    3 |    1 |

JSON 只使用 `chapter.code`、`node.code`、`choice.code` 等稳定业务编码，不保存任何数据库自增 ID，因此同一文件可以导入不同成员的本地数据库。

## 3. 导入前校验

在项目根目录依次执行：

```powershell
python tools/validate_story.py src/main/resources/story/pan-chengdong-story.json
python tools/validate_story.py src/main/resources/story/hua-gang-story.json
python tools/validate_story.py src/main/resources/story/lu-yao-story.json
```

预期输出：

```text
校验通过：16 个节点，101 条台词，10 个选项，0 个警告。
校验通过：22 个节点，88 条台词，14 个选项，0 个警告。
校验通过：29 个节点，147 条台词，3 个选项，0 个警告。
```

新建剧情需检查：

- 唯一入口和真正的 `chapter_end`；
- 重复业务编码；
- 不存在的跳转目标；
- 入口不可达节点；
- 无法抵达结局的死路或死循环；
- 节点同时配置线性后继与选择分支；
- 台词、选项顺序不连续；
- 条件台词引用不存在或不可能先发生的选择；
- 字段类型、长度和节点类型

校验器允许能够重新回到主线并最终到达结局的合法循环

## 4. 两种导入模式

### `CREATE_ONLY`

- 章节不存在时创建；
- 同 `chapter_code` 已存在时立即拒绝；
- 适合全新数据库

### `REPLACE`

- 根据 `chapter_code` 找到现有章节；
- 先检查该章节是否存在玩家存档；没有存档时，事务内清理原成就、台词、选项和节点，再重新导入
- 有任何存档时拒绝替换，防止外键和玩家进度失效。

## 5. 全新数据库首次导入

导入程序使用 `story-import` Profile

### 第一章：潘承洞

```powershell
mvn spring-boot:run "-Dspring-boot.run.profiles=story-import" "-Dspring-boot.run.arguments=--story.import.location=classpath:story/pan-chengdong-story.json --story.import.mode=CREATE_ONLY"
```

### 第二章：华岗

```powershell
mvn spring-boot:run "-Dspring-boot.run.profiles=story-import" "-Dspring-boot.run.arguments=--story.import.location=classpath:story/hua-gang-story.json --story.import.mode=CREATE_ONLY"
```

### 第三章：路遥

```powershell
mvn spring-boot:run "-Dspring-boot.run.profiles=story-import" "-Dspring-boot.run.arguments=--story.import.location=classpath:story/lu-yao-story.json --story.import.mode=CREATE_ONLY"
```

每条命令成功后都会出现类似日志：

```text
剧情导入完成：chapterCode=hua_gang, chapterId=..., replaced=false,
nodes=22, lines=88, choices=14, achievements=1
```

程序随后自动退出