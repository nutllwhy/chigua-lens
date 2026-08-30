---
name: chigua-deck
description: 将微博热搜、微博链接、公开报道、用户截图或一组零散信源整理成可追溯的中文“吃瓜简报”PPT、PDF 和证据台账。用户提到吃瓜神器、吃瓜、热点来龙去脉、事件时间线、人物关系、双方说法、证据核验、辟谣、微博热点复盘、舆情简报，或要求把一个网络事件做成 PPT/长图时使用。
---

# 吃瓜神器

把散落的公开信息整理为有时间线、有信源、有不确定性标记的视觉简报。默认输出 PowerPoint 和 Markdown 信源台账；用户需要时再补 PDF 或长图。

## 输入判断

接受以下任意输入：

- 一个热搜词或事件名称
- 一条或多条微博、新闻、公告链接
- 截图、聊天记录或本地资料
- 用户已经整理的时间线或事实清单

若只有一个模糊话题，先搜索公开信源。若涉及真实人物，优先使用当事人原始声明、机构公告和可核验报道。不要搜集或展示住址、电话、身份证、行踪等敏感个人信息。

## 工作流

### 1. 建立信源池

1. 保存原始链接、发布者、发布时间和抓取时间。
2. 可用微博开放平台 CLI 时，先运行官方验证命令 `weibo auth whoami` 与 `weibo doctor`，再查看当前版本帮助或服务清单；只调用当前账号确实可用的只读命令，不凭记忆假设接口名称。
3. weibo-cli 不可用时，使用浏览器、网页搜索和用户提供的材料继续；在结果中说明覆盖范围。
4. 不把搜索摘要、二次转述或截图里的文字自动当作一手事实。
5. 写操作、评论、转发和发博不属于本 Skill 的默认范围。

### 2. 建立证据台账

完整阅读 [references/evidence-policy.md](references/evidence-policy.md)，然后给每条信息标记：

- `confirmed`：多个独立可靠信源一致，或有可验证的一手材料
- `conflicting`：相关方公开说法互相矛盾，当前无法裁决
- `unverified`：只有匿名爆料、单一转述或无法确认真伪的截图
- `debunked`：已有可靠材料明确反证

每条事实、时间线节点、双方说法和证据卡都必须绑定 `sourceIds`。没有信源的内容只能标记为 `unverified`，或从简报中删除。

### 3. 生成结构化档案

按 [references/dossier-schema.md](references/dossier-schema.md) 创建 UTF-8 JSON。控制信息密度：

- 3 条以内的核心判断
- 3–4 个角色
- PPT 主画面保留 4 个时间线节点；更多节点写进档案和完整台账，并先合并同义节点
- PPT 主画面保留 4 张证据卡；更多材料写进档案和完整台账
- 4–8 个信源

标题必须是面向读者的结论，不要写成模型指令。引用原话时保持短句并注明来源；其余内容用中性语言转述。

### 4. 生成 PPT

使用本 Skill 的 `scripts/build-deck.mjs` 和 `assets/chigua-cover.png`。若当前环境提供 Presentations Skill，先完整阅读它并遵循其本地 PPT 工作流。

先调用 `load_workspace_dependencies`，原样记录它返回的 `RUNTIME_NODE`、`RUNTIME_NODE_MODULES` 和 `RUNTIME_BIN_DIR` 绝对路径。不要自行推导路径，不要安装依赖。

若 Presentations Skill 要求操作标记，必须在第一次生成 PPTX 前、从其目录只运行一次标记命令；新建用 `create`，覆写既有 PPTX 用 `edit`。随后在一个全新的临时目录建立指向运行时依赖的 `node_modules` 符号链接，并把构建脚本复制进去：

```bash
node container_tools/mark_artifact_operation_started.mjs \
  --operation-kind create \
  --expected-output-count 1 \
  --output-format pptx
```

上面的命令以 Presentations Skill 目录为工作目录独立运行；执行后不要在同一任务中重复标记。

```bash
CHIGUA_SKILL_DIR=/absolute/path/to/chigua-deck
CHIGUA_TMP_DIR=/absolute/path/to/tmp/chigua-deck-build
RUNTIME_NODE=/absolute/path/from/load_workspace_dependencies/node
RUNTIME_NODE_MODULES=/absolute/path/from/load_workspace_dependencies/node_modules
RUNTIME_BIN_DIR=/absolute/path/from/load_workspace_dependencies/bin/override

mkdir -p "$CHIGUA_TMP_DIR"
ln -s "$RUNTIME_NODE_MODULES" "$CHIGUA_TMP_DIR/node_modules"

cp "$CHIGUA_SKILL_DIR/scripts/build-deck.mjs" "$CHIGUA_TMP_DIR/build-deck.mjs"

RUNTIME_NODE="$RUNTIME_NODE" \
RUNTIME_NODE_MODULES="$RUNTIME_NODE_MODULES" \
RUNTIME_BIN_DIR="$RUNTIME_BIN_DIR" \
"$RUNTIME_NODE" "$CHIGUA_TMP_DIR/build-deck.mjs" \
  --input /absolute/path/to/dossier.json \
  --output /absolute/path/to/吃瓜简报.pptx \
  --ledger /absolute/path/to/信源台账.md \
  --preview-dir "$CHIGUA_TMP_DIR/rendered" \
  --cover "$CHIGUA_SKILL_DIR/assets/chigua-cover.png"
```

如果临时目录已包含 `node_modules`，改用另一个空目录，不要覆盖运行时目录或改动其内容。

构建脚本固定生成九页：封面、30 秒摘要、人物关系、时间线、双方说法、证据板、信息鉴定、下一步观察、信源与边界。所有元素保持可编辑。

### 5. 视觉与图片

- 使用暖纸色、钴蓝、瓜红、青柠绿和近黑色。
- 中文正文默认使用 `Source Han Sans CN`；交付前确认目标设备可用该字体或已接受字体替换。
- 保留调查档案与编辑杂志感，不做密集仪表盘。
- 需要新增图片时使用公开原图、用户提供素材或抽象生成图。
- 不生成真实人物的“案发现场”“聊天截图”或貌似新闻证据的合成图。
- AI 生成图只能作为装饰性视觉，并在备注或信源页标注。

### 6. QA 与交付

1. 渲染全部幻灯片并逐页查看。
2. 运行 Presentations Skill 的 `slides_test.py` 检查溢出。
3. 修复重叠、裁切、乱码、意外换行和字体过小。
4. 确认所有非平凡结论在演讲者备注中包含 `[Sources]` 块。
5. 阅读构建器输出的 `warnings`；任何被截断的数组都要回到档案中压缩内容，或明确接受被省略项。
6. 交付 `.pptx`、信源台账；用户需要时再交付 PDF、长图或档案 JSON。
7. 明确提示：这是公开信息整理，不代表司法、监管或事实认定。

## 失败边界

- 无法访问原帖：保留链接并标记“未取得原文”，不要补写内容。
- 只有截图：标记截图提供者和获取时间，默认 `unverified`。
- 删除内容或互相矛盾：并列展示时间、版本与差异，不替用户下结论。
- 可能引发现实伤害：减少人物标签，聚焦公开说法和可验证事件。
- 信源不足：输出“目前无法形成可靠简报”，不要为了凑页数编造材料。
