/**
 * 每周一测六维雷达图（canvas 2d）
 * 属性：values [0-100]×6、labels ["防骗觉察力",...]、size 画布边长 px（默认 260）
 */
Component({
  properties: {
    values: { type: Array, value: [60, 60, 60, 60, 60, 60] },
    labels: { type: Array, value: [] },
    size: { type: Number, value: 260 },
    lineColor: { type: String, value: '#E8622A' }
  },
  data: {
    instanceId: 'radar'
  },
  lifetimes: {
    ready () {
      this.draw()
    }
  },
  observers: {
    'values, labels' () {
      this.draw()
    }
  },
  methods: {
    draw () {
      const self = this
      const size = Number(this.data.size) || 260
      wx.createSelectorQuery()
        .in(this)
        .select('#radar')
        .fields({ node: true, size: true })
        .exec(res => {
          const info = res && res[0]
          if (!info || !info.node) return
          const canvas = info.node
          const ctx = canvas.getContext('2d')
          const dpr = (wx.getWindowInfo && wx.getWindowInfo().pixelRatio) || wx.getSystemInfoSync().pixelRatio || 2
          const w = size
          const h = size
          canvas.width = w * dpr
          canvas.height = h * dpr
          ctx.scale(dpr, dpr)
          ctx.clearRect(0, 0, w, h)

          const cx = w / 2
          const cy = h / 2
          const FONT = '13px -apple-system, PingFang SC, Noto Sans SC, sans-serif'
          ctx.font = FONT
          const labelsAll = self.data.labels || []
          const maxW = labelsAll.reduce((m, t) => Math.max(m, ctx.measureText(t || '').width), 0)
          const GAP = 8
          // 半径按「最长标签」算：左右两侧的字一定放得下、不会被画布边缘切掉
          const R = Math.max(40, Math.min((w / 2 - 4 - maxW) / 0.866 - GAP, h / 2 - 22))
          const vals = (self.data.values || []).map(v => Math.max(0, Math.min(100, Number(v) || 0)))
          const labels = self.data.labels || []
          const n = Math.max(vals.length, labels.length) || 6
          const at = (i, r) => {
            const ang = -Math.PI / 2 + i * (2 * Math.PI / n)
            return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]
          }

          // 网格：4 层
          for (let ring = 1; ring <= 4; ring++) {
            ctx.beginPath()
            for (let i = 0; i < n; i++) {
              const p = at(i, R * ring / 4)
              i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])
            }
            ctx.closePath()
            ctx.strokeStyle = '#E5D9C7'
            ctx.lineWidth = 1.5
            ctx.stroke()
          }

          // 轴线 + 标签
          ctx.strokeStyle = '#E5D9C7'
          ctx.lineWidth = 1.5
          for (let i = 0; i < n; i++) {
            const p = at(i, R)
            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.lineTo(p[0], p[1])
            ctx.stroke()

            if (labels[i]) {
              const lp = at(i, R + GAP)
              const ang = -Math.PI / 2 + i * (2 * Math.PI / n)
              const cs = Math.cos(ang)
              const sn = Math.sin(ang)
              ctx.font = FONT
              ctx.fillStyle = '#5C5348'
              // 右侧的字左对齐、左侧的字右对齐、上下居中：标签永远「长」在雷达外面，两侧对称
              ctx.textAlign = cs > 0.3 ? 'left' : (cs < -0.3 ? 'right' : 'center')
              ctx.textBaseline = sn < -0.8 ? 'bottom' : (sn > 0.8 ? 'top' : 'middle')
              ctx.fillText(labels[i], lp[0], lp[1])
            }
          }

          // 数据面
          ctx.beginPath()
          vals.forEach((v, i) => {
            const p = at(i, R * v / 100)
            i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])
          })
          ctx.closePath()
          ctx.fillStyle = 'rgba(232, 98, 42, .22)'
          ctx.fill()
          ctx.strokeStyle = self.data.lineColor
          ctx.lineWidth = 3
          ctx.stroke()

          // 顶点圆
          ctx.fillStyle = self.data.lineColor
          vals.forEach((v, i) => {
            const p = at(i, R * v / 100)
            ctx.beginPath()
            ctx.arc(p[0], p[1], 4, 0, 2 * Math.PI)
            ctx.fill()
          })
        })
    }
  }
})
