const wrap = require('../../utils/page.js')
const { QUIZ, DIMENSIONS } = require('../../utils/mock.js')

wrap({
  data: {
    idx: 0,
    q: null,
    total: QUIZ.length,
    picked: -1,
    showExplain: false,
    correct: false,
    scores: []   // 每题对错
  },

  onLoad () {
    this.setData({ q: QUIZ[0], total: QUIZ.length })
  },

  onOption (e) {
    if (this.data.showExplain) return
    const i = Number(e.currentTarget.dataset.i)
    const q = this.data.q
    const ok = !!q.options[i].correct
    wx.vibrateShort && wx.vibrateShort({ type: 'medium' })
    const scores = this.data.scores.slice()
    scores[this.data.idx] = ok ? 100 : 30
    this.setData({ picked: i, showExplain: true, correct: ok, scores: scores })
  },

  next () {
    const nextIdx = this.data.idx + 1
    if (nextIdx >= QUIZ.length) {
      const s = encodeURIComponent(this.data.scores.join(','))
      wx.redirectTo({ url: '/pages/report/report?scores=' + s })
      return
    }
    this.setData({
      idx: nextIdx,
      q: QUIZ[nextIdx],
      picked: -1,
      showExplain: false,
      correct: false
    })
  },

  quit () {
    wx.navigateBack()
  }
})
