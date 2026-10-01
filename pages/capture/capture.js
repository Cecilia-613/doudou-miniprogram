const wrap = require('../../utils/page.js')
const agent = require('../../utils/agent.js')
const risk = require('../../utils/risk.js')
const { PHOTO_SAMPLES } = require('../../utils/mock.js')

// 图上可疑词的框选位置（百分比）：真实场景应由 OCR/视觉模型返回坐标
const BOXES = [
  [8, 20, 62, 10],
  [18, 34, 54, 10],
  [34, 48, 52, 10],
  [8, 62, 48, 10],
  [12, 74, 56, 10],
  [30, 86, 46, 10]
]

wrap({
  data: {
    photo: '',
    result: null,
    words: [],
    scanning: false,
    from: 'camera',      // camera | album | sample
    sampleIdx: -1,
    samples: PHOTO_SAMPLES,
    // 有没有接后端智能体：决定了「谁在看这张图」这句话怎么写
    agentOn: !!agent.AGENT_BASE
  },

  onLoad (q) {
    if (q.demo !== undefined) {
      this.useSample(Number(q.demo) || 0)
    }
  },

  takePhoto () {
    const ctx = wx.createCameraContext()
    this.setData({ from: 'camera' })
    ctx.takePhoto({
      quality: 'high',
      success: res => this.setPhotoAndAnalyze(res.tempImagePath, ''),
      fail: () => wx.showToast({ title: this.data.txt.netErr, icon: 'none' })
    })
  },

  chooseAlbum () {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: res => {
        const f = res.tempFiles && res.tempFiles[0]
        if (!f) return
        this.setData({ from: 'album' })
        this.setPhotoAndAnalyze(f.tempFilePath, '')
      }
    })
  },

  /** 演示样例：没有真图时也能走完这条链路（用本地规则判同一段文字） */
  useSample (i) {
    const s = PHOTO_SAMPLES[i]
    this.setData({ sampleIdx: i, from: 'sample', scanning: true })
    const r = risk.analyze(s.text)
    getApp().globalData.lastResult = r
    setTimeout(() => {
      this.setData({
        scanning: false,
        result: r,
        words: (s.words || []).slice(0, 6).map((w, k) => ({ word: w, box: BOXES[k] || BOXES[0] }))
      })
    }, 1400)
  },

  onSample (e) {
    this.useSample(Number(e.currentTarget.dataset.i) || 0)
  },

  /** 真图：先压到模型可接受的大小，再交给智能体 */
  setPhotoAndAnalyze (path, fallbackText) {
    this.setData({ photo: path, scanning: true })
    const self = this
    wx.compressImage({
      src: path,
      quality: 70,
      width: 1280,
      success: c => self.runAgent(c.tempFilePath, fallbackText),
      fail: () => self.runAgent(path, fallbackText)
    })
  },

  runAgent (filePath, fallbackText) {
    const self = this
    agent.analyzeImage(filePath, fallbackText).then(r => {
      getApp().globalData.lastResult = r
      self.setData({
        scanning: false,
        result: r,
        words: (r.words || []).slice(0, 6).map((w, i) => ({ word: w, box: BOXES[i] || BOXES[0] }))
      })
    })
  },

  seeResult () {
    wx.navigateTo({ url: '/pages/result/result?resultId=last&from=photo' })
  },

  retake () {
    this.setData({ photo: '', result: null, words: [], sampleIdx: -1 })
  },

  back () {
    wx.navigateBack()
  }
})
