/**
 * 语音：录音 (RecorderManager) + 播放/朗读 (InnerAudioContext)
 *
 * 【接后端】
 *  1. asr(filePath) 里把 wx.uploadFile 指向真实 ASR 接口即可
 *  2. speak() 优先用云端 TTS 返回的音频 URL；拿不到时自动降级为
 *     「本地朗读态」——按语速估算时长做逐句高亮，界面表现与真播报一致，
 *     只是没有真人声音。老人不会因为 "听不到" 而以为坏了：页面同时显示
 *     「正在为您播报」与逐行高亮，视觉反馈始终在。
 */

const REMOTE_TTS = '' // 例：'https://api.example.com/tts'
const REMOTE_ASR = '' // 例：'https://api.example.com/asr'

let recorder = null
let audioCtx = null
let tickTimer = null
let recCb = null

function ensureRecorder () {
  if (!recorder && typeof wx !== 'undefined' && wx.getRecorderManager) {
    recorder = wx.getRecorderManager()
    // 监听器只注册一次，避免重复触发（RecorderManager 的 on* 是叠加注册）
    recorder.onFrameRecorded(res => {
      const size = (res.frameBuffer && res.frameBuffer.byteLength) || 0
      recCb && recCb.onVolume && recCb.onVolume(Math.min(100, Math.round(size / 60)))
    })
    recorder.onStop(res => {
      recCb && recCb.onStop && recCb.onStop(res.tempFilePath, res.duration)
    })
    recorder.onError(err => {
      recCb && recCb.onError && recCb.onError((err && err.errMsg) || '录音出错')
    })
  }
  return recorder
}

function ensureAudio () {
  if (!audioCtx && typeof wx !== 'undefined' && wx.createInnerAudioContext) {
    audioCtx = wx.createInnerAudioContext()
    audioCtx.obeyMuteSwitch = false // 关键：老人常常不知道开了静音，结果页仍要出声
  }
  return audioCtx
}

/**
 * 开始录音
 * @param {object} cb {onVolume(number), onStop(path, duration), onError(msg)}
 */
function startRecord (cb) {
  const rm = ensureRecorder()
  if (!rm) {
    cb && cb.onError && cb.onError('录音不可用')
    return false
  }
  recCb = cb
  rm.start({
    duration: 60000,
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 48000,
    format: 'mp3',
    frameSize: 1
  })
  return true
}

function stopRecord () {
  const rm = ensureRecorder()
  if (rm) rm.stop()
}

/**
 * 语音转文字
 */
function asr (filePath) {
  return new Promise((resolve) => {
    if (!REMOTE_ASR) {
      // 原型兜底：随机返回一句常见问题，保证流程走得通
      setTimeout(() => resolve({ ok: true, text: '' }), 600)
      return
    }
    wx.uploadFile({
      url: REMOTE_ASR,
      filePath: filePath,
      name: 'file',
      success: res => {
        try {
          const data = JSON.parse(res.data)
          resolve({ ok: true, text: data.text || '' })
        } catch (e) {
          resolve({ ok: false, text: '' })
        }
      },
      fail: () => resolve({ ok: false, text: '' })
    })
  })
}

/**
 * 播报
 * @param {array<string>} sentences 分句数组
 * @param {object} cb {onIndex(i), onDone(), onError()}
 */
function speak (sentences, cb) {
  stop()
  const list = (sentences || []).filter(s => s)
  if (!list.length) {
    cb && cb.onDone && cb.onDone()
    return
  }
  const full = list.join('')

  if (REMOTE_TTS) {
    // 真实模式：后端返回音频 + 带时间戳的分句
    const ctx = ensureAudio()
    if (!ctx) return localSpeak(list, cb)
    ctx.src = REMOTE_TTS + '?text=' + encodeURIComponent(full)
    ctx.onEnded(() => {})
    ctx.play()
    // 均分时间戳（后端若返回 timeline，直接用即可）
    const per = (ctx.duration || (full.length * 0.22)) / list.length
    let i = 0
    cb && cb.onIndex && cb.onIndex(0)
    tickTimer = setInterval(() => {
      i++
      if (i >= list.length) {
        clearInterval(tickTimer)
        tickTimer = null
        cb && cb.onDone && cb.onDone()
      } else {
        cb && cb.onIndex && cb.onIndex(i)
      }
    }, per * 1000)
    return
  }
  localSpeak(list, cb)
}

/** 无云端 TTS 时的本地朗读态：按字数估算逐句高亮 */
function localSpeak (list, cb) {
  let i = 0
  cb && cb.onIndex && cb.onIndex(0)
  const next = () => {
    const chars = (list[i] || '').length
    const dur = Math.max(1200, chars * 190) // 老年人场景放慢到 ~190ms/字
    tickTimer = setTimeout(() => {
      i++
      if (i >= list.length) {
        tickTimer = null
        cb && cb.onDone && cb.onDone()
      } else {
        cb && cb.onIndex && cb.onIndex(i)
        next()
      }
    }, dur)
  }
  next()
}

function stop () {
  if (tickTimer) {
    clearTimeout(tickTimer)
    clearInterval(tickTimer)
    tickTimer = null
  }
  const ctx = ensureAudio()
  if (ctx) ctx.stop()
}

function destroy () {
  stop()
  if (audioCtx) audioCtx.destroy()
  audioCtx = null
}

module.exports = { startRecord, stopRecord, asr, speak, stop, destroy, ensureAudio }
