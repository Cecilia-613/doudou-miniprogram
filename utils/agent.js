/**
 * 智能体接入层 —— 小程序里所有「问兜兜」都从这里走
 *
 * 为什么不能直接调大模型：
 *   1. 小程序包可以反编译，API Key 放前端等于公开；
 *   2. wx.request 有域名白名单，只能请求自己已备案的域名。
 * 所以：小程序 → 你的 agent-server → 大模型/ASR/OCR/TTS。
 *
 * 用法（三步）：
 *   1. 部署 agent-server（见 /workspace/agent-server）
 *   2. 把下面的 AGENT_BASE 改成你的 https 域名
 *   3. 小程序后台「开发管理 → 服务器域名 → request 合法域名」加上它
 *
 * 断网 / 超时 / 没配模型怎么办：
 *   全部自动降级到本地规则 utils/risk.js，并且 result.confidence / engine 会标明来源，
 *   老人看到的界面完全一样，只是右上角的判断来源不同。
 */

const risk = require('./risk.js')

/** 后端地址；留空表示只用本地规则（离线演示也能跑） */
const AGENT_BASE = '' // 例：'https://doudou-agent.yourdomain.com'
const TIMEOUT = 15000

function req (path, method, data) {
  return new Promise(resolve => {
    if (!AGENT_BASE) {
      resolve({ ok: false, offline: true, data: null })
      return
    }
    wx.request({
      url: AGENT_BASE + path,
      method: method || 'POST',
      data: data,
      timeout: TIMEOUT,
      header: { 'content-type': 'application/json' },
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, data: res.data })
        } else {
          resolve({ ok: false, data: null, status: res.statusCode })
        }
      },
      fail: () => resolve({ ok: false, data: null, offline: true })
    })
  })
}

/** 服务端契约 → 小程序内部结果结构（与 risk.js 输出对齐） */
function fromAgent (d) {
  const meta = risk.LEVEL[d.level] || risk.LEVEL.ask
  return {
    level: d.level || 'ask',
    icon: d.icon || meta.icon,
    headline: d.headline_cn || meta.cn,
    headlineSh: d.headline_sh || meta.sh,
    typeText: d.type_text || '',
    tags: [],
    reason: d.reason || [],
    story: d.story || '',
    actions: (d.actions || []).map(a => ({ cn: a.cn, sh: a.sh || a.cn, done: !!a.done })),
    words: d.keywords || [],
    confidence: d.confidence || 0,
    engine: 'agent'
  }
}

/**
 * 文本/语音转写后的研判
 * @returns {Promise<object>} 与 risk.analyze 同结构的结果
 */
function analyzeText (text) {
  return req('/agent/analyze-text', 'POST', { text: text }).then(r => {
    if (r.ok && r.data && r.data.engine === 'agent') return fromAgent(r.data)
    // 没配模型 / 服务端出错 / 断网 → 本地规则兜底
    return risk.analyze(text)
  })
}

/**
 * 图片研判：会先压缩再上传，避免 6MB 上限
 * @param {string} filePath 本地临时路径（拍照/相册）
 */
function analyzeImage (filePath, fallbackText) {
  return new Promise(resolve => {
    const done = b64 => {
      req('/agent/analyze-image', 'POST', { image: b64 }).then(r => {
        if (r.ok && r.data) {
          if (r.data.engine === 'agent') { resolve(fromAgent(r.data)); return }
          // 服务端没开视觉：用它给的「问人」文案，比装作看懂了强
          resolve(fromAgent(r.data))
          return
        }
        resolve(fallbackText
          ? risk.analyze(fallbackText)
          : risk.unknownImage())
      })
    }
    try {
      const fs = wx.getFileSystemManager()
      fs.readFile({
        filePath: filePath,
        encoding: 'base64',
        success: res => done(res.data),
        fail: () => resolve(fallbackText ? risk.analyze(fallbackText) : risk.unknownImage())
      })
    } catch (e) {
      resolve(fallbackText ? risk.analyze(fallbackText) : risk.unknownImage())
    }
  })
}

/** 语音转文字：拿不到转写结果就返回空串，调用方会降级到「大字选项板」 */
function asr (filePath) {
  return new Promise(resolve => {
    if (!AGENT_BASE) { resolve(''); return }
    wx.uploadFile({
      url: AGENT_BASE + '/asr',
      filePath: filePath,
      name: 'file',
      timeout: TIMEOUT,
      success: res => {
        try {
          const d = JSON.parse(res.data)
          resolve((d && d.text) || '')
        } catch (e) { resolve('') }
      },
      fail: () => resolve('')
    })
  })
}

/** 有 TTS 返回音频地址；没有就返回空串，结果页走「逐句高亮」的朗读态 */
function tts (text) {
  return req('/tts', 'POST', { text: text, rate: 0.85 }).then(r => {
    if (r.ok && r.data && r.data.audio_url) return r.data.audio_url
    return ''
  })
}

module.exports = { analyzeText, analyzeImage, asr, tts, AGENT_BASE }
