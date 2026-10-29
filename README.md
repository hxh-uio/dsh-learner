# 🐋 dsh-learner

> 让 AI 角色通过**周期性学习有论证、有出处的长文**，理解人文关怀，并把它作为组成人格的基质，在世界上留下自己的足迹。
>
> Autonomous long-form learning for AI agents — grow a personality, leave a footprint.

---

## 为什么需要它 / Why

很多 AI 角色"后台在学，聊天里却看不出变化"。根因通常是：**采集（agent 做）和判断（人做）劈成了两半，而判断那半是手工的、还没在跑**。于是素材在堆积，却没变成"成长"。

`dsh-learner` 把"读长文 → 写卡片 → 隔周复查 → 变化才计入人格"这条闭环**自动化**了，并且明确划分：

- **插件管**：采集归档、文风、梗、记忆、课程表、定时调度。
- **判断层（三步读法，用户指定）**：① 作者在争什么 ② 他凭什么 ③ 我哪句不同意。agent 写卡片时不讨好作者、不强行和稀泥；隔一段时间重读同篇，判断变了，才记一条「人格基质·足迹」。

---

## 它做什么 / What it does

- **自主采集归档长文**：访谈 / 书评 / 纪录片解说稿（课程表见 `lib/learner-curriculum.js`，均带真实可查出处；运行时用 `web_search` 拉原文，不硬编码正文）。
- **三行卡片（三步读法）**：读完一篇，写三行——① 作者在争什么　② 他凭什么　③ 我哪句不同意（判断层）。
- **隔周复查**：隔 `reviewDays` 天重读同一篇，对比判断有没有变；**变了才算长出自己的东西**，变化点记入「人格基质·足迹」。
- **人文关怀作人格基质**：每篇提取一条「对'人'的理解」；复查中发生变化的点作为足迹持久化（`learner-substrate.jsonl` / `.md`）。
- **B站只读接入**：可浏览视频补文风 / 梗 / 记忆样本；**本版不授权任何公开写入**（不评论、不发动态、不回公共讨论）。
- **一键导入导出人格 / 采集 / 文风梗记忆**：`learner-io.js` 的 `exportPersona / importPersona`；`updateAdapt` 重算基质摘要与一致性；`syncFromVideo` 触发「刷视频总结文风/记忆/梗并自动同步」。

---

## 安装 / Install

> 前置：一个 DSH 运行时 + 一个角色会话（提供 `ctx.sessionController`）。本插件通过 `sessionController.prompt` 往该会话塞回合，让 agent 自动干活。

### 方式一：并入既有插件（最稳，推荐）

把本仓库 `lib/` 四个文件拷进你已有插件的 `lib/`，并在该插件 `apply()` 里调用：

```js
import { startLearner } from './learner.js'
// …在 apply(ctx) 内…
try { startLearner(ctx) } catch (e) { console.warn('[learner] 启动失败：' + e.message) }
```

### 方式二：作为独立 bundle 启用

1. 在 profile 的 `package.json` 增加依赖与 bundles 条目，并 `pnpm install` 建软链：

```jsonc
"dependencies": {
  "dsh-learner": "link:/绝对路径/dsh-learner"
},
"dsh": { "profile": { "bundles": [ "…", "dsh-learner" ] } }
```

2. 确认 `cordis.patch.yml` 与本机 DSH 版本的 cordis schema 匹配（不符就退回方式一）。

---

## 配置 / Config

配置写在 `~/.dsh/learner.config.json`，缺省用内置 `DEFAULTS`：

```jsonc
{
  "enabled": true,
  "learnHour": 21, "learnMinute": 0,   // 每晚 21:00 学一篇新的
  "reviewDays": 14,                    // 隔 14 天复查（改 7 即隔周）
  "sessionId": "bili-whale",           // ← 改成你自己的角色会话 id
  "cooldownMin": 30,
  "bili": { "enabled": true, "write": false }  // write=false = 不授权公开写入
}
```

环境变量（覆盖配置文件）：

| 变量 | 含义 |
|------|------|
| `LEARNER_SESSION_ID` | 目标 agent 会话 id |
| `DSH_CHAR_ID` | 角色目录 id（用于一键导入导出人格） |
| `DSH_CHAR_DIR` | 角色目录绝对路径（覆盖上面的推导） |
| `SURFCORE_STATE_DIR` | 宿主状态目录（存放 slang.json 等） |

---

## 落盘文件 / Files (all under `~/.dsh/`)

- `learner-state.json`：调度状态（已学索引 / 各篇 learnedAt / reviewDueAt / reviews）
- `learner-cards.jsonl`：三行卡片（学习 + 复查）流水
- `learner-substrate.jsonl` / `learner-substrate.md`：人格基质·足迹（成长证据）
- `learner.config.json`：配置

---

## 安全边界 / Safety boundary

- **B站严格只读**：`bili.write=false` 硬约束，本版**不授权任何公开写入**——不评论、不发动态、不回复公共讨论区。违反此条即越权。
- 所有学习素材均带可查出处，运行时 `web_search` 取原文，禁止凭记忆编造。
- 导入导出只动角色目录与状态目录下的指定文件，不触碰其他数据。

---

## 网站 / Website

本仓库根目录的 `index.html` 是一个自包含的项目主页（无需任何外部依赖），可直接用 GitHub Pages 发布：

1. 仓库 Settings → Pages → Source 选 `main` 分支、`/ (root)`。
2. 把 `index.html` 里的 `hxh-uio` 改成你的 GitHub 用户名即可。
3. 访问 `https://hxh-uio.github.io/dsh-learner/`。

---

## 开源协议 / License

[MIT](./LICENSE) © 2026 dsh-learner contributors.
