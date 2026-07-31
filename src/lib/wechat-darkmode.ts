import * as DarkmodeModule from "mp-darkmode"

type DarkmodeApi = {
  run: (
    nodes: ArrayLike<Element>,
    options?: {
      mode?: "dark" | "light"
      needJudgeFirstPage?: boolean
      cssSelectorsPrefix?: string
    },
  ) => void
}

const wechatDarkmodeModule = DarkmodeModule as unknown as DarkmodeApi & {
  default?: DarkmodeApi
}
const wechatDarkmode = wechatDarkmodeModule.default ?? wechatDarkmodeModule

/**
 * Applies the same DOM conversion used by the WeChat Official Accounts client.
 * The conversion deliberately runs only against a disposable preview node: its
 * generated classes and styles must never be included in copied rich text.
 */
export function applyWechatDarkMode(preview: HTMLElement) {
  wechatDarkmode.run(
    [preview, ...preview.querySelectorAll("*")],
    {
      mode: "dark",
      needJudgeFirstPage: false,
      // mp-darkmode emits its CSS into document.head. Scope it to this
      // disposable preview so generated classes can never affect the editor.
      cssSelectorsPrefix: ".is-dark-preview",
    },
  )
}
