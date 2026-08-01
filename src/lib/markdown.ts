import {
  DEFAULT_ARTICLE_LAYOUT_SETTINGS,
  getThemeRendererContract,
  getThemeRendererId,
  resolveThemeTokens,
  type ArticleLayoutSettings,
  type ArticleTheme,
  type RenderTokens,
  type ThemeRendererId,
} from "@/lib/theme"

export const DEFAULT_MARKDOWN = `# 让内容更好读

## 概览

- 用清晰的层级组织观点 \`01\`
- 用留白和强调建立节奏 \`02\`
- 用一致的细节完成表达 \`03\`

---

## 从结构开始 \`01\`

> 好的排版不抢话。它只是让读者更容易理解你想说什么。

先完成内容，再处理样式。写作时专注观点，发布前再选择符合文章气质的模板。

### 一套简单的工作流

1. 用 Markdown 完成文章
2. 梳理标题与段落层级
3. 选择适合内容的模板
4. 复制到公众号后台

### 图片也参与节奏

![在纸上记录想法](./images/article-samples/writing-notes.webp "横向图片 · 1200 × 720")

![简洁的创作工作台](./images/article-samples/creative-workspace.webp "竖向图片 · 720 × 960")

![书籍与阅读](./images/article-samples/reading-books.webp "方形图片 · 900 × 900")

---

## 让重点自然出现 \`02\`

你可以使用 **粗体强调关键信息**，用 *斜体补充语气*，也可以插入[延伸阅读](https://example.com)。

- 短句适合制造节奏
- 列表适合梳理信息
- 留白适合给观点一点时间

行内代码适合标记 \`关键词\`，~~删除线~~则可以保留修改痕迹。

---

## 用细节完成表达 \`03\`

不同模板有不同气质，但都应该帮助读者看清内容，而不是让装饰盖过观点。

| 模板 | 气质 | 适合内容 |
| --- | --- | --- |
| 留白 | 清晰、克制 | 通用文章 |
| 文墨 | 温和、人文 | 随笔与深度文章 |
| 简报 | 利落、理性 | 科技与知识分享 |
| 岛屿 | 温暖、轻松 | 生活记录与旅行随笔 |
| 橘鸦 | 清爽、醒目 | 简报与资讯 |
| 极客 | 克制、精确 | 技术教程与工程实践 |

\`\`\`js
const content = "好内容";
const layout = "好阅读";
console.log(content + " × " + layout);
\`\`\`

> 现在，替换这些文字，开始你的文章。`

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function safeUrl(value: string) {
  const trimmed = value.trim()
  return /^(https?:\/\/|mailto:|tel:|#|\.\/|\/(?!\/))/i.test(trimmed)
    ? escapeHtml(trimmed)
    : "#"
}

function parseInline(source: string) {
  const tokens: string[] = []
  const stash = (html: string) => {
    const index = tokens.push(html) - 1
    return `\u0000${index}\u0000`
  }

  let value = source.replace(/`([^`\n]+)`/g, (_, code: string) =>
    stash(`<code data-inline="true">${escapeHtml(code)}</code>`),
  )
  value = value.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, alt: string, url: string, title?: string) =>
      stash(
        `<img src="${safeUrl(url)}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ""} />`,
      ),
  )
  value = value.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, label: string, url: string) =>
      stash(`<a href="${safeUrl(url)}">${escapeHtml(label)}</a>`),
  )
  value = escapeHtml(value)
  value = value.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
  value = value.replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
  value = value.replace(/~~([^~\n]+)~~/g, "<del>$1</del>")
  value = value.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
  value = value.replace(/ {2}$/g, "<br />")
  return value.replace(/\u0000(\d+)\u0000/g, (_, index: string) => tokens[Number(index)])
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim())
}

export function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n")
  const output: string[] = []
  let paragraph: string[] = []
  let listType: "ul" | "ol" | null = null
  let listItems: string[] = []
  let inCode = false
  let codeLanguage = ""
  let codeLines: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    output.push(`<p>${parseInline(paragraph.join(" "))}</p>`)
    paragraph = []
  }

  const flushList = () => {
    if (!listType) return
    output.push(
      `<${listType}>${listItems
        .map((item) => `<li>${parseInline(item)}</li>`)
        .join("")}</${listType}>`,
    )
    listType = null
    listItems = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (inCode) {
      if (/^```/.test(line)) {
        output.push(
          `<pre data-language="${escapeHtml(codeLanguage || "text")}"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
        )
        inCode = false
        codeLanguage = ""
        codeLines = []
      } else {
        codeLines.push(line)
      }
      continue
    }

    const codeStart = line.match(/^```\s*([\w-]*)/)
    if (codeStart) {
      flushParagraph()
      flushList()
      inCode = true
      codeLanguage = codeStart[1]
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }

    if (
      line.includes("|") &&
      lines[index + 1] &&
      /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])
    ) {
      flushParagraph()
      flushList()
      const headers = splitTableRow(line)
      index += 2
      const rows: string[][] = []
      while (
        index < lines.length &&
        lines[index].includes("|") &&
        lines[index].trim()
      ) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      index -= 1
      output.push(
        `<table><thead><tr>${headers
          .map((cell) => `<th>${parseInline(cell)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map(
            (row) =>
              `<tr>${headers
                .map(
                  (_, cellIndex) =>
                    `<td>${parseInline(row[cellIndex] || "")}</td>`,
                )
                .join("")}</tr>`,
          )
          .join("")}</tbody></table>`,
      )
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      const level = Math.min(heading[1].length, 4)
      output.push(`<h${level}>${parseInline(heading[2])}</h${level}>`)
      continue
    }

    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      flushParagraph()
      flushList()
      output.push("<hr />")
      continue
    }

    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      flushParagraph()
      flushList()
      const quoteLines = [quote[1]]
      while (index + 1 < lines.length && /^>\s?/.test(lines[index + 1])) {
        index += 1
        quoteLines.push(lines[index].replace(/^>\s?/, ""))
      }
      output.push(
        `<blockquote>${quoteLines.map((quoteLine) => parseInline(quoteLine)).join("<br />")}</blockquote>`,
      )
      continue
    }

    const unordered = line.match(/^\s*[-+*]\s+(.+)$/)
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/)
    if (unordered || ordered) {
      flushParagraph()
      const nextType = unordered ? "ul" : "ol"
      if (listType && listType !== nextType) flushList()
      listType = nextType
      listItems.push((unordered || ordered)![1])
      continue
    }

    paragraph.push(line)
  }

  if (inCode) {
    output.push(
      `<pre data-language="${escapeHtml(codeLanguage || "text")}"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
    )
  }
  flushParagraph()
  flushList()
  return output.join("")
}

export function absolutizeRelativeImageSources(html: string, baseUrl: string) {
  const document = new DOMParser().parseFromString(
    `<html><body>${html}</body></html>`,
    "text/html",
  )

  document.body.querySelectorAll("img[src]").forEach((image) => {
    const source = image.getAttribute("src")
    if (!source || !/^(?:\.\/|\/(?!\/))/.test(source)) return

    image.setAttribute("src", new URL(source, baseUrl).href)
  })

  return document.body.innerHTML
}

export type ArticleStyles = {
  contentInset: number
  root: string
  h1: string
  h2: string
  h3: string
  h4: string
  p: string
  strong: string
  em: string
  del: string
  a: string
  blockquote: string
  ul: string
  ol: string
  li: string
  hr?: string
  pre: string
  inlineCode: string
  inlineLabelCode?: string
  img: string
  table: string
  thead: string
  tbody: string
  tr: string
  th: string
  td: string
}

function buildDefaultStyles(
  theme: ArticleTheme,
  tokens: RenderTokens,
): ArticleStyles {
  const { colors, radius, spacing, typography } = tokens
  const headingBase = [
    "margin:2.2em 0 1em",
    `color:${colors.text}`,
    `font-family:${typography.display}`,
    `font-size:${typography.fontSize + 5}px`,
    "line-height:1.45",
    "font-weight:700",
  ]
  let h2 = ""
  if (theme.headingStyle === "bar") {
    h2 = [
      ...headingBase,
      "padding-left:12px",
      `border-left:3px solid ${colors.accent}`,
    ].join(";")
  } else if (theme.headingStyle === "underline") {
    h2 = [
      ...headingBase,
      "padding-bottom:8px",
      `border-bottom:1px solid ${colors.accent}`,
    ].join(";")
  } else {
    h2 = [
      ...headingBase,
      "display:table",
      "padding:5px 10px",
      `color:${colors.paper}`,
      `background:${colors.accent}`,
      `border-radius:${radius.md}px`,
    ].join(";")
  }

  return {
    contentInset: 0,
    root: `padding:${spacing.lg}px ${spacing.md}px ${spacing.xl}px;color:${colors.text};background:${colors.paper};font-family:${typography.body};font-size:${typography.fontSize}px;line-height:${typography.lineHeight};word-break:break-word`,
    h1: `margin:0 0 0.7em;color:${colors.text};font-family:${typography.display};font-size:${typography.fontSize + 11}px;line-height:1.4;letter-spacing:0.02em;font-weight:700`,
    h2,
    h3: `margin:2em 0 0.8em;color:${colors.accent};font-family:${typography.display};font-size:${typography.fontSize + 2}px;line-height:1.5;font-weight:700`,
    h4: `margin:1.6em 0 0.7em;color:${colors.text};font-size:${typography.fontSize}px;line-height:1.5;font-weight:700`,
    p: `margin:0 0 1.25em;color:${colors.text};font-size:${typography.fontSize}px;line-height:${typography.lineHeight};letter-spacing:0.025em;text-align:justify`,
    strong: `color:${colors.accent};font-weight:700`,
    em: "font-style:italic",
    del: "opacity:0.55",
    a: `color:${colors.accent};text-decoration:none;border-bottom:1px solid ${colors.accent}`,
    blockquote: `margin:1.6em 0;padding:15px 17px;color:${colors.text};background:${colors.surface};border-radius:${radius.md}px;border-left:3px solid ${colors.accent};font-size:${typography.captionSize}px;line-height:${typography.lineHeight}`,
    ul: `margin:0 0 1.4em;padding-left:1.4em;color:${colors.text};list-style-type:disc;list-style-position:outside`,
    ol: `margin:0 0 1.4em;padding-left:1.4em;color:${colors.text};list-style-type:decimal;list-style-position:outside`,
    li: `margin:0.4em 0;padding-left:0.2em;line-height:${typography.lineHeight}`,
    hr: `height:1px;margin:2.4em auto;border:0;background:${colors.accent};opacity:0.25`,
    pre: `margin:1.6em 0;padding:18px;overflow-x:auto;color:${colors.codeForeground};background:${colors.codeBackground};border-radius:${radius.md}px;font-family:${typography.mono};font-size:${typography.codeSize}px;line-height:${typography.codeLineHeight};white-space:pre-wrap;word-break:break-all`,
    inlineCode: `margin:0 3px;padding:2px 5px;color:${colors.accent};background:${colors.surface};border-radius:${radius.xs}px;font-family:${typography.mono};font-size:0.88em`,
    img: `display:block;max-width:100%;height:auto;margin:1.8em auto;border-radius:${radius.md}px`,
    table: `width:100%;margin:1.8em 0;border:0!important;border-top:0!important;border-collapse:collapse;border-spacing:0;outline:0;box-shadow:none!important;background:transparent;color:${colors.text};font-size:${typography.smallSize}px;line-height:${typography.compactLineHeight}`,
    thead: "border:0!important;border-top:0!important;outline:0;box-shadow:none!important;background:transparent",
    tbody: "border:0!important;outline:0;box-shadow:none!important;background:transparent",
    tr: "border:0!important;border-top:0!important;outline:0;box-shadow:none!important;background:transparent",
    th: `padding:9px 8px;border:1px solid ${colors.accent}!important;color:${colors.paper};background:${colors.accent};font-weight:700;text-align:left;box-shadow:none!important`,
    td: `padding:9px 8px;border:1px solid ${colors.borderStrong}!important;color:${colors.text};text-align:left;box-shadow:none!important`,
  }
}

function buildIslandStyles(
  _theme: ArticleTheme,
  tokens: RenderTokens,
): ArticleStyles {
  const { colors, radius, spacing, typography } = tokens
  return {
    contentInset: 0,
    root: `padding:${spacing.md + 10}px ${spacing.md}px ${spacing.xl}px;color:${colors.text};background:${colors.paper};font-family:${typography.body};font-size:${typography.fontSize}px;line-height:${typography.lineHeight};word-break:break-word`,
    h1: `margin:0 0 0.8em;color:${colors.text};font-family:${typography.display};font-size:${typography.fontSize + 12}px;line-height:1.32;letter-spacing:-0.025em;font-weight:900`,
    h2: `margin:2.45em 0 0.85em;color:${colors.text};font-family:${typography.display};font-size:${typography.fontSize + 7}px;line-height:1.35;font-weight:900`,
    h3: `margin:2em 0 0.7em;color:${colors.text};font-family:${typography.display};font-size:${typography.fontSize + 3}px;line-height:1.4;font-weight:800`,
    h4: `margin:1.7em 0 0.7em;color:${colors.text};font-size:${typography.fontSize}px;line-height:1.45;font-weight:800`,
    p: `margin:0 0 1.3em;color:${colors.text};font-size:${typography.fontSize}px;line-height:${typography.lineHeight};letter-spacing:0.025em;text-align:justify`,
    strong: `color:${colors.accent};font-weight:800`,
    em: "font-style:italic",
    del: "opacity:0.55",
    a: `color:${colors.accent};font-weight:700;text-decoration:none;border-bottom:1px solid ${colors.accent}`,
    blockquote: `display:flex!important;align-items:flex-start!important;margin:1.7em 0;padding:22px 22px 22px 40px;color:${colors.text};background:${colors.surface};border:0;border-radius:${radius.md}px ${radius.xl}px ${radius.md + 2}px ${radius.md + 8}px;font-size:${typography.captionSize}px;line-height:${typography.lineHeight}`,
    ul: `margin:0 0 1.4em;padding-left:1.45em;color:${colors.text};list-style-type:disc;list-style-position:outside`,
    ol: `margin:0 0 1.4em;padding-left:1.45em;color:${colors.text};list-style-type:decimal;list-style-position:outside`,
    li: `margin:0.45em 0;padding-left:0.2em;line-height:${typography.lineHeight}`,
    pre: `margin:1.7em 0;padding:20px 24px;overflow-x:auto;color:${colors.codeForeground};background:${colors.codeBackground};border:1px solid ${colors.codeBorder};border-radius:${radius.md + 2}px;font-family:${typography.mono};font-size:${typography.codeSize}px;font-weight:600;line-height:${typography.codeLineHeight};white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;tab-size:4;box-shadow:0 9px 24px ${colors.shadow}`,
    inlineCode: `margin:0 3px;padding:2px 5px;color:${colors.highlightText};background:${colors.highlight};border-radius:${radius.xs}px;font-family:${typography.mono};font-size:0.88em`,
    img: `display:block;max-width:100%;height:auto;margin:2em auto;border:6px solid ${colors.paper};border-radius:${radius.lg}px;box-shadow:0 12px 30px ${colors.shadow}`,
    table: `width:100%;margin:0;border:0!important;border-top:0!important;border-collapse:separate;border-spacing:0;table-layout:fixed;outline:0;box-shadow:none!important;background:${colors.highlight};color:${colors.text};font-size:${typography.smallSize}px;line-height:${typography.compactLineHeight}`,
    thead: `border:0!important;border-top:0!important;outline:0;box-shadow:none!important;background:${colors.highlight}`,
    tbody: `border:0!important;outline:0;box-shadow:none!important;background:${colors.highlight}`,
    tr: "border:0!important;border-top:0!important;outline:0;box-shadow:none!important;background:transparent",
    th: `padding:13px 10px;border:0!important;border-top:0!important;border-bottom:1px dashed ${colors.borderStrong}!important;color:${colors.text};background:transparent;font-weight:800;text-align:left;overflow-wrap:anywhere;box-shadow:none!important`,
    td: `padding:12px 10px;border:0!important;border-bottom:1px dashed ${colors.border}!important;color:${colors.text};background:transparent;font-weight:500;text-align:left;overflow-wrap:anywhere;box-shadow:none!important`,
  }
}

function buildJuyaStyles(
  _theme: ArticleTheme,
  tokens: RenderTokens,
): ArticleStyles {
  const { colors, radius, spacing, typography } = tokens
  const contentInset = Math.max(10, spacing.md)
  return {
    contentInset,
    root: `padding:${spacing.md + 2}px 0 ${spacing.xl}px;color:${colors.text};background:${colors.paper};font-family:${typography.body};font-size:${typography.fontSize}px;line-height:${typography.lineHeight};word-break:break-word;overflow-wrap:break-word;text-align:left`,
    h1: `margin:10px 0 15px;padding:2px 10px;color:${colors.accent};font-family:${typography.display};font-size:${typography.fontSize + 3}px;line-height:1.5;letter-spacing:0.06em;font-weight:700;text-align:center`,
    h2: `margin:30px 8px 15px;padding:7px 15px;color:${colors.text};background:${colors.surface};border:0;border-radius:${Math.max(8, radius.md - 2)}px;font-family:${typography.display};font-size:${typography.fontSize + 1}px;line-height:1.5;letter-spacing:0.06em;font-weight:700;text-align:left;word-break:break-all`,
    h3: `margin:28px ${contentInset}px 12px;color:${colors.accent};font-family:${typography.display};font-size:${typography.fontSize + 1}px;line-height:1.5;letter-spacing:0.04em;font-weight:700`,
    h4: `margin:24px ${contentInset}px 10px;color:${colors.text};font-family:${typography.display};font-size:${typography.fontSize}px;line-height:1.5;font-weight:700`,
    p: `margin:0 ${contentInset}px;padding:5px 0;color:${colors.text};font-size:${typography.fontSize}px;line-height:${typography.lineHeight};letter-spacing:0.06em;text-align:left;text-indent:0`,
    strong: `color:${colors.text};font-weight:700`,
    em: "font-style:italic",
    del: "opacity:0.55",
    a: `color:${colors.accent};text-decoration:none;border-bottom:1px solid ${colors.accent}`,
    blockquote: `margin:20px 10px 10px;padding:9px 12px;color:${colors.text};background:${colors.surfaceRaised};border:0.8px solid ${colors.border};border-radius:${radius.md}px;font-size:${typography.fontSize}px;line-height:${typography.lineHeight};letter-spacing:0.06em;overflow:auto`,
    ul: `margin:8px 15px;padding:0 0 0 18px;color:${colors.text};list-style-type:disc;list-style-position:outside`,
    ol: `margin:8px 15px;padding:0 0 0 18px;color:${colors.text};list-style-type:decimal;list-style-position:outside`,
    li: `margin:5px 0;color:${colors.text};font-size:${typography.captionSize}px;line-height:${typography.lineHeight};letter-spacing:0.06em;text-align:left`,
    hr: `height:0;margin:20px 10px 10px;border:0;border-top:1px dashed ${colors.divider};background:transparent`,
    pre: `margin:16px 10px;padding:12px;overflow-x:auto;color:${colors.codeForeground};background:${colors.codeBackground};border:0.5px solid ${colors.border};border-radius:${radius.md}px;font-family:${typography.mono};font-size:${typography.captionSize}px;line-height:${typography.codeLineHeight};white-space:pre-wrap;word-break:break-all`,
    inlineCode: `margin:0 2px;padding:2px 4px;color:${colors.highlightText};background:${colors.surface};border:0.5px solid ${colors.border};border-radius:${Math.max(6, radius.md - 4)}px;font-family:${typography.mono};font-size:0.9em;line-height:${typography.codeLineHeight};letter-spacing:0;word-break:break-all`,
    inlineLabelCode: `margin:0 2px;padding:2px 4px;color:${colors.accent};background:${colors.surfaceRaised};border:0.5px solid ${colors.border};border-radius:${Math.max(6, radius.md - 6)}px;font-family:${typography.mono};font-size:0.9em;line-height:${typography.codeLineHeight};letter-spacing:0;word-break:break-all`,
    img: `display:block;max-width:calc(100% - 20px);height:auto;margin:30px auto;border:0;border-radius:${radius.md}px;object-fit:fill;overflow:hidden`,
    table: `display:table;width:100%;margin:0;border:0!important;border-collapse:collapse;border-spacing:0;table-layout:fixed;background:${colors.surfaceRaised};color:${colors.text};font-size:${typography.captionSize}px;line-height:1.5;text-align:left`,
    thead: "border:0!important;background:transparent",
    tbody: "border:0!important;background:transparent",
    tr: `border:0!important;background:${colors.surfaceRaised}`,
    th: `min-width:85px;padding:7px 10px;border:0!important;color:${colors.text};background:${colors.surface};font-weight:700;text-align:left;overflow-wrap:break-word;word-break:break-all`,
    td: `min-width:85px;padding:7px 10px;border:0!important;color:${colors.text};background:transparent;text-align:left;overflow-wrap:break-word;word-break:break-all`,
  }
}

function buildGeekStyles(
  _theme: ArticleTheme,
  tokens: RenderTokens,
): ArticleStyles {
  const { colors, radius, spacing, typography } = tokens
  const mono = `font-family:${typography.mono};font-variant-ligatures:none`

  return {
    contentInset: 0,
    root: `padding:${spacing.lg}px ${spacing.md}px ${spacing.xl}px;color:${colors.text};background:${colors.paper};font-family:${typography.body};font-size:${typography.fontSize}px;line-height:${typography.lineHeight};word-break:break-word;overflow-wrap:anywhere`,
    h1: `margin:0 0 32px;padding:0;color:${colors.text};background:transparent;border:0;border-radius:0;box-shadow:none;font-family:${typography.display};font-size:${typography.fontSize + 19}px;line-height:1.2;letter-spacing:-0.02em;font-weight:400`,
    h2: `margin:48px 0 16px;padding:0;color:${colors.text};border:0;font-family:${typography.display};font-size:${typography.fontSize + 6}px;line-height:1.3;letter-spacing:-0.005em;font-weight:400`,
    h3: `margin:36px 0 14px;color:${colors.text};font-family:${typography.display};font-size:${typography.fontSize + 2}px;line-height:1.4;letter-spacing:-0.003em;font-weight:600`,
    h4: `margin:30px 0 12px;color:${colors.text};font-size:${typography.fontSize}px;line-height:1.45;font-weight:650`,
    p: `margin:0 0 16px;color:${colors.text};font-size:${typography.fontSize}px;line-height:${typography.lineHeight};letter-spacing:0.005em;text-align:left`,
    strong: `color:${colors.text};font-weight:700`,
    em: "font-style:italic",
    del: "opacity:0.52",
    a: `color:${colors.text};font-weight:400;text-decoration-line:underline;text-decoration-color:${colors.divider};text-decoration-thickness:auto;text-underline-offset:auto;border:0`,
    blockquote: `margin:24px 0;padding:12px 16px;color:${colors.text};background:${colors.surface};border:1px solid ${colors.borderSoft};border-radius:${radius.md}px;font-size:${typography.captionSize}px;line-height:20px`,
    ul: `margin:24px 0;padding-left:1.42em;color:${colors.text};list-style-type:square;list-style-position:outside`,
    ol: `margin:0 0 16px;padding-left:1.42em;color:${colors.text};list-style-type:decimal;list-style-position:outside`,
    li: `margin:0 0 8px;padding-left:4px;color:${colors.text};font-size:${typography.fontSize}px;line-height:1.5`,
    pre: `margin:0;padding:20px;overflow-x:auto;color:${colors.codeForeground};background:${colors.codeBackground};border:0;border-radius:0 0 ${radius.md}px ${radius.md}px;${mono};font-size:${typography.codeSize}px;line-height:${typography.codeLineHeight};white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;tab-size:4`,
    inlineCode: `margin:0;padding:4px;color:${colors.text};background:${colors.surfaceMuted};border:1px solid ${colors.borderSoft};border-radius:${radius.xs}px;${mono};font-size:${typography.codeSize}px;line-height:16px;letter-spacing:0.005em`,
    img: `display:block;max-width:100%;height:auto;margin:28px auto;border:1px solid ${colors.borderSoft};border-radius:${radius.md}px`,
    table: `width:max-content;min-width:100%;max-width:none;margin:0;border:0!important;border-collapse:collapse;border-spacing:0;table-layout:auto;background:${colors.paper};color:${colors.text}`,
    thead: `border:0!important;border-bottom:1px solid ${colors.borderSoft}!important;background:transparent`,
    tbody: `border:0!important;background:${colors.paper}`,
    tr: "border:0!important;background:transparent",
    th: `padding:12px 16px;border:0!important;color:${colors.text};background-color:${colors.surface}!important;font-size:${typography.codeSize}px;font-weight:400;line-height:1.34;text-align:left;white-space:nowrap;word-break:keep-all`,
    td: `padding:12px 16px;border:0!important;color:${colors.text};background-color:${colors.paper}!important;font-size:${typography.fontSize}px;line-height:1.4;text-align:left;white-space:nowrap;word-break:keep-all`,
  }
}

type CodeToken = {
  start: number
  end: number
  color: string
  priority: number
  fontWeight?: number
  fontStyle?: "italic"
}

type CodePattern = {
  pattern: RegExp
  color: string
  fontWeight?: number
  fontStyle?: "italic"
}

const DEFAULT_CODE_PATTERNS: readonly CodePattern[] = [
  {
    pattern: /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    color: "#89939d",
    fontStyle: "italic",
  },
  {
    pattern: /`(?:\\[\s\S]|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    color: "#a8cc8c",
  },
  {
    pattern:
      /\b(?:import|from|as|export|default|const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|throw|finally|new|typeof|instanceof|async|await|type|interface|class|extends|def|lambda|yield|in|is|and|or|not|with|match|fn|mut|pub|use|impl|struct|enum|package|func|defer|go|select)\b/g,
    color: "#c7a0e8",
    fontWeight: 700,
  },
  {
    pattern: /\b(?:true|false|null|undefined|void|None|True|False|NaN|Infinity)\b/g,
    color: "#d4a6c8",
  },
  { pattern: /\b[A-Z][A-Za-z0-9_]*\b/g, color: "#82c7d9" },
  {
    pattern: /\b[a-zA-Z_$][\w$]*(?=\s*\()/g,
    color: "#74b8e6",
    fontWeight: 650,
  },
  { pattern: /\b[a-zA-Z_$][\w$]*(?=\s*=)/g, color: "#e7c77c" },
  { pattern: /\b(?:0x[\da-f]+|\d+(?:\.\d+)?)\b/gi, color: "#d4a6c8" },
  {
    pattern: /=>|===|!==|==|!=|>=|<=|&&|\|\||\?\?|[+\-*/%=<>!?:]/g,
    color: "#bbc3cc",
  },
]

const ISLAND_CODE_PATTERNS: readonly CodePattern[] = [
  { pattern: /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, color: "#6b5e50" },
  {
    pattern: /`(?:\\[\s\S]|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    color: "#a8d4a0",
  },
  {
    pattern:
      /\b(?:import|from|as|export|default|const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|throw|finally|new|typeof|instanceof|async|await|type|interface|class|extends)\b/g,
    color: "#d4a0e0",
  },
  {
    pattern: /\b(?:true|false|null|undefined|void|NaN|Infinity)\b/g,
    color: "#d4a0e0",
  },
  { pattern: /\b(?:React|useState|useEffect|useMemo|useRef)\b/g, color: "#e06c75" },
  { pattern: /<\/?[A-Z][\w.]*/g, color: "#80c0e0" },
  { pattern: /<\/?[a-z][\w-]*/g, color: "#f0a870" },
  { pattern: /\b[A-Z][A-Za-z0-9_]*\b/g, color: "#80c0e0" },
  { pattern: /\b[a-zA-Z_$][\w$]*(?=\s*\()/g, color: "#61afef" },
  { pattern: /\b[a-zA-Z_$][\w$]*(?=\s*=)/g, color: "#e8c87a" },
  { pattern: /\b(?:0x[\da-f]+|\d+(?:\.\d+)?)\b/gi, color: "#a8d4a0" },
  { pattern: /=>|===|!==|==|!=|>=|<=|&&|\|\||\?\?|[+\-*/%=<>!?:]/g, color: "#d4b896" },
]

const JUYA_CODE_PATTERNS: readonly CodePattern[] = [
  {
    pattern: /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    color: "#8d8b84",
    fontStyle: "italic",
  },
  {
    pattern: /`(?:\\[\s\S]|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    color: "#4f7a52",
  },
  {
    pattern:
      /\b(?:import|from|as|export|default|const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|throw|finally|new|typeof|instanceof|async|await|type|interface|class|extends|def|lambda|yield|in|is|and|or|not|with|match|fn|mut|pub|use|impl|struct|enum|package|func|defer|go|select)\b/g,
    color: "#9a4f78",
    fontWeight: 700,
  },
  {
    pattern: /\b(?:true|false|null|undefined|void|None|True|False|NaN|Infinity)\b/g,
    color: "#a35d3d",
  },
  { pattern: /\b[A-Z][A-Za-z0-9_]*\b/g, color: "#376f8a" },
  {
    pattern: /\b[a-zA-Z_$][\w$]*(?=\s*\()/g,
    color: "#315f8c",
    fontWeight: 650,
  },
  { pattern: /\b[a-zA-Z_$][\w$]*(?=\s*=)/g, color: "#9b6b35" },
  { pattern: /\b(?:0x[\da-f]+|\d+(?:\.\d+)?)\b/gi, color: "#9a5f3f" },
  {
    pattern: /=>|===|!==|==|!=|>=|<=|&&|\|\||\?\?|[+\-*/%=<>!?:]/g,
    color: "#6e6b64",
  },
]

const GEEK_CODE_PATTERNS: readonly CodePattern[] = [
  {
    pattern: /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    color: "#93a298",
    fontStyle: "italic",
  },
  {
    pattern: /`(?:\\[\s\S]|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    color: "#e0bd78",
  },
  {
    pattern:
      /\b(?:import|from|as|export|default|const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|throw|finally|new|typeof|instanceof|async|await|type|interface|class|extends|def|lambda|yield|in|is|and|or|not|with|match|fn|mut|pub|use|impl|struct|enum|package|func|defer|go|select|then|fi|do|done|local)\b/g,
    color: "#e8896b",
    fontWeight: 700,
  },
  {
    pattern: /\b(?:true|false|null|undefined|void|None|True|False|NaN|Infinity)\b/g,
    color: "#d5a185",
  },
  {
    pattern: /\$\{?[\w@#?$!*-]+\}?/g,
    color: "#a7c7b6",
    fontWeight: 650,
  },
  {
    pattern: /\b[A-Z][A-Za-z0-9_]*\b/g,
    color: "#9fc2b5",
  },
  {
    pattern: /\b[a-zA-Z_$][\w$]*(?=\s*\()/g,
    color: "#d7e3dc",
    fontWeight: 650,
  },
  {
    pattern: /(^|\s)--?[\w-]+/gm,
    color: "#d8bd84",
  },
  {
    pattern: /\b(?:0x[\da-f]+|\d+(?:\.\d+)?)\b/gi,
    color: "#aacac0",
  },
  {
    pattern: /=>|===|!==|==|!=|>=|<=|&&|\|\||\?\?|[+\-*/%=<>!?:]/g,
    color: "#c1b6a4",
  },
]

const GEEK_HASH_COMMENT_PATTERN: CodePattern = {
  pattern: /^\s*#[^\n]*/gm,
  color: "#93a298",
  fontStyle: "italic",
}

const GEEK_HASH_COMMENT_LANGUAGES = new Set([
  "bash",
  "conf",
  "dockerfile",
  "fish",
  "ini",
  "py",
  "python",
  "sh",
  "shell",
  "toml",
  "yaml",
  "yml",
  "zsh",
])

function highlightCode(
  code: Element,
  doc: Document,
  patterns: readonly CodePattern[],
) {
  const source = code.textContent || ""
  const tokens: CodeToken[] = []

  patterns.forEach(
    ({ pattern, color, fontWeight, fontStyle }, priority) => {
      pattern.lastIndex = 0
      for (const match of source.matchAll(pattern)) {
        const start = match.index
        if (start === undefined || !match[0]) continue
        tokens.push({
          start,
          end: start + match[0].length,
          color,
          priority,
          fontWeight,
          fontStyle,
        })
      }
    },
  )

  tokens.sort((left, right) => left.start - right.start || left.priority - right.priority)

  const fragment = doc.createDocumentFragment()
  let cursor = 0
  tokens.forEach((token) => {
    if (token.start < cursor) return
    if (token.start > cursor) {
      fragment.append(doc.createTextNode(source.slice(cursor, token.start)))
    }
    const span = doc.createElement("span")
    span.textContent = source.slice(token.start, token.end)
    const style = [`color:${token.color}`]
    if (token.fontWeight) style.push(`font-weight:${token.fontWeight}`)
    if (token.fontStyle) style.push(`font-style:${token.fontStyle}`)
    span.setAttribute("style", style.join(";"))
    fragment.append(span)
    cursor = token.end
  })
  if (cursor < source.length) {
    fragment.append(doc.createTextNode(source.slice(cursor)))
  }

  code.replaceChildren(fragment)
  code.setAttribute(
    "style",
    "margin:0;padding:0;color:inherit;background:transparent;border:0;font:inherit;line-height:inherit;white-space:inherit",
  )
}

function highlightIslandCode(code: Element, doc: Document, _language: string) {
  highlightCode(code, doc, ISLAND_CODE_PATTERNS)
}

function highlightDefaultCode(code: Element, doc: Document, _language: string) {
  highlightCode(code, doc, DEFAULT_CODE_PATTERNS)
}

function highlightJuyaCode(code: Element, doc: Document, _language: string) {
  highlightCode(code, doc, JUYA_CODE_PATTERNS)
}

function highlightGeekCode(code: Element, doc: Document, language: string) {
  const patterns = GEEK_HASH_COMMENT_LANGUAGES.has(language.toLowerCase())
    ? [GEEK_HASH_COMMENT_PATTERN, ...GEEK_CODE_PATTERNS]
    : GEEK_CODE_PATTERNS
  highlightCode(code, doc, patterns)
}

function preserveCodeWhitespace(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const lines = (node.textContent || "").split("\n")
    const fragment = node.ownerDocument?.createDocumentFragment()
    if (!fragment) return

    lines.forEach((line, index) => {
      if (index > 0) fragment.append(node.ownerDocument!.createElement("br"))
      fragment.append(
        node.ownerDocument!.createTextNode(
          line
            .replaceAll("\t", "\u00a0\u00a0\u00a0\u00a0")
            .replaceAll(" ", "\u00a0"),
        ),
      )
    })
    node.parentNode?.replaceChild(fragment, node)
    return
  }
  Array.from(node.childNodes).forEach(preserveCodeWhitespace)
}

type RendererContext = {
  doc: Document
  root: HTMLElement
  styles: ArticleStyles
  tokens: RenderTokens
}

type RendererDefinition = {
  buildStyles: (theme: ArticleTheme, tokens: RenderTokens) => ArticleStyles
  decorate: (context: RendererContext) => void
  inlineCodeStyle?: (node: Element, styles: ArticleStyles) => string
  prepareCode?: (code: Element, doc: Document, language: string) => void
}

function replaceRulesWithDivider(
  root: HTMLElement,
  doc: Document,
  style: string,
) {
  root.querySelectorAll("hr").forEach((rule) => {
    const divider = doc.createElement("section")
    divider.textContent = "\u00a0"
    divider.setAttribute("style", style)
    divider.setAttribute("aria-hidden", "true")
    rule.replaceWith(divider)
  })
}

function decorateDefaultDocument({ doc, root, tokens }: RendererContext) {
  replaceRulesWithDivider(
    root,
    doc,
    `height:0;margin:2.4em auto;border:0;border-top:1px solid ${tokens.colors.accent};font-size:0;line-height:0;opacity:0.25;overflow:hidden`,
  )
}

function decorateIslandDocument({
  doc,
  root,
  styles,
  tokens,
}: RendererContext) {
  const { colors, radius } = tokens

  root.querySelectorAll("table").forEach((table) => {
    const wrapper = doc.createElement("section")
    wrapper.setAttribute(
      "style",
      `margin:1.8em 0;padding:5px;overflow:hidden;background:${colors.highlight};border-radius:${radius.md + 2}px;box-sizing:border-box`,
    )
    table.before(wrapper)
    wrapper.append(table)

    const bodyRows = Array.from(table.querySelectorAll("tbody tr"))
    bodyRows.forEach((row, rowIndex) => {
      row.setAttribute(
        "style",
        rowIndex % 2 === 1
          ? `border:0!important;border-top:0!important;outline:0;box-shadow:none!important;background:${colors.paper}`
          : styles.tr,
      )
    })

    const lastRow = bodyRows.at(-1)
    const lastRowBackground =
      bodyRows.length % 2 === 0 ? colors.paper : colors.highlight
    lastRow?.querySelectorAll("td").forEach((cell, cellIndex, cells) => {
      const bottomRadius =
        cellIndex === 0
          ? `border-bottom-left-radius:${radius.md}px`
          : cellIndex === cells.length - 1
            ? `border-bottom-right-radius:${radius.md}px`
            : ""
      cell.setAttribute(
        "style",
        `${styles.td};border-bottom:0!important;background:${lastRowBackground};${bottomRadius}`,
      )
    })
  })

  root.querySelectorAll("h2").forEach((heading) => {
    const leaf = doc.createElement("span")
    leaf.textContent = "\u00a0"
    leaf.setAttribute(
      "style",
      `display:inline-block;width:0.62em;height:0.43em;margin-right:0.38em;border-radius:100% 0 100% 0;background:${colors.accent};color:transparent;line-height:0;overflow:hidden;transform:rotate(-20deg);vertical-align:0.08em`,
    )
    leaf.setAttribute("aria-hidden", "true")
    heading.prepend(leaf)
  })

  root.querySelectorAll("blockquote").forEach((quote) => {
    const mark = doc.createElement("span")
    const content = doc.createElement("span")
    mark.textContent = "“"
    mark.setAttribute(
      "style",
      `display:block!important;flex:0 0 30px!important;color:${colors.accent};font-family:Georgia,serif;font-size:40px;font-weight:700;line-height:1`,
    )
    mark.setAttribute("aria-hidden", "true")
    content.setAttribute(
      "style",
      "display:block!important;flex:1 1 0!important;min-width:0!important",
    )
    content.append(...Array.from(quote.childNodes))
    quote.replaceChildren(mark, content)
  })

  root.querySelectorAll("hr").forEach((rule) => {
    const dots = doc.createElement("section")
    dots.setAttribute(
      "style",
      "margin:2.7em auto;text-align:center;line-height:1",
    )
    dots.setAttribute("aria-hidden", "true")
    for (let index = 0; index < 5; index += 1) {
      const dot = doc.createElement("span")
      dot.textContent = "\u00a0"
      dot.setAttribute(
        "style",
        `display:inline-block;width:7px;height:7px;margin:0 8px;background:${colors.secondary};border-radius:50%;font-size:0;line-height:0`,
      )
      dots.append(dot)
    }
    rule.replaceWith(dots)
  })
}

function decorateJuyaDocument({
  doc,
  root,
  styles,
  tokens,
}: RendererContext) {
  const { colors, radius } = tokens

  root.querySelectorAll("table").forEach((table) => {
    const wrapper = doc.createElement("section")
    wrapper.setAttribute(
      "style",
      `margin:10px 15px;overflow:hidden;background:${colors.surfaceRaised};border:1px solid ${colors.border};border-radius:${radius.md}px`,
    )
    table.before(wrapper)
    wrapper.append(table)

    table.querySelectorAll("tbody tr").forEach((row, rowIndex) => {
      row.setAttribute(
        "style",
        rowIndex % 2 === 1
          ? `border:0!important;background:${colors.tableStripe}`
          : styles.tr,
      )
    })
  })

  root.querySelectorAll("li").forEach((item) => {
    const firstNode = item.firstChild
    if (
      firstNode?.nodeType !== Node.ELEMENT_NODE ||
      (firstNode as Element).tagName !== "CODE"
    ) {
      return
    }

    item.setAttribute(
      "style",
      `${styles.li};margin-left:-18px;padding-left:0;list-style-type:none`,
    )
    const row = doc.createElement("section")
    row.setAttribute(
      "style",
      "display:flex;align-items:baseline;margin:0;padding:0",
    )
    const label = doc.createElement("span")
    label.setAttribute(
      "style",
      "display:inline-block;flex:0 0 auto;margin:0;line-height:inherit",
    )
    const content = doc.createElement("span")
    content.setAttribute(
      "style",
      "display:block;flex:1 1 auto;margin-left:2px;word-break:break-word;overflow-wrap:break-word;font-size:inherit;line-height:inherit",
    )

    label.append(firstNode)
    while (item.firstChild) content.append(item.firstChild)
    row.append(label, content)
    item.append(row)
  })

  replaceRulesWithDivider(
    root,
    doc,
    `height:0;margin:20px 10px 10px;border:0;border-top:1px dashed ${colors.divider};font-size:0;line-height:0;overflow:hidden`,
  )
}

function decorateGeekDocument({
  doc,
  root,
  styles,
  tokens,
}: RendererContext) {
  const { colors, radius, typography } = tokens

  root.querySelectorAll("pre").forEach((pre) => {
    const language = pre.getAttribute("data-language") || "text"
    const wrapper = doc.createElement("section")
    wrapper.setAttribute(
      "style",
      `margin:24px 0;overflow:hidden;background:${colors.codeBackground};border:1px solid ${colors.codeBorder};border-radius:${radius.md}px;box-shadow:0 10px 24px ${colors.shadowStrong}`,
    )

    const toolbar = doc.createElement("section")
    toolbar.setAttribute(
      "style",
      `display:flex;align-items:center;min-height:34px;padding:0 12px;color:${colors.codeForeground};background:${colors.codeBorder};border-bottom:1px solid ${colors.codeBorder};font-family:${typography.mono};font-size:${typography.smallSize - 1}px;line-height:1.4`,
    )
    const controls = doc.createElement("span")
    controls.setAttribute(
      "style",
      "display:inline-flex;align-items:center;gap:6px;line-height:0",
    )
    const controlColors = ["#ff5f57", "#febc2e", "#28c840"]
    controlColors.forEach((color) => {
      const control = doc.createElement("span")
      control.textContent = "\u00a0"
      control.setAttribute(
        "style",
        `display:inline-block;width:8px;height:8px;background:${color};border-radius:50%;font-size:0;line-height:0`,
      )
      controls.append(control)
    })
    controls.setAttribute("aria-hidden", "true")
    toolbar.append(controls)

    if (language !== "text") {
      const label = doc.createElement("span")
      label.textContent = language.toUpperCase()
      label.setAttribute(
        "style",
        "margin-left:auto;text-align:right;letter-spacing:0.1em;opacity:0.66",
      )
      toolbar.append(label)
    }

    pre.before(wrapper)
    wrapper.append(toolbar, pre)
  })

  root.querySelectorAll("table").forEach((table) => {
    const wrapper = doc.createElement("section")
    wrapper.setAttribute(
      "style",
      `margin:24px 0;overflow-x:auto;overflow-y:hidden;background:transparent;border:1px solid ${colors.borderSoft};border-radius:${radius.xs}px`,
    )
    table.before(wrapper)
    wrapper.append(table)

    const rows = Array.from(table.querySelectorAll("tbody tr"))
    rows.forEach((row, rowIndex) => {
      row.setAttribute(
        "style",
        rowIndex < rows.length - 1
          ? `border:0!important;border-bottom:1px solid ${colors.borderSoft}!important;background:transparent`
          : styles.tr,
      )
    })
  })

  replaceRulesWithDivider(
    root,
    doc,
    `height:0;margin:40px 0;border:0;border-top:1px solid ${colors.borderSoft};font-size:0;line-height:0;overflow:hidden`,
  )
}

const RENDERER_DEFINITIONS: Record<ThemeRendererId, RendererDefinition> = {
  default: {
    buildStyles: buildDefaultStyles,
    decorate: decorateDefaultDocument,
    prepareCode: highlightDefaultCode,
  },
  "island-log": {
    buildStyles: buildIslandStyles,
    decorate: decorateIslandDocument,
    prepareCode: highlightIslandCode,
  },
  "juya-daily": {
    buildStyles: buildJuyaStyles,
    decorate: decorateJuyaDocument,
    prepareCode: highlightJuyaCode,
    inlineCodeStyle: (node, styles) =>
      node.closest("h1,h2,h3,h4,li") && styles.inlineLabelCode
        ? styles.inlineLabelCode
        : styles.inlineCode,
  },
  "geek-manual": {
    buildStyles: buildGeekStyles,
    decorate: decorateGeekDocument,
    prepareCode: highlightGeekCode,
  },
}

const PARAGRAPH_GAPS: Record<
  ArticleLayoutSettings["paragraphSpacing"],
  string
> = {
  compact: "0",
  standard: "1.25em",
  relaxed: "1.9em",
}

function appendInlineStyle(element: Element, style: string) {
  const current = element.getAttribute("style") || ""
  element.setAttribute("style", current ? `${current};${style}` : style)
}

function standaloneImages(element: Element) {
  if (element.tagName === "IMG") return [element]
  if (element.tagName !== "P") return []

  const images = Array.from(element.children).filter(
    (child) => child.tagName === "IMG",
  )
  if (images.length === 0) return []

  const containsOtherContent = Array.from(element.childNodes).some((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return Boolean(node.textContent?.trim())
    }
    return node.nodeType !== Node.ELEMENT_NODE ||
      (node as Element).tagName !== "IMG"
  })
  return containsOtherContent ? [] : images
}

function groupScrollableImages(
  root: HTMLElement,
  doc: Document,
  tokens: RenderTokens,
  contentInset: number,
  preserveImageShadow: boolean,
) {
  const shadowInlineInset = preserveImageShadow ? 16 : 0
  const shadowBlockStartInset = preserveImageShadow ? 16 : 0
  const shadowBlockEndInset = preserveImageShadow ? 36 : 0
  let candidates: { container: Element; images: Element[] }[] = []
  const galleryFrames = new Map<
    Element,
    { frame: HTMLElement; media: HTMLElement }
  >()

  const flush = () => {
    const images = candidates.flatMap((candidate) => candidate.images)
    if (images.length < 2) {
      candidates = []
      return
    }

    const group = doc.createElement("section")
    group.setAttribute(
      "style",
      `margin:1.8em ${contentInset}px`,
    )

    const hint = doc.createElement("section")
    hint.setAttribute(
      "style",
      `display:flex;align-items:center;justify-content:space-between;margin:0 0 9px;color:${tokens.colors.text};font-family:${tokens.typography.body};font-size:${tokens.typography.codeSize}px;line-height:1.4;letter-spacing:0.02em;opacity:0.58`,
    )
    const hintText = doc.createElement("span")
    hintText.textContent = `左右滑动查看 · 共 ${images.length} 张`
    const arrow = doc.createElement("span")
    arrow.textContent = "→"
    arrow.setAttribute(
      "style",
      "display:inline-block;margin-left:12px;font-size:1.15em;line-height:1",
    )
    hint.append(hintText, arrow)

    const scroller = doc.createElement("section")
    scroller.setAttribute("aria-label", "图片画廊")
    scroller.setAttribute(
      "style",
      `display:flex;align-items:stretch;margin:0;padding:${shadowBlockStartInset}px 0 ${shadowBlockEndInset}px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;font-size:0;line-height:0`,
    )
    candidates[0].container.before(group)
    group.append(hint, scroller)
    images.forEach((image, index) => {
      const isFirst = index === 0
      const isLast = index === images.length - 1
      const marginLeft = isFirst ? shadowInlineInset : 0
      const marginRight = isLast ? shadowInlineInset : 12
      const frame = doc.createElement("section")
      frame.setAttribute(
        "style",
        `display:flex;flex:0 0 86%;max-width:86%;min-width:0;flex-direction:column;margin:0 ${marginRight}px 0 ${marginLeft}px;vertical-align:top;box-sizing:border-box;white-space:normal`,
      )
      const media = doc.createElement("section")
      media.setAttribute(
        "style",
        "display:flex;flex:1 1 auto;align-items:center;justify-content:center;min-height:0;margin:0;padding:0",
      )
      appendInlineStyle(
        image,
        "display:block;width:100%;max-width:100%;height:auto;margin:0;vertical-align:middle;box-sizing:border-box;white-space:normal",
      )
      media.append(image)
      frame.append(media)
      scroller.append(frame)
      galleryFrames.set(image, { frame, media })
    })
    candidates.forEach(({ container }) => {
      if (container.tagName !== "IMG") container.remove()
    })
    candidates = []
  }

  Array.from(root.children).forEach((element) => {
    const images = standaloneImages(element)
    if (images.length === 0) {
      flush()
      return
    }
    candidates.push({ container: element, images })
  })
  flush()
  return galleryFrames
}

function getImageCaption(image: Element) {
  return (
    image.getAttribute("title")?.trim() || image.getAttribute("alt")?.trim() || ""
  )
}

function applyImageCaptions(
  images: Set<Element>,
  galleryFrames: Map<
    Element,
    { frame: HTMLElement; media: HTMLElement }
  >,
  doc: Document,
  settings: ArticleLayoutSettings,
  tokens: RenderTokens,
) {
  if (!settings.showImageCaptions) return

  const captionStyle = [
    "display:block",
    "margin:0",
    "padding:0",
    `color:${tokens.colors.text}`,
    "opacity:0.62",
    `font-size:${settings.imageCaptionSize}px`,
    "font-weight:400",
    "font-style:normal",
    "line-height:1.65",
    "letter-spacing:0.02em",
    `text-align:${settings.imageCaptionAlign}`,
    "text-indent:0",
    "white-space:normal",
    "word-break:break-word",
  ].join(";")

  images.forEach((image) => {
    const captionText = getImageCaption(image)
    if (!captionText) return

    const caption = doc.createElement("span")
    caption.textContent = captionText
    caption.setAttribute("style", captionStyle)

    const galleryFrame = galleryFrames.get(image)
    if (galleryFrame) {
      appendInlineStyle(caption, "flex:0 0 auto;margin-top:8px")
      galleryFrame.frame.append(caption)
      return
    }

    appendInlineStyle(image, "margin-bottom:8px")
    image.after(caption)
  })
}

function applyArticleLayoutSettings(
  root: HTMLElement,
  doc: Document,
  settings: ArticleLayoutSettings,
  tokens: RenderTokens,
  contentInset: number,
  preserveImageShadow: boolean,
) {
  const captionableImages = new Set(
    Array.from(root.children).flatMap(standaloneImages),
  )
  root.querySelectorAll("p").forEach((paragraph) => {
    appendInlineStyle(
      paragraph,
      [
        `text-align:${settings.paragraphAlign}`,
        `text-indent:${settings.firstLineIndent ? "2em" : "0"}`,
        `margin-bottom:${PARAGRAPH_GAPS[settings.paragraphSpacing]}`,
      ].join(";"),
    )
  })

  root.querySelectorAll("pre").forEach((pre) => {
    const code = pre.querySelector("code")
    if (settings.codeOverflow === "scroll") {
      appendInlineStyle(
        pre,
        "overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;white-space:nowrap!important;overflow-wrap:normal!important;word-break:keep-all!important",
      )
      if (code) {
        appendInlineStyle(
          code,
          "display:block;width:max-content;min-width:100%;white-space:nowrap!important;overflow-wrap:normal!important;word-break:keep-all!important",
        )
      }
      return
    }

    appendInlineStyle(
      pre,
      "overflow-x:hidden;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal",
    )
  })

  root.querySelectorAll("table").forEach((table) => {
    const tableParent = table.parentElement
    let container = tableParent
    let createdScrollContainer = false
    if (settings.tableOverflow === "scroll" && tableParent === root) {
      container = doc.createElement("section")
      container.setAttribute("style", "margin:1.8em 0")
      table.before(container)
      container.append(table)
      createdScrollContainer = true
    }

    if (settings.tableOverflow === "scroll") {
      if (container) {
        appendInlineStyle(
          container,
          "overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch",
        )
      }
      appendInlineStyle(
        table,
        `${createdScrollContainer ? "margin:0;" : ""}width:max-content;min-width:100%;max-width:none;table-layout:auto`,
      )
      table.querySelectorAll("th,td").forEach((cell) => {
        appendInlineStyle(
          cell,
          "white-space:nowrap;word-break:keep-all;overflow-wrap:normal",
        )
      })
      return
    }

    if (container && container !== root) {
      appendInlineStyle(container, "overflow-x:hidden")
    }
    appendInlineStyle(
      table,
      "width:100%;min-width:0;max-width:100%;table-layout:fixed",
    )
    table.querySelectorAll("th,td").forEach((cell) => {
      appendInlineStyle(
        cell,
        "white-space:normal;word-break:break-word;overflow-wrap:anywhere",
      )
    })
  })

  root.querySelectorAll("img").forEach((image) => {
    appendInlineStyle(
      image,
      settings.imageWidth === "full"
        ? "width:100%;max-width:100%;box-sizing:border-box"
        : "width:auto",
    )
  })
  const galleryFrames =
    settings.imageLayout === "scroll"
      ? groupScrollableImages(
          root,
          doc,
          tokens,
          contentInset,
          preserveImageShadow,
        )
      : new Map<Element, { frame: HTMLElement; media: HTMLElement }>()
  applyImageCaptions(
    captionableImages,
    galleryFrames,
    doc,
    settings,
    tokens,
  )
}

export function getArticleStyles(theme: ArticleTheme) {
  const tokens = resolveThemeTokens(theme)
  return RENDERER_DEFINITIONS[getThemeRendererId(theme)].buildStyles(
    theme,
    tokens,
  )
}

export function inlineDocument(
  html: string,
  theme: ArticleTheme,
  settings: ArticleLayoutSettings = DEFAULT_ARTICLE_LAYOUT_SETTINGS,
) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<section>${html}</section>`, "text/html")
  const root = doc.querySelector("section")!
  const tokens = resolveThemeTokens(theme)
  const renderer = RENDERER_DEFINITIONS[getThemeRendererId(theme)]
  const styles = renderer.buildStyles(theme, tokens)
  root.setAttribute("style", styles.root)

  const selectors: Record<string, string> = {
    h1: styles.h1,
    h2: styles.h2,
    h3: styles.h3,
    h4: styles.h4,
    p: styles.p,
    strong: styles.strong,
    em: styles.em,
    del: styles.del,
    a: styles.a,
    blockquote: styles.blockquote,
    ul: styles.ul,
    ol: styles.ol,
    li: styles.li,
    pre: styles.pre,
    img: styles.img,
    table: styles.table,
    thead: styles.thead,
    tbody: styles.tbody,
    tr: styles.tr,
    th: styles.th,
    td: styles.td,
  }
  if (styles.hr) selectors.hr = styles.hr

  Object.entries(selectors).forEach(([selector, style]) => {
    root
      .querySelectorAll(selector)
      .forEach((node) => node.setAttribute("style", style))
  })
  // 微信公众号会在正文外展示文章标题。二级标题作为正文首项时，
  // 不需要沿用章节之间的顶部留白，根容器自身的 padding 已足够。
  if (root.firstElementChild?.tagName === "H2") {
    const firstHeading = root.firstElementChild
    firstHeading.setAttribute(
      "style",
      `${firstHeading.getAttribute("style")};margin-top:0`,
    )
  }
  root.querySelectorAll('code[data-inline="true"]').forEach((node) => {
    node.setAttribute(
      "style",
      renderer.inlineCodeStyle?.(node, styles) || styles.inlineCode,
    )
    node.removeAttribute("data-inline")
  })
  root.querySelectorAll("pre").forEach((node) => {
    const code = node.querySelector("code")
    if (code) {
      renderer.prepareCode?.(
        code,
        doc,
        node.getAttribute("data-language") || "text",
      )
      preserveCodeWhitespace(code)
    }
  })
  root.querySelectorAll("a").forEach((node) => {
    node.setAttribute("target", "_blank")
  })

  renderer.decorate({ doc, root, styles, tokens })
  applyArticleLayoutSettings(
    root,
    doc,
    settings,
    tokens,
    styles.contentInset,
    getThemeRendererContract(theme).output.image.shadow,
  )
  root
    .querySelectorAll("pre")
    .forEach((node) => node.removeAttribute("data-language"))
  return root.outerHTML
}
