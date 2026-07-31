# 项目开发约定

## 前端技术栈

- 使用 React、TypeScript 和 Vite。
- UI 组件基于 shadcn/ui。
- 动画组件和动画图标优先使用 Animate UI。
- 实现自定义动画前，先检查 Animate UI 是否已有对应的 Component 或 Primitive。
- 静态图标使用 Lucide；需要动画时优先查找 Animate UI Icons。
- Animate UI 采用源码分发模式，添加到项目后的组件可以按设计需求修改。
- 项目已在 `components.json` 中配置 `@animate-ui` registry。

## 参考文档

- Animate UI：https://animate-ui.com/docs
- Animate UI Icons：https://animate-ui.com/docs/icons
- Animate UI Icons 使用指南：https://animate-ui.com/docs/icons/get-started

开发时应以官方最新文档和组件 API 为准，尤其注意 Animate UI Icons 仍可能发生 API 变化。
