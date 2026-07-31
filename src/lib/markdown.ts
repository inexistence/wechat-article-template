import {
  getThemeRendererId,
  resolveThemeTokens,
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
| 极客 | 精确、硬朗 | 技术教程与工程实践 |

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
  return /^(https?:\/\/|mailto:|tel:|#)/i.test(trimmed)
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
    (_, alt: string, url: string) =>
      stash(`<img src="${safeUrl(url)}" alt="${escapeHtml(alt)}" />`),
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

export type ArticleStyles = {
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
    blockquote: `margin:1.7em 0;padding:22px 22px 22px 50px;position:relative;color:${colors.text};background:${colors.surface};border:0;border-radius:${radius.md}px ${radius.xl}px ${radius.md + 2}px ${radius.md + 8}px;font-size:${typography.captionSize}px;line-height:${typography.lineHeight}`,
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
  const contentMargin = Math.max(10, spacing.md)
  return {
    root: `padding:${spacing.md + 2}px 0 ${spacing.xl}px;color:${colors.text};background:${colors.paper};font-family:${typography.body};font-size:${typography.fontSize}px;line-height:${typography.lineHeight};word-break:break-word;overflow-wrap:break-word;text-align:left`,
    h1: `margin:10px 0 15px;padding:2px 10px;color:${colors.accent};font-family:${typography.display};font-size:${typography.fontSize + 3}px;line-height:1.5;letter-spacing:0.06em;font-weight:700;text-align:center`,
    h2: `margin:30px 8px 15px;padding:7px 15px;color:${colors.text};background:${colors.surface};border:0;border-radius:${Math.max(8, radius.md - 2)}px;font-family:${typography.display};font-size:${typography.fontSize + 1}px;line-height:1.5;letter-spacing:0.06em;font-weight:700;text-align:left;word-break:break-all`,
    h3: `margin:28px ${contentMargin}px 12px;color:${colors.accent};font-family:${typography.display};font-size:${typography.fontSize + 1}px;line-height:1.5;letter-spacing:0.04em;font-weight:700`,
    h4: `margin:24px ${contentMargin}px 10px;color:${colors.text};font-family:${typography.display};font-size:${typography.fontSize}px;line-height:1.5;font-weight:700`,
    p: `margin:0 ${contentMargin}px;padding:5px 0;color:${colors.text};font-size:${typography.fontSize}px;line-height:${typography.lineHeight};letter-spacing:0.06em;text-align:left;text-indent:0`,
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
  const monoLabel = `font-family:${typography.mono};font-variant-ligatures:none`

  return {
    root: `padding:${spacing.lg}px ${spacing.md}px ${spacing.xl}px;color:${colors.text};background:${colors.paper};font-family:${typography.body};font-size:${typography.fontSize}px;line-height:${typography.lineHeight};word-break:break-word;overflow-wrap:anywhere`,
    h1: `margin:0 0 1em;padding:0 0 0.75em;color:${colors.text};border-bottom:3px solid ${colors.text};font-family:${typography.display};font-size:${typography.fontSize + 12}px;line-height:1.28;letter-spacing:-0.025em;font-weight:850`,
    h2: `margin:2.4em 0 0.9em;padding:0 0 9px;color:${colors.text};border-bottom:1px solid ${colors.borderStrong};font-family:${typography.display};font-size:${typography.fontSize + 5}px;line-height:1.4;letter-spacing:-0.015em;font-weight:800`,
    h3: `margin:2em 0 0.75em;color:${colors.text};font-family:${typography.display};font-size:${typography.fontSize + 2}px;line-height:1.5;font-weight:750`,
    h4: `margin:1.7em 0 0.7em;color:${colors.text};font-size:${typography.fontSize}px;line-height:1.5;font-weight:750`,
    p: `margin:0 0 1.25em;color:${colors.text};font-size:${typography.fontSize}px;line-height:${typography.lineHeight};letter-spacing:0.015em;text-align:left`,
    strong: `padding:0 2px;color:${colors.highlightText};background:${colors.highlight};font-weight:800`,
    em: `color:${colors.highlightText};font-style:italic`,
    del: "opacity:0.52",
    a: `color:${colors.accent};font-weight:650;text-decoration:none;border-bottom:1px solid ${colors.accent}`,
    blockquote: `margin:1.65em 0;padding:18px 18px 17px;color:${colors.text};background:${colors.surface};border:1px solid ${colors.border};border-radius:${radius.md}px;font-size:${typography.captionSize}px;line-height:${typography.lineHeight}`,
    ul: `margin:0 0 1.4em;padding-left:1.35em;color:${colors.text};list-style-type:square;list-style-position:outside`,
    ol: `margin:0 0 1.4em;padding-left:1.55em;color:${colors.text};list-style-type:decimal-leading-zero;list-style-position:outside`,
    li: `margin:0.45em 0;padding-left:0.25em;color:${colors.text};line-height:${typography.lineHeight}`,
    hr: `height:1px;margin:2.5em auto;border:0;background:${colors.borderStrong}`,
    pre: `margin:0;padding:18px 19px 20px;overflow-x:auto;color:${colors.codeForeground};background:${colors.codeBackground};border:0;border-radius:0 0 ${radius.md}px ${radius.md}px;font-family:${typography.mono};font-size:${typography.codeSize}px;line-height:${typography.codeLineHeight};font-variant-ligatures:none;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;tab-size:4`,
    inlineCode: `margin:0 2px;padding:2px 5px;color:${colors.highlightText};background:${colors.highlight};border:1px solid ${colors.border};border-radius:${radius.xs}px;${monoLabel};font-size:0.86em;line-height:1.5`,
    inlineLabelCode: `margin:0 3px;padding:2px 5px;color:${colors.accent};background:${colors.surface};border:1px solid ${colors.border};border-radius:${radius.xs}px;${monoLabel};font-size:0.78em;line-height:1.5;letter-spacing:0.04em;vertical-align:0.12em`,
    img: `display:block;max-width:100%;height:auto;margin:2em auto;border:1px solid ${colors.border};border-radius:${radius.md}px;box-shadow:5px 5px 0 ${colors.highlight}`,
    table: `width:100%;margin:0;border:0!important;border-collapse:collapse;border-spacing:0;table-layout:fixed;background:${colors.surfaceRaised};color:${colors.text};font-size:${typography.smallSize}px;line-height:${typography.compactLineHeight}`,
    thead: `border:0!important;background:${colors.text}`,
    tbody: `border:0!important;background:${colors.surfaceRaised}`,
    tr: "border:0!important;background:transparent",
    th: `padding:10px 9px;border:0!important;border-right:1px solid ${colors.codeBorder}!important;color:${colors.paper};background:${colors.text};${monoLabel};font-weight:700;text-align:left;overflow-wrap:anywhere`,
    td: `padding:10px 9px;border:0!important;border-bottom:1px solid ${colors.border}!important;color:${colors.text};background:transparent;text-align:left;overflow-wrap:anywhere`,
  }
}

type IslandCodeToken = {
  start: number
  end: number
  color: string
  priority: number
}

const ISLAND_CODE_PATTERNS = [
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
] as const

function highlightIslandCode(code: Element, doc: Document) {
  const source = code.textContent || ""
  const tokens: IslandCodeToken[] = []

  ISLAND_CODE_PATTERNS.forEach(({ pattern, color }, priority) => {
    pattern.lastIndex = 0
    for (const match of source.matchAll(pattern)) {
      const start = match.index
      if (start === undefined || !match[0]) continue
      tokens.push({
        start,
        end: start + match[0].length,
        color,
        priority,
      })
    }
  })

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
    span.setAttribute("style", `color:${token.color}`)
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

function preserveCodeWhitespace(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    node.textContent = (node.textContent || "")
      .replaceAll("\t", "\u00a0\u00a0\u00a0\u00a0")
      .replaceAll(" ", "\u00a0")
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
  prepareCode?: (code: Element, doc: Document) => void
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
    wrapper.setAttribute("data-island-table", "true")
    table.before(wrapper)
    wrapper.append(table)

    table.querySelectorAll("tbody tr").forEach((row, rowIndex) => {
      row.setAttribute(
        "style",
        rowIndex % 2 === 1
          ? `border:0!important;border-top:0!important;outline:0;box-shadow:none!important;background:${colors.paper}`
          : styles.tr,
      )
    })

    table.querySelectorAll("tbody tr:last-child td").forEach((cell) => {
      cell.setAttribute("style", `${styles.td};border-bottom:0!important`)
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
    mark.textContent = "“"
    mark.setAttribute(
      "style",
      `position:absolute;top:17px;left:19px;color:${colors.accent};font-family:Georgia,serif;font-size:40px;font-weight:700;line-height:1`,
    )
    mark.setAttribute("aria-hidden", "true")
    quote.prepend(mark)
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
    wrapper.setAttribute("data-juya-table", "true")
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

  root.querySelectorAll("h2").forEach((heading, index) => {
    const number = doc.createElement("span")
    number.textContent = String(index + 1).padStart(2, "0")
    number.setAttribute(
      "style",
      `display:inline-block;min-width:2.1em;margin-right:0.65em;padding:3px 5px;color:${colors.paper};background:${colors.accent};border-radius:${radius.xs}px;font-family:${typography.mono};font-size:${typography.captionSize}px;font-weight:800;line-height:1.2;letter-spacing:0;text-align:center;vertical-align:0.16em`,
    )
    number.setAttribute("aria-hidden", "true")
    heading.prepend(number)
  })

  root.querySelectorAll("h3").forEach((heading) => {
    const comment = doc.createElement("span")
    comment.textContent = "//"
    comment.setAttribute(
      "style",
      `margin-right:0.5em;color:${colors.accent};font-family:${typography.mono};font-weight:800`,
    )
    comment.setAttribute("aria-hidden", "true")
    heading.prepend(comment)
  })

  root.querySelectorAll("blockquote").forEach((quote) => {
    const label = doc.createElement("span")
    label.textContent = "NOTE"
    label.setAttribute(
      "style",
      `display:table;margin:0 0 8px;padding:2px 6px;color:${colors.paper};background:${colors.accent};border-radius:${radius.xs}px;font-family:${typography.mono};font-size:${typography.smallSize - 1}px;font-weight:800;line-height:1.4;letter-spacing:0.08em`,
    )
    quote.prepend(label)
  })

  root.querySelectorAll("pre").forEach((pre) => {
    const language = pre.getAttribute("data-language") || "text"
    const wrapper = doc.createElement("section")
    wrapper.setAttribute(
      "style",
      `margin:1.7em 0;overflow:hidden;background:${colors.codeBackground};border:1px solid ${colors.codeBorder};border-radius:${radius.md}px;box-shadow:5px 5px 0 ${colors.highlight}`,
    )
    wrapper.setAttribute("data-geek-code", "true")

    const toolbar = doc.createElement("section")
    toolbar.setAttribute(
      "style",
      `display:flex;align-items:center;justify-content:space-between;padding:8px 12px;color:${colors.codeForeground};background:${colors.text};border-bottom:1px solid ${colors.codeBorder};font-family:${typography.mono};font-size:${typography.smallSize - 1}px;line-height:1.4;letter-spacing:0.08em`,
    )
    const dots = doc.createElement("span")
    dots.textContent = "●  ●  ●"
    dots.setAttribute(
      "style",
      `color:${colors.secondary};font-size:8px;letter-spacing:0`,
    )
    dots.setAttribute("aria-hidden", "true")
    const label = doc.createElement("span")
    label.textContent = language.toUpperCase()
    label.setAttribute("style", "opacity:0.72")
    toolbar.append(dots, label)

    pre.before(wrapper)
    wrapper.append(toolbar, pre)
  })

  root.querySelectorAll("table").forEach((table) => {
    const wrapper = doc.createElement("section")
    wrapper.setAttribute(
      "style",
      `margin:1.8em 0;overflow:hidden;background:${colors.surfaceRaised};border:1px solid ${colors.borderStrong};border-radius:${radius.md}px;box-shadow:4px 4px 0 ${colors.highlight}`,
    )
    wrapper.setAttribute("data-geek-table", "true")
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

  root.querySelectorAll("hr").forEach((rule) => {
    const divider = doc.createElement("section")
    divider.textContent = "</>"
    divider.setAttribute(
      "style",
      `margin:2.5em auto;color:${colors.accent};font-family:${typography.mono};font-size:${typography.smallSize}px;font-weight:800;line-height:1;text-align:center;letter-spacing:0.2em`,
    )
    divider.setAttribute("aria-hidden", "true")
    rule.replaceWith(divider)
  })
}

const RENDERER_DEFINITIONS: Record<ThemeRendererId, RendererDefinition> = {
  default: {
    buildStyles: buildDefaultStyles,
    decorate: decorateDefaultDocument,
  },
  "island-log": {
    buildStyles: buildIslandStyles,
    decorate: decorateIslandDocument,
    prepareCode: highlightIslandCode,
  },
  "juya-daily": {
    buildStyles: buildJuyaStyles,
    decorate: decorateJuyaDocument,
    inlineCodeStyle: (node, styles) =>
      node.closest("h1,h2,h3,h4,li") && styles.inlineLabelCode
        ? styles.inlineLabelCode
        : styles.inlineCode,
  },
  "geek-manual": {
    buildStyles: buildGeekStyles,
    decorate: decorateGeekDocument,
    inlineCodeStyle: (node, styles) =>
      node.closest("h1,h2,h3,h4") && styles.inlineLabelCode
        ? styles.inlineLabelCode
        : styles.inlineCode,
  },
}

export function getArticleStyles(theme: ArticleTheme) {
  const tokens = resolveThemeTokens(theme)
  return RENDERER_DEFINITIONS[getThemeRendererId(theme)].buildStyles(
    theme,
    tokens,
  )
}

export function inlineDocument(html: string, theme: ArticleTheme) {
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
      renderer.prepareCode?.(code, doc)
      preserveCodeWhitespace(code)
    }
  })
  root.querySelectorAll("a").forEach((node) => {
    node.setAttribute("target", "_blank")
  })

  renderer.decorate({ doc, root, styles, tokens })
  root
    .querySelectorAll("pre")
    .forEach((node) => node.removeAttribute("data-language"))
  return root.outerHTML
}
