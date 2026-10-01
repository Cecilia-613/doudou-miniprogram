const wrap = require('../../utils/page.js')
const { TOP3, TICKETS, TALK_PACK } = require('../../utils/mock.js')

/**
 * 社区工作台（第三端）
 * 这一页是给居委 / 社区民警 / 志愿者看的，不是给老人看的，
 * 所以密度按常规 Web 来，但字号仍然跟着全局三档走（工作人员也可能老花）
 */
const LV = {
  danger: { icon: '⚠️', cls: 'lv-danger', tag: '高危' },
  warn: { icon: '❓', cls: 'lv-warn', tag: '可疑' },
  safe: { icon: '✅', cls: 'lv-safe', tag: '安全' },
  ask: { icon: '💬', cls: 'lv-ask', tag: '待确认' }
}

wrap({
  data: {
    top3: [],
    tickets: [],
    talkPack: [],
    tab: 'todo',        // todo | top | talk
    copiedIdx: -1
  },

  onLoad () {
    this.setData({
      top3: TOP3,
      tickets: TICKETS.map(t => Object.assign({}, t, {
        icon: (LV[t.level] || LV.warn).icon,
        cls: (LV[t.level] || LV.warn).cls,
        tag: (LV[t.level] || LV.warn).tag
      })),
      talkPack: TALK_PACK
    })
    wx.setNavigationBarTitle({ title: '社区工作台' })
  },

  switchTab (e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },

  /** 一键接单：真机上这里该调后端改工单状态 */
  takeOrder (e) {
    const i = Number(e.currentTarget.dataset.i)
    const list = this.data.tickets.slice()
    const t = list[i]
    if (!t) return
    if (t.state === '待接单') {
      t.state = '已接单 · 上门中'
      wx.showToast({ title: '已接单，同时通知了物业陪同', icon: 'none', duration: 2000 })
    } else {
      wx.showToast({ title: '这张已经在处理了', icon: 'none', duration: 1600 })
    }
    this.setData({ tickets: list })
  },

  copyTip (e) {
    const i = Number(e.currentTarget.dataset.i)
    wx.setClipboardData({
      data: this.data.talkPack[i],
      success: () => {
        this.setData({ copiedIdx: i })
        wx.showToast({ title: '话术已经复制好了', icon: 'none', duration: 1600 })
      }
    })
  },

  copyAll () {
    wx.setClipboardData({
      data: this.data.talkPack.map((s, i) => (i + 1) + '. ' + s).join('\n'),
      success: () => wx.showToast({ title: '整套话术已复制', icon: 'none', duration: 1600 })
    })
  },

  back () {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/index/index' }) })
  }
})
