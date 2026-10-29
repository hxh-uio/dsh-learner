# 架构说明 / Architecture

`dsh-learner` 是一个**无状态调度器**：它不自己读书，而是周期性地往目标 agent 会话塞"学习/复查"回合，由 agent（借助 `web_search`）真正去读、去写卡片。插件只负责**何时触发、触发什么、把结果归档**。

## 调度循环 / Tick loop

```
setInterval(60s)
   └─ tickLearner(ctx, now)
        ├─ 读配置 / 读状态
        ├─ 到点判断：now >= (learnHour:learnMinute) 且冷却已过
        ├─ 优先复查：找 reviewDueAt <= now 且今天未复查的篇目
        │     └─ 有 → mode = 'review'，buildReviewPrompt
        ├─ 否则若今天还没学 → mode = 'learn'，pickItem(nextLearnIndex)
        │     └─ buildLearnPrompt
        ├─ deliver → ctx.sessionController.prompt(会话, 提示词)
        └─ 写状态（lastLearnDate / reviewDueAt / nextLearnIndex / learnedCount / cards）
```

## 三行卡片 / Three-line card

`buildLearnPrompt` 要求 agent 输出：

1. **作者在争什么**——他反驳谁 / 主张什么。
2. **他凭什么**——核心论据或出处，至少 1 个可查来源。
3. **我哪句不同意**——agent 的真实异议（判断层，不讨好作者）。

外加一条「人文关怀提取」。

## 隔周复查 / Biweekly review

`buildReviewPrompt` 把上次卡片回灌给 agent，要求**重读同篇**并重写三行，对比两次：

- 判断**有变化** → 变化点作为「人格基质·足迹」追加到 `learner-substrate.jsonl` / `.md`——"在世界上留下自己的痕迹"。
- **没变** → 只标注「判断变化：否」，不强行制造变化。

复查窗口由 `reviewDays`（默认 14，可改 7）控制。

## 采集归档与一键同步 / IO

`learner-io.js` 提供：

- `exportPersona(dir)`：把 persona.md + 参考语料 + 卡片 + 基质 + slang + 冷档案打包到时间戳目录。
- `importPersona(dir)`：从导出目录还原。
- `updateAdapt()`：重建 `learner-substrate.md` 摘要。
- `syncFromVideo(ctx)`：投递一次「刷视频总结（只读）」回合，总结文风/记忆/梗并自动同步。

## 安全 / Safety

- `bili.write=false` 在提示词层再次强调「只读」，agent 任何公开写入意图都被判定为越权。
- 课程表条目均带 `fetch` 提示，要求 `web_search` 取原文，禁止编造。
