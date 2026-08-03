export type HeadingStyle = "bar" | "underline" | "label"
export type FontFamily = "sans" | "serif" | "rounded"
export type ThemeRenderer = "island-log" | "juya-daily" | "geek-manual"
export type ThemeRendererId = "default" | ThemeRenderer
export type ContentOverflow = "wrap" | "scroll"
export type ParagraphAlign = "left" | "justify"
export type ParagraphSpacing = "compact" | "standard" | "relaxed"
export type ImageWidth = "natural" | "full"
export type ImageLayout = "stack" | "scroll"
export type ImageCaptionAlign = "left" | "center"

export type ArticleLayoutSettings = {
  tableOverflow: ContentOverflow
  codeOverflow: ContentOverflow
  paragraphAlign: ParagraphAlign
  firstLineIndent: boolean
  paragraphSpacing: ParagraphSpacing
  imageLayout: ImageLayout
  imageWidth: ImageWidth
  showImageCaptions: boolean
  imageCaptionAlign: ImageCaptionAlign
  imageCaptionSize: number
}

export const DEFAULT_ARTICLE_LAYOUT_SETTINGS: ArticleLayoutSettings = {
  tableOverflow: "wrap",
  codeOverflow: "scroll",
  paragraphAlign: "justify",
  firstLineIndent: false,
  paragraphSpacing: "standard",
  imageLayout: "scroll",
  imageWidth: "natural",
  showImageCaptions: true,
  imageCaptionAlign: "center",
  imageCaptionSize: 12,
}

export type ArticleTheme = {
  id: string
  name: string
  description: string
  accent: string
  text: string
  paper: string
  quote: string
  code: string
  fontSize: number
  lineHeight: number
  spacing: number
  radius: number
  headingStyle: HeadingStyle
  fontFamily: FontFamily
  secondary?: string
  renderer?: ThemeRenderer
}

export const THEME_CONTROLS = [
  "accent",
  "text",
  "paper",
  "fontSize",
  "lineHeight",
  "spacing",
  "radius",
  "headingStyle",
  "fontFamily",
] as const

export type ThemeControl = (typeof THEME_CONTROLS)[number]
export type ThemeCapabilityLevel = "full" | "partial" | "fixed"

export type ThemeCapability = {
  level: ThemeCapabilityLevel
  description?: string
}

export type ThemeOutputContract = {
  table: {
    frame: boolean
    backgrounds: "header" | "container" | "cells"
  }
  codeBlock: {
    frame: "plain" | "terminal"
    syntaxHighlighting: boolean
    languageLabel: boolean
    shadow: boolean
  }
  image: {
    shadow: boolean
  }
}

export type ThemeRendererContract = {
  id: ThemeRendererId
  name: string
  structureNote?: string
  typographyProfile: "system" | "editorial"
  capabilities: Record<ThemeControl, ThemeCapability>
  output: ThemeOutputContract
}

const full = (): ThemeCapability => ({ level: "full" })
const partial = (description: string): ThemeCapability => ({
  level: "partial",
  description,
})
const fixed = (description: string): ThemeCapability => ({
  level: "fixed",
  description,
})

const DEFAULT_CAPABILITIES: Record<ThemeControl, ThemeCapability> = {
  accent: full(),
  text: full(),
  paper: full(),
  fontSize: full(),
  lineHeight: full(),
  spacing: full(),
  radius: full(),
  headingStyle: full(),
  fontFamily: full(),
}

export const THEME_RENDERER_CONTRACTS = {
  default: {
    id: "default",
    name: "标准文章",
    typographyProfile: "system",
    capabilities: DEFAULT_CAPABILITIES,
    output: {
      table: {
        frame: false,
        backgrounds: "header",
      },
      codeBlock: {
        frame: "plain",
        syntaxHighlighting: true,
        languageLabel: false,
        shadow: false,
      },
      image: {
        shadow: false,
      },
    },
  },
  "island-log": {
    id: "island-log",
    name: "岛屿手记",
    typographyProfile: "system",
    structureNote:
      "叶片标题、手写引用和点状分隔是固定结构。内容留白主要控制画布边距，圆角主要作用于引用、图片和内容容器。",
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      spacing: partial("控制画布边距，模板内部节奏保持固定。"),
      radius: partial("作用于引用、图片和内容容器。"),
      headingStyle: fixed("叶片标题是模板固定结构。"),
    },
    output: {
      table: {
        frame: true,
        backgrounds: "container",
      },
      codeBlock: {
        frame: "plain",
        syntaxHighlighting: true,
        languageLabel: false,
        shadow: true,
      },
      image: {
        shadow: true,
      },
    },
  },
  "juya-daily": {
    id: "juya-daily",
    name: "橘鸦日报",
    typographyProfile: "editorial",
    structureNote:
      "米色圆角标题、标签式编号和虚线分隔是固定结构。内容留白控制画布与正文边距，其他阅读参数会应用到对应内容组件。",
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      spacing: partial("控制画布与正文边距，章节节奏保持固定。"),
      headingStyle: fixed("圆角标题是模板固定结构。"),
    },
    output: {
      table: {
        frame: true,
        backgrounds: "container",
      },
      codeBlock: {
        frame: "plain",
        syntaxHighlighting: true,
        languageLabel: false,
        shadow: false,
      },
      image: {
        shadow: false,
      },
    },
  },
  "geek-manual": {
    id: "geek-manual",
    name: "工程编辑部",
    typographyProfile: "system",
    structureNote:
      "轻量文档标题、提示卡片、终端代码栏和细线表格是固定结构。留白与圆角控制内容容器，字体气质应用于正文，技术信息固定使用等宽字体。",
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      accent: fixed("Cursor 式单色文档不使用额外强调色。"),
      spacing: partial("控制画布边距与主要内容块间距。"),
      radius: partial("作用于提示、代码、图片和表格容器。"),
      headingStyle: fixed("轻量文档标题是模板固定结构。"),
    },
    output: {
      table: {
        frame: true,
        backgrounds: "cells",
      },
      codeBlock: {
        frame: "terminal",
        syntaxHighlighting: true,
        languageLabel: true,
        shadow: true,
      },
      image: {
        shadow: false,
      },
    },
  },
} satisfies Record<ThemeRendererId, ThemeRendererContract>

export const THEME_CONTROL_LABELS: Record<ThemeControl, string> = {
  accent: "强调色",
  text: "文字",
  paper: "纸张",
  fontSize: "正文字号",
  lineHeight: "正文行高",
  spacing: "内容留白",
  radius: "圆角",
  headingStyle: "标题造型",
  fontFamily: "字体气质",
}

export function isThemeRenderer(value: unknown): value is ThemeRenderer {
  return (
    value === "island-log" ||
    value === "juya-daily" ||
    value === "geek-manual"
  )
}

export function getThemeRendererId(theme: ArticleTheme): ThemeRendererId {
  return theme.renderer || "default"
}

export function getThemeRendererContract(
  theme: ArticleTheme,
): ThemeRendererContract {
  return THEME_RENDERER_CONTRACTS[getThemeRendererId(theme)]
}

export function canEditThemeControl(
  contract: ThemeRendererContract,
  control: ThemeControl,
) {
  return contract.capabilities[control].level !== "fixed"
}

export type RenderTokens = {
  colors: {
    accent: string
    text: string
    paper: string
    surface: string
    surfaceMuted: string
    surfaceRaised: string
    highlight: string
    highlightText: string
    border: string
    borderSoft: string
    borderStrong: string
    divider: string
    codeBackground: string
    codeForeground: string
    codeBorder: string
    tableStripe: string
    secondary: string
    shadow: string
    shadowStrong: string
  }
  typography: {
    body: string
    display: string
    mono: string
    fontSize: number
    smallSize: number
    captionSize: number
    codeSize: number
    lineHeight: number
    compactLineHeight: number
    codeLineHeight: number
  }
  spacing: {
    md: number
    lg: number
    xl: number
  }
  radius: {
    xs: number
    md: number
    lg: number
    xl: number
  }
}

type Rgb = {
  red: number
  green: number
  blue: number
}

function parseHex(value: string): Rgb | null {
  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)
  if (!match) return null

  const hex =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((character) => character.repeat(2))
          .join("")
      : match[1]

  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
  }
}

function toHex({ red, green, blue }: Rgb) {
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round(channel).toString(16).padStart(2, "0"),
    )
    .join("")}`
}

function mixColor(foreground: string, background: string, amount: number) {
  const front = parseHex(foreground)
  const back = parseHex(background)
  if (!front || !back) return foreground

  const weight = Math.min(1, Math.max(0, amount))
  return toHex({
    red: front.red * weight + back.red * (1 - weight),
    green: front.green * weight + back.green * (1 - weight),
    blue: front.blue * weight + back.blue * (1 - weight),
  })
}

function colorWithAlpha(color: string, alpha: number) {
  const rgb = parseHex(color)
  if (!rgb) return color
  return `rgba(${rgb.red},${rgb.green},${rgb.blue},${alpha})`
}

function relativeLuminance(color: Rgb) {
  const channels = [color.red, color.green, color.blue].map((channel) => {
    const value = channel / 255
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrastRatio(left: Rgb, right: Rgb) {
  const brighter = Math.max(relativeLuminance(left), relativeLuminance(right))
  const darker = Math.min(relativeLuminance(left), relativeLuminance(right))
  return (brighter + 0.05) / (darker + 0.05)
}

function readableForeground(
  background: string,
  dark: string,
  light: string,
) {
  const backgroundRgb = parseHex(background)
  const darkRgb = parseHex(dark)
  const lightRgb = parseHex(light)
  if (!backgroundRgb || !darkRgb || !lightRgb) return light
  return contrastRatio(backgroundRgb, darkRgb) >=
    contrastRatio(backgroundRgb, lightRgb)
    ? dark
    : light
}

function roundNumber(value: number) {
  return Math.round(value * 100) / 100
}

function fontStack(
  family: FontFamily,
  profile: ThemeRendererContract["typographyProfile"],
) {
  if (family === "serif") {
    return '"Songti SC","STSong","Noto Serif CJK SC",serif'
  }
  if (family === "rounded") {
    return '"Yuanti SC","STYuanti-SC","YouYuan","Arial Rounded MT Bold","Nunito","PingFang SC","Microsoft YaHei",sans-serif'
  }
  if (profile === "editorial") {
    return 'Optima,"Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif'
  }
  return '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'
}

export function resolveThemeTokens(theme: ArticleTheme): RenderTokens {
  const contract = getThemeRendererContract(theme)
  const secondary = theme.secondary || theme.accent
  const codeForeground = readableForeground(
    theme.code,
    theme.text,
    theme.paper,
  )
  const bodyFont = fontStack(theme.fontFamily, contract.typographyProfile)

  return {
    colors: {
      accent: theme.accent,
      text: theme.text,
      paper: theme.paper,
      surface: theme.quote,
      surfaceMuted: mixColor(theme.quote, theme.paper, 0.8),
      surfaceRaised: mixColor("#ffffff", theme.paper, 0.72),
      highlight: mixColor(secondary, theme.paper, 0.18),
      highlightText: mixColor(theme.accent, theme.text, 0.68),
      border: mixColor(theme.text, theme.paper, 0.16),
      borderSoft: mixColor(theme.text, theme.paper, 0.1),
      borderStrong: mixColor(theme.text, theme.paper, 0.28),
      divider: mixColor(theme.text, theme.paper, 0.36),
      codeBackground: theme.code,
      codeForeground,
      codeBorder: mixColor(codeForeground, theme.code, 0.16),
      tableStripe: mixColor(theme.text, theme.paper, 0.025),
      secondary,
      shadow: colorWithAlpha(theme.text, 0.12),
      shadowStrong: colorWithAlpha(theme.text, 0.2),
    },
    typography: {
      body: bodyFont,
      display: bodyFont,
      mono:
        '"Operator Mono","SFMono-Regular","SF Mono","Fira Code","Cascadia Code",Menlo,Consolas,Monaco,monospace',
      fontSize: theme.fontSize,
      smallSize: Math.max(12, theme.fontSize - 2),
      captionSize: Math.max(12, theme.fontSize - 1),
      codeSize: Math.max(12, theme.fontSize - 3),
      lineHeight: theme.lineHeight,
      compactLineHeight: Math.max(
        1.4,
        roundNumber(theme.lineHeight - 0.25),
      ),
      codeLineHeight: Math.max(
        1.7,
        roundNumber(theme.lineHeight - 0.15),
      ),
    },
    spacing: {
      md: theme.spacing,
      lg: theme.spacing + 8,
      xl: theme.spacing + 30,
    },
    radius: {
      xs: Math.max(3, Math.round(theme.radius * 0.4)),
      md: theme.radius,
      lg: theme.radius + 6,
      xl: theme.radius + 10,
    },
  }
}

export const BUILTIN_THEMES: Record<string, ArticleTheme> = {
  clean: {
    id: "clean",
    name: "留白",
    description: "清晰 · 通用",
    accent: "#1f1f1f",
    text: "#262626",
    paper: "#ffffff",
    quote: "#f3f3f3",
    code: "#1f1f1f",
    fontSize: 16,
    lineHeight: 1.9,
    spacing: 24,
    radius: 6,
    headingStyle: "bar",
    fontFamily: "sans",
  },
  essay: {
    id: "essay",
    name: "文墨",
    description: "温和 · 人文",
    accent: "#9a543f",
    text: "#332f2b",
    paper: "#fffdf8",
    quote: "#f5f0e8",
    code: "#2e2b28",
    fontSize: 16,
    lineHeight: 2,
    spacing: 26,
    radius: 2,
    headingStyle: "underline",
    fontFamily: "serif",
  },
  brief: {
    id: "brief",
    name: "简报",
    description: "理性 · 紧凑",
    accent: "#315f8c",
    text: "#202830",
    paper: "#ffffff",
    quote: "#eef3f7",
    code: "#1d2730",
    fontSize: 15,
    lineHeight: 1.82,
    spacing: 22,
    radius: 4,
    headingStyle: "label",
    fontFamily: "sans",
  },
  island: {
    id: "island",
    name: "岛屿",
    description: "暖纸 · 手作",
    accent: "#4f9f70",
    secondary: "#f7cd67",
    text: "#654c36",
    paper: "#fffaf0",
    quote: "#e9f5e9",
    code: "#2b2118",
    fontSize: 16,
    lineHeight: 1.95,
    spacing: 26,
    radius: 18,
    headingStyle: "bar",
    fontFamily: "rounded",
    renderer: "island-log",
  },
  juya: {
    id: "juya",
    name: "橘鸦",
    description: "日报 · 清爽",
    accent: "#c96442",
    secondary: "#a0f9b0",
    text: "#141413",
    paper: "#faf9f5",
    quote: "#f0eee6",
    code: "#ffffff",
    fontSize: 15,
    lineHeight: 1.8,
    spacing: 18,
    radius: 12,
    headingStyle: "underline",
    fontFamily: "sans",
    renderer: "juya-daily",
  },
  geek: {
    id: "geek",
    name: "极客",
    description: "文档 · 克制",
    accent: "#d04f2b",
    text: "#26251e",
    paper: "#f7f7f4",
    quote: "#f0efea",
    code: "#20201e",
    fontSize: 15,
    lineHeight: 1.625,
    spacing: 22,
    radius: 10,
    headingStyle: "underline",
    fontFamily: "sans",
    renderer: "geek-manual",
  },
}
