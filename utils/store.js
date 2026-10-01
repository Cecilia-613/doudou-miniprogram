/**
 * 本地存储：设置 / 历史 / 亲属
 * 老人只需要设置一次，之后永远记住
 */

const K_SETTINGS = 'doudou.settings'
const K_HISTORY = 'doudou.history'
const K_PROFILE = 'doudou.profile'

const DEFAULT_SETTINGS = {
  fontScale: 'std',   // std | large | xl
  dialect: 'cn',      // cn | sh
  voiceOn: true       // 结果自动播报
}

const DEFAULT_PROFILE = {
  name: '陈阿婆',
  building: '3 号楼 502',
  kid: { name: '囡囡', phone: '138****6021' },
  helper: { name: '社区小张', phone: '138****0088' }
}

function get (key, def) {
  try {
    const v = wx.getStorageSync(key)
    return (v === '' || v === null || v === undefined) ? def : v
  } catch (e) {
    return def
  }
}

function set (key, val) {
  try {
    wx.setStorageSync(key, val)
  } catch (e) {
    /* 存储失败不影响使用 */
  }
}

const Store = {
  getSettings () {
    return Object.assign({}, DEFAULT_SETTINGS, get(K_SETTINGS, {}))
  },
  saveSettings (patch) {
    const s = Object.assign(this.getSettings(), patch)
    set(K_SETTINGS, s)
    return s
  },
  getProfile () {
    return Object.assign({}, DEFAULT_PROFILE, get(K_PROFILE, {}))
  },
  getHistory () {
    const h = get(K_HISTORY, [])
    return Array.isArray(h) ? h : []
  },
  /** item: {id, level, text, summary, time} */
  pushHistory (item) {
    const h = this.getHistory()
    h.unshift(Object.assign({ id: 'H' + Date.now(), time: Date.now() }, item))
    set(K_HISTORY, h.slice(0, 20))
    return h
  },
  clearHistory () {
    set(K_HISTORY, [])
  },
  clearAll () {
    [K_SETTINGS, K_HISTORY].forEach(k => {
      try { wx.removeStorageSync(k) } catch (e) {}
    })
  }
}

module.exports = Store
