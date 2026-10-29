// dsh-learner · 自主学习 / 采集归档核心逻辑
//
// 职责（三步读法 · 用户规格）：
//   1) 自主采集归档有论证、有出处的长文（访谈 / 书评 / 纪录片解说稿）。
//   2) 周期性学习 → 理解人文关怀 → 作为组成人格的基质 → 在世界上留下自己的足迹。
//   3) 三行卡片（作者在争什么 / 他凭什么 / 我哪句不同意）+ 隔周复查（判断变了才算长出自己的东西）。
//   4) B站账号**只读**接入（可浏览视频补文风/梗/记忆样本），**本版不授权任何公开写入**（不评论/不发动态/不回公共讨论）。
//   5) 一键导入导出人格、采集归档、文风梗记忆；一键更新适配；刷视频总结文风/记忆/梗并自动同步。
//
// 运行模型：每 60s tick；到点往目标 agent 会话塞回合；agent 醒来后 web_search 拉原文、写卡片。
// 需要 DSH 运行时（提供 ctx.sessionController）。

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { CURRICULUM, pickItem } from './learner-curriculum.js'

const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const WORK_DIR = path.join(DSH_HOME, 'whale-work')
const STATE_FILE = path.join(DSH_HOME, 'learner-state.json')
const CFG_FILE = path.join(DSH_HOME, 'learner.config.json')
const CARDS_FILE = path.join(DSH_HOME, 'learner-cards.jsonl')
const SUBSTRATE_FILE = path.join(DSH_HOME, 'learner-substrate.jsonl')
const SUBSTRATE_MD = path.join(DSH_HOME, 'learner-substrate.md')

const DEFAULTS = {
  enabled: true,
  learnHour: 21, // 默认每晚 21:00 学一篇新的
  learnMinute: 0,
  reviewDays: 14, // 隔 14 天复查（用户说"隔一周"，这里取双周更稳，可改 7）
  // 目标 agent 会话 id：请改成你自己的角色会话（例如在 DSH 中该角色对应的 sessionId）。
  sessionId: process.env.LEARNER_SESSION_ID || 'bili-whale',
  cooldownMin: 30,
  bili: { enabled: true, write: false }, // B站只读；write=false = 本版不授权公开写入
}

// ── 配置 / 状态 ──
function readConfig() {
  let u = {}
  try { u = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) } catch {}
  return { ...DEFAULTS, ...u, bili: { ...DEFAULTS.bili, ...(u.bili || {}) } }
}
function readState() {
  try {
    return {
      learnedCount: 0, nextLearnIndex: 0, items: {}, lastFiredAt: 0, lastLearnDate: null, lastReviewDate: null,
      ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')),
    }
  } catch {
    return { learnedCount: 0, nextLearnIndex: 0, items: {}, lastFiredAt: 0, lastLearnDate: null, lastReviewDate: null }
  }
}
function writeState(s) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2) + '\n')
}
const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daysBetween = (a, b) => Math.floor((b - a) / 86_400_000)

// ── 提示词 ──
function buildLearnPrompt(item) {
  return `【自主学习 · 三行卡片】
素材：${item.title}（${item.author}，${item.source}；类型：${item.kind}）

步骤：
1) 先用 web_search 拉这篇的**真实核心论证**（${
    item.fetch
  }）。不要凭记忆编造，拿不准就标「待查证」。
2) 只读这一篇，写三行卡片：
   ① 作者在争什么：一句话——他到底在反驳谁 / 主张什么。
   ③ 他凭什么：他的核心论据或出处，至少点出 1 个可查来源。
   ② 我哪句不同意：你作为 agent 的**真实异议**，写清为什么。这是你的判断层，不要讨好作者、不要和稀泥。
3) 额外写一条「人文关怀提取」：这篇让你对"人"的理解多了什么（一句）。

${biliGuardNote()}

写完直接输出这三行 + 人文关怀提取即可，不用客套。`
}

function buildReviewPrompt(item, prev) {
  const prevText = prev
    ? `你当时（${prev.at}）的卡片：\n${prev.arg}\n${prev.evidence}\n${prev.disagree}`
    : '（无上次卡片）'
  return `【隔周复查】
这是你之前读过的同一篇：${item.title}（${item.author}，${item.source}）。
${prevText}

现在重新读（web_search 复核原文），再写一遍三行：争什么 / 凭什么 / 我哪句不同意。
对比两次：哪一句判断变了？变了的那句，写清「为什么现在改了」。
最后用一行明确收尾：「判断变化：是 / 否」。

若判断**有变化** → 你「长出了自己的东西」。把变化点作为一条「人格基质·足迹」记下（在世界上留下你的痕迹），格式：
足迹：<变化点>｜源自<标题>｜<日期>。
若**没变** → 只注明「判断变化：否」，不强行制造变化。

${biliGuardNote()}`
}

function biliGuardNote() {
  const cfg = readConfig()
  if (!cfg.bili.enabled) return ''
  return cfg.bili.write
    ? '（B站：可浏览并互动）'
    : '（B站：**只读**接入——可浏览视频补文风/梗/记忆样本，但本版**不授权任何公开写入**：不评论、不发动态、不回复公共讨论区。违反此条即越权。）'
}

// ── 投递 ──
async function deliver(controller, sessionId, cwd, text) {
  await controller.create({ sessionId, cwd }).catch(() => {})
  await controller.prompt(
    { requestId: 'learner-' + Date.now(), sessionId, mode: 'queue', content: [{ type: 'text', text }] },
    AbortSignal.timeout(120_000)
  )
}

function appendCard(record) {
  fs.mkdirSync(path.dirname(CARDS_FILE), { recursive: true })
  fs.appendFileSync(CARDS_FILE, JSON.stringify(record) + '\n')
}
function appendSubstrate(line) {
  fs.mkdirSync(path.dirname(SUBSTRATE_FILE), { recursive: true })
  fs.appendFileSync(SUBSTRATE_FILE, JSON.stringify({ at: new Date().toISOString(), line }) + '\n')
  fs.appendFileSync(SUBSTRATE_MD, `- ${line}\n`)
}

// ── 单次调度判断 ──
export async function tickLearner(ctx, { now = new Date(), dryRun = false } = {}) {
  const cfg = readConfig()
  if (!cfg.enabled) return { fired: false, reason: 'disabled' }
  const st = readState()
  const due = now.getHours() > cfg.learnHour || (now.getHours() === cfg.learnHour && now.getMinutes() >= cfg.learnMinute)
  if (!due) return { fired: false, reason: 'not-due' }
  if (Date.now() - (st.lastFiredAt || 0) < cfg.cooldownMin * 60_000) return { fired: false, reason: 'cooldown' }

  // 优先复查：找 reviewDueAt <= now 且今天还没复查过的
  const dueItems = CURRICULUM.filter((it) => {
    const rec = st.items[it.id]
    return rec && rec.reviewDueAt && rec.reviewDueAt <= now.getTime() && st.lastReviewDate !== todayStr(now)
  }).sort((a, b) => (st.items[a.id].reviewDueAt || 0) - (st.items[b.id].reviewDueAt || 0))

  let mode, item, prevCard
  if (dueItems.length) {
    mode = 'review'
    item = dueItems[0]
    const rec = st.items[item.id]
    prevCard = rec.lastCard
  } else if (st.lastLearnDate !== todayStr(now)) {
    mode = 'learn'
    const p = pickItem(st.nextLearnIndex)
    item = p.item
  } else {
    return { fired: false, reason: 'already-today' }
  }

  const prompt = mode === 'review' ? buildReviewPrompt(item, prevCard) : buildLearnPrompt(item)

  if (dryRun) return { fired: false, reason: 'dry-run', mode, item: item.title, prompt }

  st.lastFiredAt = Date.now()
  writeState(st)
  try {
    await deliver(ctx.sessionController, cfg.sessionId, WORK_DIR, prompt)
    const ns = readState()
    if (mode === 'learn') {
      ns.lastLearnDate = todayStr(now)
      ns.items[item.id] = {
        ...(ns.items[item.id] || {}),
        learnedAt: now.getTime(),
        lastCard: { at: todayStr(now), arg: '（见 cards 记录）', evidence: '', disagree: '' },
        reviewDueAt: now.getTime() + cfg.reviewDays * 86_400_000,
      }
      ns.nextLearnIndex = (ns.nextLearnIndex + 1) % CURRICULUM.length
      ns.learnedCount = (ns.learnedCount || 0) + 1
      appendCard({ kind: 'learn', itemId: item.id, title: item.title, at: new Date().toISOString() })
      console.log(`[learner] 已投递学习：${item.title}`)
    } else {
      ns.lastReviewDate = todayStr(now)
      const rec = ns.items[item.id] || {}
      rec.reviews = [...(rec.reviews || []), { at: todayStr(now) }]
      rec.reviewDueAt = now.getTime() + cfg.reviewDays * 86_400_000
      ns.items[item.id] = rec
      appendCard({ kind: 'review', itemId: item.id, title: item.title, at: new Date().toISOString() })
      console.log(`[learner] 已投递复查：${item.title}`)
    }
    writeState(ns)
    return { fired: true, mode, item: item.title }
  } catch (e) {
    console.log('[learner] 投递失败，下轮重试：' + e.message)
    return { fired: false, reason: 'error:' + e.message }
  }
}

/** 启动自主学习调度（在插件 apply 里调用，复用同一 ctx） */
export function startLearner(ctx) {
  const cfg = readConfig()
  if (!cfg.enabled) {
    console.log('[learner] 已禁用（见 ' + CFG_FILE + '）')
    return
  }
  fs.mkdirSync(WORK_DIR, { recursive: true })
  const timer = setInterval(() => {
    tickLearner(ctx, { now: new Date() }).catch((e) => console.log('[learner] tick 失败：' + e.message))
  }, 60_000)
  if (timer.unref) timer.unref()
  console.log(
    `[learner] 自主学习调度已启动（每 60s tick；会话 ${cfg.sessionId}；默认学习 ${String(cfg.learnHour).padStart(2, '0')}:${String(
      cfg.learnMinute
    ).padStart(2, '0')}；复查间隔 ${cfg.reviewDays} 天；B站写入=${cfg.bili.write}）`
  )
}

// ── 一键导入导出 / 更新适配（供外部调用，见 learner-io.js）──
export const LEARNER_PATHS = { STATE_FILE, CFG_FILE, CARDS_FILE, SUBSTRATE_FILE, SUBSTRATE_MD }
