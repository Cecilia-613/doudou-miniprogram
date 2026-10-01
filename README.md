# 兜兜 · 适老化反诈小程序（源码）

把整个 `doudou-miniprogram/` 目录用**微信开发者工具**「导入项目」打开即可（见下方「怎么跑」）。
端内的 Node.js 环境版本太低时记得勾选「将 JS 编译成 ES5」。

## 目录

```
app.js / app.json / app.wxss      全局：字体档、方言档、播报开关、色板
utils/
  agent.js     智能体接入层（所有「问兜兜」都从这里走，含降级）
  risk.js      本地研判引擎：14 条规则 + 第四档 ask + 图片兜底
  i18n.js      普通话 / 沪语字典（只换界面文案，播报仍是慢速普通话）
  page.js      页面包装：自动注入 vars / txt / lang / scale / voiceOn
  theme.js     三档字号（标准 / 大 / 超大）
  speech.js    RecorderManager + InnerAudioContext
  store.js     本地存储：设置 / 历史 / 联系人
  mock.js      演示数据：6 维 / 5 题 / 8 句快捷问法 / 3 张样例图
pages/
  index/       首页：按住说话 + 两个大入口 + 最近问过
  capture/     拍照识别：结论先行 + 可疑词框选
  result/      结果卡片：逐句高亮播报 + 现在做三件事
  quiz/        每周一测：一屏一题，答错立刻讲
  report/      成绩单：六维雷达 + 一键告诉囡囡
  history/     最近问过：点一下重听，清空要点两次
  family/      子女端：周报 + 话术包（微信推送卡片进来）
components/
  mic-button/  352rpx 主麦克风（三条波纹 + 音量条 + 60 秒自动停）
  radar/       六维雷达图
```

## 怎么跑

1. 装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（稳定版）
2. 导入项目 → 目录选 `doudou-miniprogram` → AppID 选「测试号」
3. **路径里不要有中文和空格**，建议放 `C:\doudou\`
4. 若模拟器启动失败：详情 → 本地设置 → 关掉「硬件加速」；仍不行就把 `libVersion` 留空（已留空）

三个端怎么进（都在小程序里，设置面板里两个并排的入口）：

- **老人端**：编译模式默认就是 `pages/index/index`
- **子女端**：首页「字」→ 设置面板里「👩 子女周报」；或编译模式自定义启动页 `pages/family/family`
- **社区端**：设置面板里「🧑‍💼 社区工作台」（紧挨着子女端）；或编译模式自定义启动页 `pages/community/community`

> 另有 `community/index.html`（仓库根目录）是给居委投大屏／电脑用的响应式 Web 版，内容一样。

## 顶部按钮为什么要躲着右上角

微信右上角那个「⋯ ⊙」胶囊按钮（更多 / 关闭）是系统画的，位置固定。自定义按钮一旦贴到右上角，老人手抖就容易一把把小程序关掉。

`app.js` 里的 `measureCapsule()` 用 `wx.getMenuButtonBoundingClientRect()` 量出胶囊占了多宽，存进 `globalData.capsuleSafe`（rpx），首页顶部按这个数值留白；「沪语」「字」两个小按钮也挪到了问候语下面一行、靠左对齐，离胶囊越远越好。

协议：任何页面要放右上角控件，都先读 `getApp().globalData.capsuleSafe`。

## 接智能体

默认**零配置可用**：`utils/agent.js` 里 `AGENT_BASE` 留空时全部走本地规则。
要接大模型（识别图片 / 识别语音文字）见仓库根目录的 `接入智能体说明.md`，配套服务端在 `agent-server/`。

## 四个 `important` 的适老化数字（改样式前先看）

| 项 | 值 | 出处 |
| --- | --- | --- |
| 最小可点区域 | 128rpx（64px） | `--tap` |
| 主麦克风按钮 | 352rpx（176px） | `components/mic-button` |
| 基础字号 | 44rpx（22px），最大档 58rpx | `utils/theme.js` |
| 底部操作条高度 | 176rpx 双按钮 | `app.wxss .btn-lg` |

原则：**结论先于理由**、**颜色+图标+文字三重编码**、**不做「确定/取消」弹窗**（只有「再想想」）、**导航层级 ≤ 2**。
