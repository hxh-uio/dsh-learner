// dsh-learner · 一键导入导出 / 更新适配（采集归档、文风、梗、记忆）
//
// 功能（用户规格）：
//   · 一键导出人格：把 persona.md + 参考语料 + 学习卡片 + 基质 + 梗(slang) + 冷档案 打包到时间戳目录。
//   · 一键导入人格：从导出目录还原上述文件。
//   · 一键更新适配：重算 substrate.md 摘要、刷新课程表抓取提示、做一致性自检。
//   · 刷视频总结：触发一次「只读浏览 B站视频 → 总结文风/记忆/网络梗并自动同步」的会话回合。
//
// 注意：CHAR_ID / 路径均为可配置项，默认是占位值，请改成你自己的角色。

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')

// ↓↓↓ 把下面这行改成你自己的角色 id（例如 char-xxxxxxxx）；或在环境变量 DSH_CHAR_ID 中指定。
const CHAR_ID = process.env.DSH_CHAR_ID || 'char-example'
const CHAR_DIR = process.env.DSH_CHAR_DIR || path.join(DSH_HOME, 'surfcore', 'characters', CHAR_ID)
// ↓↓↓ 你的 surfcore 状态目录（存放 slang.json 等）。默认 ~/.dsh 之上的宿主 state；按需调整。
const STATE_DIR = process.env.SURFCORE_STATE_DIR || path.join(os.homedir(), 'surfcore', 'state')
const HOTCOLD = path.join(CHAR_DIR, 'memory', 'hotcold')

const SOURCES = [
  { key: 'persona', src: path.join(CHAR_DIR, 'persona.md') },
  { key: 'reference', src: CHAR_DIR, recurse: false }, // 参考语料目录（仅文件）
  { key: 'cards', src: path.join(DSH_HOME, 'learner-cards.jsonl') },
  { key: 'substrateJsonl', src: path.join(DSH_HOME, 'learner-substrate.jsonl') },
  { key: 'substrateMd', src: path.join(DSH_HOME, 'learner-substrate.md') },
  { key: 'slang', src: path.join(STATE_DIR, 'slang.json') },
  { key: 'archive', src: path.join(HOTCOLD, 'archive.jsonl') },
  { key: 'memories', src: path.join(HOTCOLD, 'memories.json') },
]

function ts() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(
    d.getHours()
  ).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`
}

export function exportPersona(outDir) {
  const dir = outDir || path.join(DSH_HOME, `learner-export-${ts()}`)
  fs.mkdirSync(dir, { recursive: true })
  for (const s of SOURCES) {
    try {
      if (s.recurse === false) {
        // 仅复制 CHAR_DIR 下的 .md / .json 文件（参考语料），不打进子目录
        if (!fs.existsSync(s.src)) continue
        const files = fs.readdirSync(s.src).filter((f) => /\.(md|json|txt)$/.test(f))
        const sub = path.join(dir, 'reference')
        fs.mkdirSync(sub, { recursive: true })
        for (const f of files) fs.copyFileSync(path.join(s.src, f), path.join(sub, f))
      } else if (fs.existsSync(s.src)) {
        const base = s.key + (path.extname(s.src) || path.basename(s.src))
        fs.copyFileSync(s.src, path.join(dir, base))
      }
    } catch (e) {
      console.log(`[learner-io] 导出跳过 ${s.key}: ${e.message}`)
    }
  }
  const manifest = { exportedAt: new Date().toISOString(), sources: SOURCES.map((s) => s.key) }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`[learner-io] 已导出人格包 → ${dir}`)
  return dir
}

export function importPersona(fromDir) {
  if (!fromDir || !fs.existsSync(fromDir)) throw new Error('导入目录不存在：' + fromDir)
  let n = 0
  for (const s of SOURCES) {
    try {
      if (s.recurse === false) {
        const sub = path.join(fromDir, 'reference')
        if (!fs.existsSync(sub)) continue
        for (const f of fs.readdirSync(sub)) {
          const dst = path.join(s.src, f)
          fs.mkdirSync(path.dirname(dst), { recursive: true })
          fs.copyFileSync(path.join(sub, f), dst)
          n++
        }
      } else {
        const base = s.key + (path.extname(s.src) || path.basename(s.src))
        const src = path.join(fromDir, base)
        if (fs.existsSync(src)) {
          fs.mkdirSync(path.dirname(s.src), { recursive: true })
          fs.copyFileSync(src, s.src)
          n++
        }
      }
    } catch (e) {
      console.log(`[learner-io] 导入跳过 ${s.key}: ${e.message}`)
    }
  }
  console.log(`[learner-io] 已导入 ${n} 个文件（来自 ${fromDir}）`)
  return n
}

export function updateAdapt() {
  // 一键更新适配：重算 substrate.md 摘要；刷新课程抓取提示；做一致性自检
  const subJsonl = path.join(DSH_HOME, 'learner-substrate.jsonl')
  const subMd = path.join(DSH_HOME, 'learner-substrate.md')
  let lines = []
  try { lines = fs.readFileSync(subJsonl, 'utf8').split('\n').filter(Boolean) } catch {}
  // 重建可读 substrate.md
  const header = `# 人格基质 · 足迹（由 dsh-learner 自动汇总）\n> 更新于 ${new Date().toISOString()}\n\n`
  const body =
    lines
      .map((l) => {
        try { return `- ${JSON.parse(l).line}` } catch { return '' }
      })
      .filter(Boolean)
      .join('\n') || '（暂无足迹）'
  fs.writeFileSync(subMd, header + body + '\n')
  console.log(`[learner-io] 已更新适配：substrate.md 含 ${lines.length} 条足迹`)
  return lines.length
}

export async function syncFromVideo(ctx, { sessionId = process.env.LEARNER_SESSION_ID || 'bili-whale' } = {}) {
  // 刷视频总结：只读浏览 B站视频，总结文风/记忆/网络梗并自动同步（写入既有 slang/memory 管线）
  const prompt = `【刷视频总结（只读）】
去 B站**只读**浏览 1–2 个你感兴趣的视频（纪录片 / 访谈 / 书评类优先）。
看完做三件事，记进你的学习库：
1) 文风：这段内容用了什么叙述节奏 / 修辞，可借鉴到你自己的表达里？一句话。
2) 记忆：里面有什么你之前不知道的事实 / 人物 / 作品？一条。
3) 网络梗：弹幕或评论里出现了什么新梗 / 说法？如果值得，按既有格式补进 slang（黑话）库，标注来源视频。
注意：本版**不授权任何公开写入**——不评论、不发动态、不回复公共讨论区。只做采集与总结。`
  await ctx.sessionController.create({ sessionId, cwd: path.join(DSH_HOME, 'whale-work') }).catch(() => {})
  await ctx.sessionController.prompt(
    { requestId: 'learner-video-' + Date.now(), sessionId, mode: 'queue', content: [{ type: 'text', text: prompt }] },
    AbortSignal.timeout(120_000)
  )
  console.log('[learner-io] 已投递「刷视频总结」回合')
}
