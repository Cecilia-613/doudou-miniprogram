const wrap = require('../../utils/page.js')
const { WEEKLY, DIMENSIONS } = require('../../utils/mock.js')

const LV_COLOR = { danger: '#D93025', warn: '#E8A317', safe: '#1E8E3E', ask: '#7A6247' }
const LV_TEXT = { danger: '高危', warn: '可疑', safe: '安全', ask: '待确认' }

wrap({
  data: {
    w: WEEKLY,
    labels: DIMENSIONS,
    size: 290,
    dist: [],
    events: [],
    copied: false
  },

  onLoad () {
    const total = WEEKLY.total || 1
    const dist = ['danger', 'warn', 'safe'].map(k => ({
      key: k,
      text: LV_TEXT[k],
      color: LV_COLOR[k],
      n: WEEKLY.dist[k],
      pct: Math.round(WEEKLY.dist[k] * 100 / total)
    }))
    const events = WEEKLY.events.map(e => Object.assign({}, e, {
      color: LV_COLOR[e.level],
      tag: LV_TEXT[e.level]
    }))
    this.setData({ dist: dist, events: events })
  }
})
