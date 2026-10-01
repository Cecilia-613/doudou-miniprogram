/**
 * 主题：字号三档 + rpx 换算
 * 设计稿 375px => 750rpx，1px = 2rpx
 * 基础 Body 20px? 规范基准 Body 22px -> 44rpx（挑剔点：任何正文不低于 36rpx / 18px）
 */

const SCALES = {
  std: 1,       // 标准
  large: 1.15,  // 大
  xl: 1.32      // 超大
}

// 以 750rpx 为基准的字号（单位 rpx），会被 style 变量覆盖
const BASE = {
  '--fs-h1': 64,     // 32px 结论横幅
  '--fs-h2': 52,     // 26px 卡片标题
  '--fs-title': 48,  // 24px
  '--fs-body': 44,   // 22px 正文
  '--fs-cap': 36,    // 18px 辅助（不得更小）
  '--fs-micro': 32,  // 16px 仅用于机构水纹等装饰，非阅读内容
  '--ic-s': 48,      // 图标（emoji）小：列表行
  '--ic-m': 60,      // 图标 中：按钮 / 卡片
  '--ic-l': 72       // 图标 大：入口卡 / 横幅
}

/** 生成可写入 style 的 CSS 变量字符串 */
function vars (scaleKey) {
  const k = SCALES[scaleKey] || 1
  return Object.keys(BASE)
    .map(name => `${name}:${Math.round(BASE[name] * k)}rpx`)
    .join(';')
}

/** 返回给 WXML 使用的对象形式 */
function varObj (scaleKey) {
  const k = SCALES[scaleKey] || 1
  const o = {}
  Object.keys(BASE).forEach(name => {
    o[name] = Math.round(BASE[name] * k) + 'rpx'
  })
  return o
}

const LABEL = { std: '标准', large: '大', xl: '超大' }

module.exports = { vars, varObj, SCALES, LABEL, BASE }
