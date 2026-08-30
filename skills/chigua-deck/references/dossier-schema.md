# 吃瓜档案 JSON 结构

构建脚本读取一个 UTF-8 JSON 对象。`sourceImage` 是相对于档案 JSON 的本地路径；其余本地路径不需要写入档案。

```json
{
  "title": "南风音乐节阵容调整",
  "topic": "#南风音乐节阵容调整#",
  "subtitle": "一份公开信息整理",
  "generatedAt": "2026-08-08 14:30 CST",
  "demo": true,
  "collection": {
    "method": "fictional-demo",
    "coverageNote": "完全虚构的固定案例，不访问微博或外部网页。",
    "weiboCli": { "used": false, "commands": [] }
  },
  "oneLiner": "嘉宾确认退出，但活动方与工作室对取消原因说法不一致。",
  "slideTitles": {
    "summary": "先说结论：退出已确认，原因仍然打架",
    "relations": "谁在发布、谁在回应、谁受到影响",
    "timeline": "时间线把原始发布与后续解读分开",
    "claims": "视频能确认的事实，不等于网友给出的原因",
    "evidence": "把大家都在说拆成可检查的材料",
    "verdicts": "什么能说，什么暂时不能说",
    "next": "下一条有用信息应该是什么",
    "sources": "这份简报能追到哪里，就只说到哪里"
  },
  "summaryNote": "先确认公开材料能证明什么，再说明哪些仍然只是推测。",
  "relationCenter": { "title": "阵容调整", "subtitle": "核心争议：取消原因" },
  "nextConclusion": "在新材料出现前，维持原因有冲突的判断。",
  "sourceImage": "原始发布截图.png",
  "sourceImageAlt": "当事人的原始公开发布截图",
  "sourceImageCaption": "当事人原始发布 · 对应信源 s1",
  "facts": [
    {
      "label": "已知",
      "text": "嘉宾不再参加本周末演出",
      "status": "confirmed",
      "sourceIds": ["s1", "s2"]
    }
  ],
  "unknowns": ["取消决定由谁最终作出", "是否涉及演出条款争议"],
  "people": [
    { "id": "p1", "name": "南风音乐节", "role": "活动主办方" }
  ],
  "relations": [
    { "from": "p1", "to": "event", "label": "发布阵容调整公告" }
  ],
  "timeline": [
    {
      "time": "8月8日 08:42",
      "title": "主办方官宣阵容调整",
      "detail": "公告称艺人因行程冲突不再参加。",
      "status": "confirmed",
      "sourceIds": ["s1"]
    }
  ],
  "claims": {
    "sideA": {
      "name": "活动方",
      "summary": "调整原因为艺人行程冲突。",
      "mode": "paraphrase",
      "sourceIds": ["s1"]
    },
    "sideB": {
      "name": "工作室",
      "summary": "档期已预留，取消决定来自活动方。",
      "mode": "paraphrase",
      "sourceIds": ["s2"]
    },
    "commonGround": "双方都确认艺人不会出席。"
  },
  "evidence": [
    {
      "id": "e1",
      "title": "双方确认退出演出",
      "summary": "双方仅对原因表述不一致。",
      "status": "confirmed",
      "sourceIds": ["s1", "s2"]
    }
  ],
  "verdicts": {
    "confirmed": ["艺人确认退出本场演出"],
    "conflicting": ["取消原因存在两种公开说法"],
    "unverified": ["谈判失败导致取消"],
    "debunked": []
  },
  "nextWatch": ["主办方是否补充原因", "退款通道执行情况"],
  "sources": [
    {
      "id": "s1",
      "title": "阵容调整公告",
      "publisher": "南风音乐节",
      "url": "https://example.com/source-1",
      "publishedAt": "2026-08-08 08:42",
      "retrievedAt": "2026-08-08 14:10",
      "type": "原始声明"
    }
  ]
}
```

## 必填字段

- `title`
- `oneLiner`
- `timeline`，至少 1 项
- `evidence`，至少 1 项
- `sources`，至少 1 项；纯虚构演示可使用 `demo://` URL

## 可选的叙事与视觉字段

- `slideTitles`：覆盖八张内容页的结论型标题
- `summaryNote`：摘要页左侧的判断边界
- `relationCenter`：人物关系图中心事件及副标题
- `nextConclusion`：下一步观察页的当前判断
- `claims.sideA.mode`、`claims.sideB.mode`：`paraphrase`（默认，材料摘要且不加引号）或 `quote`（经原文核对的短引，页面自动加引号）
- `sourceImage`：相对于档案 JSON 的公开信源截图；仅在信源不超过 4 条时显示
- `sourceImageAlt`、`sourceImageCaption`：截图的替代文字与来源说明
- `collection.method`：`weibo-cli`、`public-web`、`user-supplied`、`mixed` 或 `fictional-demo`
- `collection.coverageNote`：一句话说明抓取范围、访问失败或材料缺口
- `collection.weiboCli.used`：本次是否真实调用了 weibo-cli；未调用必须为 `false`
- `collection.weiboCli.commands`：本次实际执行的只读命令列表；不要填写计划命令或未成功执行的命令

关系页会自动排列 1–4 个独立角色。`people[].name` 若与 `relationCenter.title` 相同，则视为中心事件的重复条目并不再生成角色卡。`relations` 中与角色相连的标签会自动放入独立标签区，避免压在连线或卡片上。

## 长度建议

- `title`：18 个汉字以内
- `oneLiner`：60 个汉字以内
- 时间线标题：18 个汉字以内
- 时间线详情：45 个汉字以内
- 证据标题：18 个汉字以内
- 证据摘要：50 个汉字以内
- 单条下一步观察：24 个汉字以内

构建脚本会截取超出页面容量的数组，但不会替内容做事实判断。发生截取时命令行会输出 `[chigua-deck warning]`，最终 JSON 结果的 `warnings` 也会列出被省略的数组；完整时间线和证据项仍保留在 Markdown 信源台账中。

## 校验规则

- `sources[].id`、`evidence[].id` 不得重复。
- `facts[]`、`timeline[]`、`evidence[]` 以及已提供的双方说法都必须有至少一个 `sourceId`，并且每个 ID 都能在 `sources[]` 中解析。
- `status` 只能是 `confirmed`、`conflicting`、`unverified` 或 `debunked`。
- `paraphrase` 是默认模式。只有逐字核对过原文的短句才能标记为 `quote`；不能为了视觉效果给摘要补引号。
