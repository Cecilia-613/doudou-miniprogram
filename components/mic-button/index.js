/**
 * 主语音按钮：直径 176px（352rpx）
 * 按住即录（零学习成本）、三层扩散波纹、实时音量条、60s 自动结束
 * 事件：recorded / recording-start / recording-end / error
 */
const speech = require('../../utils/speech.js')
const i18n = require('../../utils/i18n.js')

Component({
  properties: {
    disabled: { type: Boolean, value: false },
    label: { type: String, value: i18n.t('holdToTalk') },
    pressedTip: { type: String, value: i18n.t('listening') }
  },
  data: {
    pressed: false,
    volume: 0,
    seconds: 0,
    ticking: false
  },
  lifetimes: {
    detached () {
      this._clearTimer && this._clearTimer()
      speech.stopRecord()
    }
  },
  methods: {
    onTouchStart () {
      if (this.data.disabled || this.data.pressed) return
      this.setData({ pressed: true, volume: 0, seconds: 0 })
      this.triggerEvent('recordingstart')

      const started = speech.startRecord({
        onVolume: v => this.setData({ volume: v }),
        onStop: (path, duration) => {
          this._clearTimer()
          this.setData({ pressed: false, volume: 0, ticking: false })
          this.triggerEvent('recorded', { path: path, duration: duration })
        },
        onError: msg => {
          this._clearTimer()
          this.setData({ pressed: false, volume: 0, ticking: false })
          this.triggerEvent('error', { msg: msg })
        }
      })

      if (!started) {
        this.setData({ pressed: false })
        this.triggerEvent('error', { msg: '麦克风没打开' })
        return
      }

      let s = 0
      this._clearTimer = () => {
        if (this._timer) clearInterval(this._timer)
        this._timer = null
      }
      this._timer = setInterval(() => {
        s++
        if (s >= 60) {
          speech.stopRecord()
        } else {
          this.setData({ seconds: s })
        }
      }, 1000)
    },

    onTouchEnd () {
      if (!this.data.pressed) return
      speech.stopRecord()
      // 立即给出"我在处理"的反馈，避免老人以为没反应
      this.setData({ ticking: true })
    },

    onTouchCancel () {
      if (!this.data.pressed) return
      speech.stopRecord()
      this.setData({ pressed: false, volume: 0, ticking: false })
      this.triggerEvent('cancel')
    }
  }
})
