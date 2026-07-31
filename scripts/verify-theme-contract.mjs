import path from "node:path"

import { parseHTML } from "linkedom"
import { createServer } from "vite"

const projectRoot = process.cwd()
const { window } = parseHTML("<html><body></body></html>")
globalThis.DOMParser = window.DOMParser
globalThis.Node = window.Node

const server = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  root: projectRoot,
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "src"),
    },
  },
  server: {
    middlewareMode: true,
  },
})

const fail = (message) => {
  throw new Error(`[theme-contract] ${message}`)
}

const requireElement = (element, message) => {
  if (!element) fail(message)
  return element
}

const styleOf = (element) => element.getAttribute("style") || ""

const hasShadow = (element) => {
  const style = styleOf(element)
  return style.includes("box-shadow:") && !style.includes("box-shadow:none")
}

const OUTPUT_FIXTURE = `正文包含 \`inline-code\`。

| Name | Value |
| --- | --- |
| Runtime | Browser |
| Format | HTML |

\`\`\`js
const message = "hello";
console.log(message);
\`\`\`

![Preview one](https://example.com/preview-1.png "Figure one")

![Preview two](https://example.com/preview-2.png)

![Preview three](https://example.com/preview-3.png)`

const mutateThemeControl = (theme, control) => {
  const next = structuredClone(theme)
  const mutations = {
    accent: "#b12a55",
    text: "#17324d",
    paper: "#f4eadc",
    fontSize: theme.fontSize + 1,
    lineHeight: theme.lineHeight + 0.1,
    spacing: theme.spacing + 2,
    radius: theme.radius + 2,
    headingStyle:
      theme.headingStyle === "bar"
        ? "underline"
        : theme.headingStyle === "underline"
          ? "label"
          : "bar",
    fontFamily: theme.fontFamily === "sans" ? "serif" : "sans",
  }

  if (!Object.hasOwn(mutations, control)) {
    fail(`No mutation fixture is defined for control "${control}".`)
  }

  next[control] = mutations[control]
  return next
}

try {
  const themeModule = await server.ssrLoadModule("/src/lib/theme.ts")
  const markdownModule = await server.ssrLoadModule("/src/lib/markdown.ts")
  const {
    BUILTIN_THEMES,
    DEFAULT_ARTICLE_LAYOUT_SETTINGS,
    THEME_CONTROLS,
    THEME_RENDERER_CONTRACTS,
    getThemeRendererContract,
  } = themeModule
  const { getArticleStyles, inlineDocument, markdownToHtml } = markdownModule

  const themesByRenderer = {
    default: BUILTIN_THEMES.clean,
    "island-log": BUILTIN_THEMES.island,
    "juya-daily": BUILTIN_THEMES.juya,
    "geek-manual": BUILTIN_THEMES.geek,
  }

  for (const [rendererId, contract] of Object.entries(
    THEME_RENDERER_CONTRACTS,
  )) {
    if (contract.id !== rendererId) {
      fail(`renderer "${rendererId}" declares mismatched id "${contract.id}"`)
    }

    const capabilityKeys = Object.keys(contract.capabilities).sort()
    const expectedKeys = [...THEME_CONTROLS].sort()
    if (JSON.stringify(capabilityKeys) !== JSON.stringify(expectedKeys)) {
      fail(`renderer "${rendererId}" does not declare every theme control`)
    }

    const theme = themesByRenderer[rendererId]
    if (!theme) fail(`renderer "${rendererId}" has no contract fixture`)
    if (getThemeRendererContract(theme).id !== rendererId) {
      fail(`renderer "${rendererId}" cannot resolve its own contract`)
    }

    const baseStyles = JSON.stringify(getArticleStyles(theme))
    for (const control of THEME_CONTROLS) {
      const capability = contract.capabilities[control]
      const changedStyles = JSON.stringify(
        getArticleStyles(mutateThemeControl(theme, control)),
      )
      const responds = changedStyles !== baseStyles

      if (capability.level === "fixed" && responds) {
        fail(
          `renderer "${rendererId}" marks "${control}" fixed but its styles change`,
        )
      }
      if (capability.level !== "fixed" && !responds) {
        fail(
          `renderer "${rendererId}" marks "${control}" ${capability.level} but its styles do not change`,
        )
      }
    }
  }

  const fixtureHtml = markdownToHtml(OUTPUT_FIXTURE)
  for (const [rendererId, contract] of Object.entries(
    THEME_RENDERER_CONTRACTS,
  )) {
    const theme = themesByRenderer[rendererId]
    const output = inlineDocument(fixtureHtml, theme)
    const document = new DOMParser().parseFromString(
      `<html><body>${output}</body></html>`,
      "text/html",
    )
    const root = requireElement(
      document.body.firstElementChild,
      `renderer "${rendererId}" produced no article root`,
    )

    const elements = [root, ...root.querySelectorAll("*")]
    const internalAttribute = elements
      .flatMap((element) => Array.from(element.attributes))
      .find((attribute) => attribute.name.startsWith("data-"))
    if (internalAttribute) {
      fail(
        `renderer "${rendererId}" leaked internal attribute "${internalAttribute.name}"`,
      )
    }

    const table = requireElement(
      root.querySelector("table"),
      `renderer "${rendererId}" produced no table`,
    )
    const tableContainer = requireElement(
      table.parentElement,
      `renderer "${rendererId}" table has no container`,
    )
    const tableContainerStyle = styleOf(tableContainer)
    if (contract.output.table.frame && tableContainer === root) {
      fail(`renderer "${rendererId}" table must use a frame`)
    }
    if (!contract.output.table.frame && tableContainer !== root) {
      fail(`renderer "${rendererId}" table must remain unframed`)
    }

    const tableHeader = requireElement(
      table.querySelector("th"),
      `renderer "${rendererId}" table has no header cell`,
    )
    const tableCell = requireElement(
      table.querySelector("td"),
      `renderer "${rendererId}" table has no body cell`,
    )
    if (
      contract.output.table.backgrounds === "header" &&
      !/background(?:-color)?:/.test(styleOf(tableHeader))
    ) {
      fail(`renderer "${rendererId}" table header needs an inline background`)
    }
    if (
      contract.output.table.backgrounds === "container" &&
      (!tableContainerStyle.includes("background:") ||
        tableContainerStyle.includes("background:transparent"))
    ) {
      fail(`renderer "${rendererId}" table container needs its own background`)
    }
    if (
      contract.output.table.backgrounds === "cells" &&
      (!styleOf(tableHeader).includes("background-color:") ||
        !styleOf(tableHeader).includes("!important") ||
        !styleOf(tableCell).includes("background-color:") ||
        !styleOf(tableCell).includes("!important"))
    ) {
      fail(
        `renderer "${rendererId}" table cells need paste-safe inline backgrounds`,
      )
    }

    const pre = requireElement(
      root.querySelector("pre"),
      `renderer "${rendererId}" produced no code block`,
    )
    const code = requireElement(
      pre.querySelector("code"),
      `renderer "${rendererId}" code block has no code element`,
    )
    const codeFrame =
      contract.output.codeBlock.frame === "terminal"
        ? requireElement(
            pre.parentElement,
            `renderer "${rendererId}" terminal has no frame`,
          )
        : pre
    if (
      contract.output.codeBlock.frame === "plain" &&
      pre.parentElement !== root
    ) {
      fail(`renderer "${rendererId}" code block must remain unwrapped`)
    }
    if (
      contract.output.codeBlock.frame === "terminal" &&
      pre.parentElement === root
    ) {
      fail(`renderer "${rendererId}" code block needs a terminal frame`)
    }

    const highlighted = Array.from(code.querySelectorAll("span")).some(
      (element) => styleOf(element).includes("color:"),
    )
    if (highlighted !== contract.output.codeBlock.syntaxHighlighting) {
      fail(
        `renderer "${rendererId}" syntax highlighting does not match its contract`,
      )
    }

    const languageLabel =
      contract.output.codeBlock.frame === "terminal" &&
      pre.previousElementSibling?.textContent.includes("JS")
    if (Boolean(languageLabel) !== contract.output.codeBlock.languageLabel) {
      fail(
        `renderer "${rendererId}" language label does not match its contract`,
      )
    }
    if (hasShadow(codeFrame) !== contract.output.codeBlock.shadow) {
      fail(`renderer "${rendererId}" code shadow does not match its contract`)
    }

    const image = requireElement(
      root.querySelector("img"),
      `renderer "${rendererId}" produced no image`,
    )
    if (hasShadow(image) !== contract.output.image.shadow) {
      fail(`renderer "${rendererId}" image shadow does not match its contract`)
    }
  }

  const layoutFixture = {
    ...DEFAULT_ARTICLE_LAYOUT_SETTINGS,
    paragraphAlign: "justify",
    firstLineIndent: true,
    paragraphSpacing: "relaxed",
    imageWidth: "full",
    imageCaptionAlign: "left",
    imageCaptionSize: 14,
  }
  for (const [rendererId, theme] of Object.entries(themesByRenderer)) {
    for (const overflow of ["wrap", "scroll"]) {
      const output = inlineDocument(fixtureHtml, theme, {
        ...layoutFixture,
        tableOverflow: overflow,
        codeOverflow: overflow,
      })
      const document = new DOMParser().parseFromString(
        `<html><body>${output}</body></html>`,
        "text/html",
      )
      const root = requireElement(
        document.body.firstElementChild,
        `renderer "${rendererId}" produced no layout fixture root`,
      )
      const paragraph = requireElement(
        root.querySelector("p"),
        `renderer "${rendererId}" produced no paragraph`,
      )
      const paragraphStyle = styleOf(paragraph)
      if (
        !paragraphStyle.includes("text-align:justify") ||
        !paragraphStyle.includes("text-indent:2em") ||
        !paragraphStyle.includes("margin-bottom:1.9em")
      ) {
        fail(`renderer "${rendererId}" ignored paragraph layout settings`)
      }

      const image = requireElement(
        root.querySelector("img"),
        `renderer "${rendererId}" produced no layout fixture image`,
      )
      if (!styleOf(image).includes("width:100%;max-width:100%")) {
        fail(`renderer "${rendererId}" ignored the full-width image setting`)
      }
      const caption = requireElement(
        image.nextElementSibling,
        `renderer "${rendererId}" produced no image caption`,
      )
      if (
        caption.textContent !== "Figure one" ||
        !styleOf(caption).includes("font-size:14px") ||
        !styleOf(caption).includes("text-align:left")
      ) {
        fail(`renderer "${rendererId}" ignored image caption settings`)
      }
      const fallbackCaption = requireElement(
        root.querySelectorAll("img")[1]?.nextElementSibling,
        `renderer "${rendererId}" produced no alt fallback caption`,
      )
      if (fallbackCaption.textContent !== "Preview two") {
        fail(`renderer "${rendererId}" did not use alt as the caption fallback`)
      }

      const pre = requireElement(
        root.querySelector("pre"),
        `renderer "${rendererId}" produced no layout fixture code block`,
      )
      const table = requireElement(
        root.querySelector("table"),
        `renderer "${rendererId}" produced no layout fixture table`,
      )
      const cell = requireElement(
        table.querySelector("td"),
        `renderer "${rendererId}" produced no layout fixture table cell`,
      )
      if (overflow === "wrap") {
        if (
          !styleOf(pre).includes("overflow-x:hidden;white-space:pre-wrap") ||
          !styleOf(table).includes("table-layout:fixed") ||
          !styleOf(cell).includes("white-space:normal")
        ) {
          fail(`renderer "${rendererId}" ignored wrap overflow settings`)
        }
      } else {
        if (
          !styleOf(pre).includes("overflow-x:auto;white-space:pre") ||
          !styleOf(table).includes("width:max-content") ||
          !styleOf(cell).includes("white-space:nowrap") ||
          !styleOf(table.parentElement).includes("overflow-x:auto")
        ) {
          fail(`renderer "${rendererId}" ignored scroll overflow settings`)
        }
      }
    }
  }

  for (const [rendererId, theme] of Object.entries(themesByRenderer)) {
    const output = inlineDocument(fixtureHtml, theme, {
      ...DEFAULT_ARTICLE_LAYOUT_SETTINGS,
      imageLayout: "scroll",
    })
    const document = new DOMParser().parseFromString(
      `<html><body>${output}</body></html>`,
      "text/html",
    )
    const root = requireElement(
      document.body.firstElementChild,
      `renderer "${rendererId}" produced no image layout fixture root`,
    )
    const images = Array.from(root.querySelectorAll("img"))
    if (images.length !== 3) {
      fail(`renderer "${rendererId}" image gallery lost images`)
    }
    const imageFrames = images.map((image) =>
      requireElement(
        image.parentElement,
        `renderer "${rendererId}" gallery image has no frame`,
      ),
    )
    const gallery = requireElement(
      imageFrames[0].parentElement,
      `renderer "${rendererId}" image gallery has no container`,
    )
    if (
      imageFrames.some((frame) => frame.parentElement !== gallery) ||
      !styleOf(gallery).includes("overflow-x:auto") ||
      !styleOf(gallery).includes("white-space:nowrap") ||
      imageFrames.some((frame) => !styleOf(frame).includes("width:88%")) ||
      images.some((image) => !styleOf(image).includes("width:100%")) ||
      images.some((image) => !image.nextElementSibling?.textContent?.trim())
    ) {
      fail(`renderer "${rendererId}" ignored horizontal image layout`)
    }
  }

  const captionsHiddenOutput = inlineDocument(
    fixtureHtml,
    BUILTIN_THEMES.clean,
    {
      ...DEFAULT_ARTICLE_LAYOUT_SETTINGS,
      showImageCaptions: false,
    },
  )
  const captionsHiddenDocument = new DOMParser().parseFromString(
    `<html><body>${captionsHiddenOutput}</body></html>`,
    "text/html",
  )
  const captionsHiddenImage = requireElement(
    captionsHiddenDocument.body.querySelector("img"),
    "caption visibility fixture produced no image",
  )
  if (captionsHiddenImage.nextElementSibling) {
    fail("hidden image captions still render visible content")
  }

  console.log(
    `Theme contracts verified: ${Object.keys(THEME_RENDERER_CONTRACTS).length} renderers × ${THEME_CONTROLS.length} controls + output, layout and gallery invariants`,
  )
} finally {
  await server.close()
}
