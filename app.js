/**
 * 小程序入口
 */
const Store = require('./utils/store.js')
const i18n = require('./utils/i18n.js')
const theme = require('./utils/theme.js')

App({
  onLaunch () {
    const s = Store.getSettings()
    i18n.setLang(s.dialect)
    this.globalData.settings = s
    this.globalData.profile = Store.getProfile()
    this.measureCapsule()
    // 接后端：这里可以放登录、拉取老人档案、同步亲属联系方式
  },

  /**
   * 量一下右上角那个「… ⊙」胶囊按钮（关闭 / 更多）占了多少地方。
   * 老人手抖，自定义按钮绝不能压在它旁边，否则一按就把小程序关掉了。
   * 量出来的宽度（rpx）存进 globalData，页面用它留白。
   */
  measureCapsule () {
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect()
      const sys = wx.getSystemInfoSync()
      if (!menu || !sys || !menu.width) return
      // 胶囊左边缘 → 屏幕右边缘，再留 16px 余量，换算成 rpx
      const safePx = (sys.windowWidth - menu.left) + 16
      this.globalData.capsuleSafe = Math.ceil(safePx * (750 / sys.windowWidth))
    } catch (e) {
      this.globalData.capsuleSafe = 190   // 量不出来就用保守值（胶囊约 174rpx + 余量）
    }
  },

  globalData: {
    settings: { fontScale: 'std', dialect: 'cn', voiceOn: true },
    profile: null,
    // 上一次的研判结果，供结果页/历史回看复用
    lastResult: null,
    lastPhoto: null,
    // 右上角胶囊按钮要占掉的宽度（rpx），页面顶部据此留白
    capsuleSafe: 190
  },

  /** 改设置：字号 / 方言 / 播报开关，全局立即生效 */
  setSetting (patch) {
    this.globalData.settings = Store.saveSettings(patch)
    if (patch.dialect) i18n.setLang(patch.dialect)
    const pages = getCurrentPages()
    pages.forEach(p => { if (p.$sync) p.$sync() })
    return this.globalData.settings
  },

  getVars () {
    return theme.vars(this.globalData.settings.fontScale)
  }
})
