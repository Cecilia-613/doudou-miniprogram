const wrap = require('../../utils/page.js')
const Store = require('../../utils/store.js')
const { QUICK_ASKS } = require('../../utils/mock.js')
const agent = require('../../utils/agent.js')

const LV = {
  danger: { icon: '⚠️', cls: 'lv-danger', bg: 'bg-danger' },
  warn: { icon: '❓', cls: 'lv-warn', bg: 'bg-warn' },
  safe: { icon: '✅', cls: 'lv-safe', bg: 'bg-safe' },
  ask: { icon: '💬', cls: 'lv-ask', bg: 'bg-ask' }
}

function greetName () {
  const h = new Date().getHours()
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

function timeAgo (ts) {
  const d = new Date(ts)
  const now = new Date()
  const diffDay = Math.floor((now - d) / 86400000)
  if (diffDay === 0) return '今天 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  if (diffDay === 1) return '昨天'
  if (diffDay === 2) return '前天'
  return diffDay + ' 天前'
}

wrap({
  data: {
    profile: null,
    greet: '早上好',
    history: [],
    panel: '',            // '' | 'setting' | 'help' | 'pick'
    pendingText: '',
    recording: false,
    loading: false,
    loadingTip: '',
    quickAsks: QUICK_ASKS,
    asrHint: '',
    capsuleSafe: 190
  },

  onLoad () {
    this.setData({
      profile: Store.getProfile(),
      greet: greetName(),
      // 右上角胶囊按钮的宽度：顶部那一块按它留白，免得老人一按就把小程序关了
      capsuleSafe: (getApp().globalData && getApp().globalData.capsuleSafe) || 190
    })
    this.refreshHistory()
  },

  noop () { /* 阻止浮层冒泡关闭 */ },

  onShow () {
    this.setData({ loading: false })
    this.refreshHistory()
  },

  refreshHistory () {
    const list = Store.getHistory().slice(0, 4).map(item => {
      const meta = LV[item.level] || LV.warn
      return Object.assign({}, item, {
        icon: meta.icon,
        cls: meta.cls,
        short: (item.text || '').length > 14 ? item.text.slice(0, 14) + '…' : item.text,
        ago: timeAgo(item.time)
      })
    })
    this.setData({ history: list })
  },

  /* ---------- 录音 ---------- */
  onRecordStart () {
    wx.vibrateShort && wx.vibrateShort({ type: 'light' })
    this.setData({ recording: true, asrHint: '' })
  },

  onRecorded (e) {
    const path = e.detail.path
    const duration = e.detail.duration || 0
    this.setData({ recording: false, loading: true, loadingTip: this.data.txt.recognizing })

    if (duration && duration < 800) {
      // 太短，多半是按错/嘴快松开
      this.setData({ loading: false, panel: 'pick' })
      return
    }

    // ① 语音 → 文字（没配 ASR 会返回空）
    agent.asr(path).then(text => {
      text = (text || '').trim()
      if (!text) {
        // 没听清：给一张大字选项板，一个字也不用打
        this.setData({ loading: false, panel: 'pick' })
        return
      }
      // ② 文字 → 智能体研判（断网/没配模型会自动退到本地规则）
      this.setData({ loadingTip: this.data.txt.thinking })
      agent.analyzeText(text).then(r => {
        getApp().globalData.lastResult = r
        this.setData({ loading: false })
        wx.navigateTo({
          url: '/pages/result/result?resultId=last&from=voice&text=' + encodeURIComponent(text)
        })
      })
    })
  },

  onRecordError () {
    this.setData({ recording: false, loading: false, panel: 'pick' })
  },

  /* ---------- 快捷问法（零打字首选） ---------- */
  onPick (e) {
    const text = e.currentTarget.dataset.text
    this.setData({ panel: '', loading: true, loadingTip: this.data.txt.thinking })
    // 同样交给智能体：点选的句子也是一句完整的话
    agent.analyzeText(text).then(r => {
      getApp().globalData.lastResult = r
      this.setData({ loading: false })
      wx.navigateTo({
        url: '/pages/result/result?resultId=last&from=voice&text=' + encodeURIComponent(text)
      })
    })
  },

  closePick () {
    this.setData({ panel: '' })
  },

  openQuick () {
    this.setData({ panel: 'pick' })
  },

  /* ---------- 入口 ---------- */
  goCapture () {
    wx.navigateTo({ url: '/pages/capture/capture' })
  },

  goQuiz () {
    wx.navigateTo({ url: '/pages/quiz/quiz' })
  },

  goHistory () {
    wx.navigateTo({ url: '/pages/history/history' })
  },

  goFamily () {
    wx.navigateTo({ url: '/pages/family/family' })
  },

  goCommunity () {
    wx.navigateTo({ url: '/pages/community/community' })
  },

  /* ---------- 求人帮忙（不做确认弹窗，做了也能「再想想」） ---------- */
  openHelp () {
    this.setData({ panel: 'help', pendingText: '' })
  },

  callHelper (e) {
    const phone = e.currentTarget.dataset.phone
    this.setData({ panel: '' })
    if (phone.indexOf('*') >= 0) {
      wx.showToast({ title: this.data.txt.helpSent, icon: 'none', duration: 1800 })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  /* ---------- 设置面板：字大小 / 方言 / 子女周报 ---------- */
  openSetting () {
    this.setData({ panel: 'setting' })
  },

  closePanel () {
    this.setData({ panel: '' })
  },

  setFont (e) {
    const app = getApp()
    app.setSetting({ fontScale: e.currentTarget.dataset.v })
  },

  toggleDialect () {
    const app = getApp()
    const next = this.data.lang === 'cn' ? 'sh' : 'cn'
    app.setSetting({ dialect: next })
  },

  toggleVoice () {
    const app = getApp()
    app.setSetting({ voiceOn: !this.data.voiceOn })
  }
})
