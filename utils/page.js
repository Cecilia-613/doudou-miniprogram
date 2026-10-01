/**
 * 页面通用包装：自动注入
 *   vars —— 字号三档 CSS 变量
 *   txt  —— 当前方言的整套词条（WXML 里 {{txt.xxx}}）
 *   lang / scale —— 当前方言与字号档
 * 页面无需自己管 watch，onShow 自动同步（在设置面板里改动后立刻生效）
 */
const i18n = require('./i18n.js')
const theme = require('./theme.js')
const Store = require('./store.js')

function sync () {
  const s = Store.getSettings()
  i18n.setLang(s.dialect)
  this.setData({
    vars: theme.vars(s.fontScale),
    txt: i18n.dict[s.dialect],
    lang: s.dialect,
    scale: s.fontScale,
    voiceOn: s.voiceOn !== false
  })
}

/**
 * 用法：
 *   const wrap = require('../../utils/page.js')
 *   wrap({ data: {...}, onTap(){}, ... })
 */
function wrap (pageObj) {
  const origLoad = pageObj.onLoad
  const origShow = pageObj.onShow
  const origUnload = pageObj.onUnload

  const defaults = {}
  ;(function () {
    const s = Store.getSettings()
    i18n.setLang(s.dialect)
    defaults.vars = theme.vars(s.fontScale)
    defaults.txt = i18n.dict[s.dialect]
    defaults.lang = s.dialect
    defaults.scale = s.fontScale
    defaults.voiceOn = s.voiceOn !== false
  })()

  pageObj.data = Object.assign({}, pageObj.data || {}, defaults)
  pageObj.$sync = sync
  pageObj.$t = function (key, params) { return i18n.t(key, params) }

  pageObj.onLoad = function (query) {
    sync.call(this)
    origLoad && origLoad.call(this, query)
  }
  pageObj.onShow = function () {
    sync.call(this)
    origShow && origShow.call(this)
  }
  pageObj.onUnload = function () {
    origUnload && origUnload.call(this)
  }

  if (typeof Page === 'function') Page(pageObj)
  return pageObj
}

module.exports = wrap
