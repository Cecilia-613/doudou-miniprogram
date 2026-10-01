const wrap = require('../../utils/page.js')
const risk = require('../../utils/risk.js')
const Store = require('../../utils/store.js')
const speech = require('../../utils/speech.js')

wrap({
  data: {
    r: null,
    units: [],
    speaking: false,
    activeIdx: -1,
    from: 'voice',
    words: [],
    photoNote: '',
    panel: '',
    profile: null,
    notified: false
  },

  onLoad (q) {
    const app = getApp()
    const text = decodeURIComponent(q.text || '')
    const from = q.from || 'voice'
    let words = []
    if (q.words) {
      try { words = JSON.parse(decodeURIComponent(q.words)) } catch (e) { words = [] }
    }

    let r
    if (q.resultId === 'last' && app.globalData.lastResult) {
      r = app.globalData.lastResult
      // 拍照进来时，图上画出来的可疑词跟着结果一起带过来
      words = r.words || words
    } else {
      r = risk.analyze(text)
    }

    // 高危时默认替老人把消息送出去（三方闭环），并在第三条 action 上打勾
    if (r.level === 'danger' && r.actions.length) {
      const last = r.actions.length - 1
      r.actions[last] = {
        cn: '已经帮您通知囡囡了',
        sh: '已经帮侬通知囡囡了',
        done: true
      }
    }

    app.globalData.lastResult = r
    Store.pushHistory({ level: r.level, text: text || r.typeText, summary: r.typeText })

    this.setData({
      r: r,
      from: from,
      words: words,
      photoNote: this.$t('suspiciousWords', { n: words.length }),
      profile: Store.getProfile(),
      units: buildUnits(r, text, this)
    })

    const titles = {
      danger: '这是骗子！',
      warn: '小心',
      safe: '放心，这是安全的',
      ask: '这个得再问问'
    }
    wx.setNavigationBarTitle({ title: titles[r.level] || '兜兜说' })
  },

  onReady () {
    // 进入页面 0.5s 后自动开播，不需要老人点任何东西
    this.repeatCount = 0
    setTimeout(() => {
      if (this.data.voiceOn) this.speak()
      this.armIdleRepeat()
    }, 500)
  },

  onUnload () {
    speech.stop()
    if (this._idle) clearTimeout(this._idle)
  },

  onHide () {
    speech.stop()
    this.setData({ speaking: false })
  },

  /* ---------- 播报 ---------- */
  speak () {
    const sentences = this.data.units.map(u => u.speak)
    this.setData({ speaking: true, activeIdx: 0 })
    speech.speak(sentences, {
      onIndex: i => this.setData({ activeIdx: i }),
      onDone: () => this.setData({ speaking: false, activeIdx: -1 })
    })
  },

  stopSpeak () {
    speech.stop()
    this.setData({ speaking: false, activeIdx: -1 })
  },

  replay () {
    this.stopSpeak()
    setTimeout(() => this.speak(), 120)
  },

  /** 停留 30s 没动作就再读一遍：老人可能是没听清 */
  armIdleRepeat () {
    if (this._idle) clearTimeout(this._idle)
    this._idle = setTimeout(() => {
      if (this.repeatCount >= 1) return
      this.repeatCount++
      if (!this.data.speaking) this.replay()
      this.armIdleRepeat()
    }, 30000)
  },

  touchAnywhere () {
    if (this._idle) clearTimeout(this._idle)
    this.armIdleRepeat()
  },

  /* ---------- 底部动作 ---------- */
  iKnow () {
    this.stopSpeak()
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: '/pages/index/index' })
    })
  },

  openHelp () {
    this.stopSpeak()
    this.setData({ panel: 'help' })
  },

  closePanel () { this.setData({ panel: '' }) },
  noop () {},

  /** 这是给子女看的那一页：真机上由微信推送卡片点进来，原型里从这里进 */
  goFamily () {
    this.stopSpeak()
    this.setData({ panel: '' })
    wx.navigateTo({ url: '/pages/family/family' })
  },

  callHelper (e) {
    const phone = e.currentTarget.dataset.phone
    this.setData({ panel: '' })
    if (phone.indexOf('*') >= 0) {
      this.setData({ notified: true })
      wx.showToast({ title: this.data.txt.helpSent, icon: 'none', duration: 1800 })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  askAgain () {
    wx.navigateBack()
  }
})

/**
 * 把结果拆成「播报单元」，做到逐句高亮与页面结构一致：
 * headline → type → 回显 → 为什么 → 本地案例 → 现在做三件事
 */
function buildUnits (r, text, ctx) {
  const lang = ctx.data.lang || 'cn'
  const units = []
  units.push({ id: 'headline', kind: 'headline', text: lang === 'sh' ? r.headlineSh : r.headline, speak: r.headline })
  units.push({ id: 'type', kind: 'type', text: r.typeText, speak: r.typeText + '。' })
  // 回显老人原话建立信任；拍照进来没有原话，就不要念一句空的引号
  if (text) {
    units.push({ id: 'echo', kind: 'echo', text: text, speak: '您刚才问的是，' + text })
  }

  r.reason.forEach((s, i) => {
    units.push({ id: 'reason' + i, kind: 'reason', text: s, speak: s })
  })
  if (r.story) {
    units.push({ id: 'story', kind: 'story', text: r.story, speak: r.story })
  }
  units.push({
    id: 'actitle',
    kind: 'actitle',
    text: lang === 'sh' ? '现在做三桩事体' : '现在做三件事',
    speak: '现在做三件事。'
  })
  r.actions.forEach((a, i) => {
    units.push({
      id: 'act' + i,
      kind: 'action',
      index: i + 1,
      no: ['①', '②', '③', '④', '⑤'][i] || String(i + 1),
      text: lang === 'sh' ? a.sh : a.cn,
      done: !!a.done,
      speak: a.cn
    })
  })
  // 拿不准的第四种结果：明确把球交给人，不能装作看懂了
  if (r.level === 'ask') {
    units.push({
      id: 'askcta',
      kind: 'askcta',
      text: lang === 'sh' ? '拿勿准就慢一慢，喊人来一道看' : '拿不准就慢一慢，喊人来一起看',
      speak: '拿不准就慢一慢，我帮您喊人来一起看。'
    })
  }
  return units
}
