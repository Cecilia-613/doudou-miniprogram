const wrap = require('../../utils/page.js')
const Store = require('../../utils/store.js')

const LV = {
  danger: { icon: '⚠️', cls: 'lv-danger', tag: '骗子' },
  warn: { icon: '❓', cls: 'lv-warn', tag: '要小心' },
  safe: { icon: '✅', cls: 'lv-safe', tag: '没问题' },
  ask: { icon: '💬', cls: 'lv-ask', tag: '已找人确认' }
}

function fmt (ts) {
  const d = new Date(ts)
  const p = n => String(n).padStart(2, '0')
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

wrap({
  data: {
    list: [],
    emptying: false
  },

  onShow () {
    const list = Store.getHistory().map(item => {
      const meta = LV[item.level] || LV.warn
      return Object.assign({}, item, {
        icon: meta.icon,
        cls: meta.cls,
        tag: meta.tag,
        at: fmt(item.time)
      })
    })
    this.setData({ list: list, emptying: false })
  },

  onTap (e) {
    const item = this.data.list[Number(e.currentTarget.dataset.i)]
    if (!item) return
    wx.navigateTo({
      url: '/pages/result/result?resultId=last&text=' + encodeURIComponent(item.text)
    })
    // 结果页会重新研判同一句话：接通了大模型后就是重新问一遍同一个问题
  },

  empty () {
    if (!this.data.emptying) {
      this.setData({ emptying: true })
      return
    }
    Store.clearHistory()
    this.setData({ list: [], emptying: false })
  },

  cancelEmpty () {
    this.setData({ emptying: false })
  }
})
