import path from "node:path"

import { createServer } from "vite"

const projectRoot = process.cwd()
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
    THEME_CONTROLS,
    THEME_RENDERER_CONTRACTS,
    getThemeRendererContract,
  } = themeModule
  const { getArticleStyles } = markdownModule

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

  const geekStyles = getArticleStyles(BUILTIN_THEMES.geek)
  if (
    !geekStyles.th.includes(
      `background-color:${BUILTIN_THEMES.geek.quote}!important`,
    )
  ) {
    fail("geek table headers must carry their own paste-safe background")
  }
  if (
    !geekStyles.td.includes(
      `background-color:${BUILTIN_THEMES.geek.paper}!important`,
    )
  ) {
    fail("geek table cells must carry their own paste-safe background")
  }

  console.log(
    `Theme contracts verified: ${Object.keys(THEME_RENDERER_CONTRACTS).length} renderers × ${THEME_CONTROLS.length} controls`,
  )
} finally {
  await server.close()
}
