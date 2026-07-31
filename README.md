# 排版间

[在线体验](https://inexistence.github.io/wechat-article-template/)

把 Markdown 文章实时套用为适合微信公众号的内联样式富文本。界面基于 React、shadcn/ui 与 Animate UI 构建。

## 环境要求

- Node.js 20.19+ 或 22.12+
- npm

## 本地开发

```bash
npm ci
npm run dev
```

打开终端显示的本地地址。

## 构建与预览

```bash
npm run build
npm run preview
```

生产构建会输出到 `dist/`。

## 主要功能

- Markdown 实时预览
- 六套内置公众号模板：留白、文墨、简报、岛屿、橘鸦和极客
- 自定义颜色、字号、行距、留白、圆角和标题造型
- 草稿与个人模板本地保存
- 一键复制带内联 CSS 的富文本
- HTML 查看与 Markdown 下载
- 桌面端和手机端响应式工作区

## 新增模板

模板能力、共享渲染变量和特殊渲染器分别集中管理，新增模板时按以下顺序扩展：

1. 在 `src/lib/theme.ts` 注册渲染器类型和契约：逐项声明颜色、字体、字号、行高、留白、圆角与标题造型的可配置程度，并声明表格容器与背景、代码块结构与高亮、图片阴影等最终输出行为。
2. 复用 `resolveThemeTokens` 生成的语义颜色、字体、尺寸和间距变量；不要在特殊渲染器中重复写入可配置值。
3. 在 `src/lib/markdown.ts` 添加样式构建器和必要的结构装饰器，并注册到 `RENDERER_DEFINITIONS`。
4. 如需专用缩略图造型，在 `src/index.css` 中新增以渲染器名称命名的变量覆盖。
5. 运行 `npm run verify:themes`。校验器会确认每个契约字段都有测试样例，验证配置是否按契约影响样式，并检查最终复制 HTML 的表格、代码块、图片结构与粘贴安全样式。

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。

“橘鸦”模板参考并重新实现自 MIT 开源项目
[MurphyLo/md2juya](https://github.com/MurphyLo/md2juya) 的 Juya AI 日报版式。
