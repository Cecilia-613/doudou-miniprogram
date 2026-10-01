const wrap = require('../../utils/page.js')
const { QUIZ, DIMENSIONS } = require('../../utils/mock.js')

function summary (score, rightCount) {
  if (score >= 90) return '这个礼拜满分眼光！以后看到不对劲的，一眼就认得出来。'
  if (score >= 70) return '已经很好了。再记住底下这几条，就更稳当了。'
  if (score >= 50) return '有一半的题目先生面熟些。慢慢来，多测几次就熟了。'
  return '这次有几道没答上来，不打紧。底下这几条记牢，下次就不慌了。'
}

wrap({
  data: {
    score: 0,
    rightCount: 0,
    summary: '',
    radar: [],
    labels: DIMENSIONS,
    size: 300,
    weak: []
  },

  onLoad (q) {
    const arr = String(q.scores || '')
      .split(',')
      .filter(s => s !== '')
      .map(Number)

    const dimScore = DIMENSIONS.map(() => null)
    QUIZ.forEach((item, i) => {
      const v = arr[i]
      if (v === undefined) return
      dimScore[item.dim] = (dimScore[item.dim] === null) ? v : Math.round((dimScore[item.dim] + v) / 2)
    })
    const radar = dimScore.map(v => (v === null ? 60 : v))

    let right = 0
    arr.forEach(v => { if (v >= 80) right++ })
    const avg = Math.round(radar.reduce((a, b) => a + b, 0) / radar.length)
    const score = Math.round((right * 100 + avg * QUIZ.length) / (QUIZ.length * 2))

    const weak = []
    radar.forEach((v, i) => { if (v < 70) weak.push(DIMENSIONS[i]) })

    this.setData({
      score: score,
      rightCount: right,
      radar: radar,
      summary: summary(score, right),
      weak: weak.slice(0, 2)
    })
  },

  onShareAppMessage () {
    return {
      title: '这一周爸爸/妈妈的防骗测验：' + this.data.score + ' 分',
      path: '/pages/index/index'
    }
  },

  share () {
    wx.showToast({ title: this.data.txt.shareDone, icon: 'none', duration: 1600 })
  },

  backHome () {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  redo () {
    wx.redirectTo({ url: '/pages/quiz/quiz' })
  }
})
