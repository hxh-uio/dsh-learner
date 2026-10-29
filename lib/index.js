// dsh-learner · 自主学习 / 采集归档插件（独立版，可单独作为 DSH bundle 启用）
// 逻辑与下嵌版一致；此文件仅提供标准 DSH 插件入口。
import { startLearner } from './learner.js'
import { exportPersona, importPersona, updateAdapt, syncFromVideo } from './learner-io.js'

export default {
  name: 'dsh-learner',
  inject: ['sessionController', 'webServer', 'connection'],
  apply(ctx) {
    // 自主生物钟：每 60s tick，到点往目标 agent 会话塞学习/复查回合
    try {
      startLearner(ctx)
    } catch (e) {
      try { console.warn('[dsh-learner] 启动失败：' + e.message) } catch {}
    }

    // 一键导入导出 / 更新适配（可被控制台或定时任务调用）
    ctx.on?.('learner:export', () => exportPersona())
    ctx.on?.('learner:import', (dir) => importPersona(dir))
    ctx.on?.('learner:adapt', () => updateAdapt())
    ctx.on?.('learner:video', () => syncFromVideo(ctx))
  },
}
