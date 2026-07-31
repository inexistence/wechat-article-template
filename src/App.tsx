import {
  Bold,
  Braces,
  Check,
  ChevronRight,
  Code2,
  Download,
  FilePlus2,
  Heading2,
  Link2,
  List,
  MessageSquareQuote,
  MoreHorizontal,
  PencilLine,
  Settings2,
  Trash2,
  X,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { DropdownMenu } from "radix-ui"
import { useEffect, useMemo, useRef, useState } from "react"
import type * as React from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/animate-ui/components/radix/alert-dialog"
import { Button } from "@/components/animate-ui/components/buttons/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/animate-ui/components/radix/sheet"
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/components/animate-ui/components/radix/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/animate-ui/components/radix/tooltip"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Toaster } from "@/components/ui/sonner"
import { Textarea } from "@/components/ui/textarea"
import {
  DEFAULT_MARKDOWN,
  inlineDocument,
  markdownToHtml,
} from "@/lib/markdown"
import {
  BUILTIN_THEMES,
  THEME_CONTROL_LABELS,
  canEditThemeControl,
  getThemeRendererContract,
  isThemeRenderer,
  type ArticleTheme,
  type FontFamily,
  type HeadingStyle,
  type ThemeControl,
} from "@/lib/theme"
import { cn } from "@/lib/utils"

const DOCUMENT_KEY = "paibanjian-react-document-v3"
const CUSTOM_THEMES_KEY = "paibanjian-react-themes-v3"
const THEME_VERSION = 9

type WorkspaceView = "write" | "preview" | "style"
type PreviewMode = "visual" | "html"
type PreviewWidth = 320 | 375 | 420
type SaveState = "saved" | "saving" | "error"

const PREVIEW_WIDTHS: { value: PreviewWidth; label: string }[] = [
  { value: 320, label: "紧凑" },
  { value: 375, label: "标准" },
  { value: 420, label: "宽屏" },
]
const COLOR_THEME_CONTROLS = ["accent", "text", "paper"] as const

type SavedDocument = {
  markdown: string
  title: string
  selectedThemeId: string
  activeTheme: ArticleTheme
  themeVersion?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isArticleTheme(value: unknown): value is ArticleTheme {
  if (!isRecord(value)) return false

  const stringFields = [
    "id",
    "name",
    "description",
    "accent",
    "text",
    "paper",
    "quote",
    "code",
  ] as const
  const numberFields = ["fontSize", "lineHeight", "spacing", "radius"] as const

  return (
    stringFields.every((field) => typeof value[field] === "string") &&
    numberFields.every((field) => isFiniteNumber(value[field])) &&
    (value.headingStyle === "bar" ||
      value.headingStyle === "underline" ||
      value.headingStyle === "label") &&
    (value.fontFamily === "sans" ||
      value.fontFamily === "serif" ||
      value.fontFamily === "rounded") &&
    (value.secondary === undefined || typeof value.secondary === "string") &&
    (value.renderer === undefined || isThemeRenderer(value.renderer))
  )
}

function isSavedDocument(value: unknown): value is SavedDocument {
  if (!isRecord(value)) return false

  return (
    typeof value.markdown === "string" &&
    typeof value.title === "string" &&
    typeof value.selectedThemeId === "string" &&
    isArticleTheme(value.activeTheme) &&
    (value.themeVersion === undefined || isFiniteNumber(value.themeVersion))
  )
}

function loadCustomThemes(): ArticleTheme[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(CUSTOM_THEMES_KEY) || "[]",
    )
    return Array.isArray(stored) ? stored.filter(isArticleTheme) : []
  } catch {
    return []
  }
}

function loadDocument(): SavedDocument | null {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(DOCUMENT_KEY) || "null",
    )
    return isSavedDocument(stored) ? stored : null
  } catch {
    return null
  }
}

function IconTool({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <Tooltip delayDuration={350}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          hoverScale={1.02}
          tapScale={0.96}
          aria-label={label}
          onClick={onClick}
          className="text-muted-foreground hover:text-foreground"
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={7}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function ThemeThumbnail({ theme }: { theme: ArticleTheme }) {
  return (
    <span
      className={cn(
        "theme-thumbnail",
        theme.renderer && `theme-thumbnail--${theme.renderer}`,
      )}
      style={
        {
          "--thumbnail-paper": theme.paper,
          "--thumbnail-text": theme.text,
          "--thumbnail-accent": theme.accent,
          "--thumbnail-quote": theme.quote,
          "--thumbnail-secondary": theme.secondary || theme.accent,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <span className="theme-thumbnail__marker" />
      <span className="theme-thumbnail__title" />
      <span className="theme-thumbnail__body" />
      <span className="theme-thumbnail__footer" />
    </span>
  )
}

function SectionHeader({
  title,
  meta,
  actions,
}: {
  title: string
  meta?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="section-header">
      <div className="min-w-0">
        <h2>{title}</h2>
        {meta && <span>{meta}</span>}
      </div>
      {actions && <div className="section-actions">{actions}</div>}
    </header>
  )
}

function SettingSlider({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  display: string
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="setting-row">
      <span>
        <b>{label}</b>
        <output>{display}</output>
      </span>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(next[0])}
      />
    </label>
  )
}

export default function App() {
  const saved = useMemo(loadDocument, [])
  const [markdown, setMarkdown] = useState(saved?.markdown || DEFAULT_MARKDOWN)
  const [title, setTitle] = useState(saved?.title || "未命名文章")
  const [selectedThemeId, setSelectedThemeId] = useState(
    saved?.selectedThemeId || "clean",
  )
  const [activeTheme, setActiveTheme] = useState<ArticleTheme>(
    saved &&
      (saved.themeVersion === THEME_VERSION ||
        saved.selectedThemeId.startsWith("custom-"))
      ? saved.activeTheme
      : structuredClone(
          BUILTIN_THEMES[saved?.selectedThemeId || "clean"] ||
            BUILTIN_THEMES.clean,
        ),
  )
  const [customThemes, setCustomThemes] = useState<ArticleTheme[]>(loadCustomThemes)
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("write")
  const [previewMode, setPreviewMode] = useState<PreviewMode>("visual")
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>(375)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [renamingThemeId, setRenamingThemeId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deletingTheme, setDeletingTheme] = useState<ArticleTheme | null>(null)
  const [saveState, setSaveState] = useState<SaveState>("saved")
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const allThemes = useMemo(
    () => ({
      ...BUILTIN_THEMES,
      ...Object.fromEntries(customThemes.map((theme) => [theme.id, theme])),
    }),
    [customThemes],
  )
  const themeContract = useMemo(
    () => getThemeRendererContract(activeTheme),
    [activeTheme.renderer],
  )
  const editableColorControls = COLOR_THEME_CONTROLS.filter((control) =>
    canEditThemeControl(themeContract, control),
  )
  const isControlEditable = (control: ThemeControl) =>
    canEditThemeControl(themeContract, control)

  const finalHtml = useMemo(
    () => inlineDocument(markdownToHtml(markdown), activeTheme),
    [markdown, activeTheme],
  )

  const characterCount = useMemo(
    () =>
      markdown
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[#>*_~`|[\]()!-]/g, "")
        .replace(/\s+/g, "").length,
    [markdown],
  )

  useEffect(() => {
    setSaveState("saving")
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DOCUMENT_KEY,
          JSON.stringify({
            markdown,
            title,
            selectedThemeId,
            activeTheme,
            themeVersion: THEME_VERSION,
          }),
        )
        setSaveState("saved")
        toast.dismiss("autosave-error")
      } catch {
        setSaveState("error")
        toast.error("自动保存失败", {
          id: "autosave-error",
          description: "浏览器存储空间不足或不可用，请先下载 Markdown 备份。",
        })
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [markdown, title, selectedThemeId, activeTheme])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault()
        void copyRichText()
      }
    }
    document.addEventListener("keydown", handleShortcut)
    return () => document.removeEventListener("keydown", handleShortcut)
  })

  const updateTheme = <K extends keyof ArticleTheme>(
    key: K,
    value: ArticleTheme[K],
  ) => {
    setActiveTheme((theme) => ({ ...theme, [key]: value }))
  }

  const selectTheme = (id: string) => {
    const next = allThemes[id]
    if (!next) return
    setSelectedThemeId(id)
    setActiveTheme(structuredClone(next))
  }

  const insertMarkdown = (type: string) => {
    const editor = editorRef.current
    if (!editor) return
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const selected = markdown.slice(start, end)
    const presets: Record<string, [string, number, number]> = {
      heading: [`## ${selected || "小标题"}`, 3, selected ? 0 : 3],
      bold: [`**${selected || "重点内容"}**`, 2, selected ? 0 : 4],
      quote: [`> ${selected || "引用内容"}`, 2, selected ? 0 : 4],
      link: [`[${selected || "链接文字"}](https://example.com)`, 1, selected ? 0 : 4],
      list: [`- ${selected || "列表项目"}`, 2, selected ? 0 : 4],
      code: [
        `\`\`\`js\n${selected || "const hello = 'world';"}\n\`\`\``,
        6,
        selected ? 0 : 22,
      ],
    }
    const [replacement, cursorStart, cursorEndOffset] = presets[type]
    const next = markdown.slice(0, start) + replacement + markdown.slice(end)
    setMarkdown(next)
    requestAnimationFrame(() => {
      editor.focus()
      if (!selected) {
        editor.setSelectionRange(
          start + cursorStart,
          start + replacement.length - cursorEndOffset,
        )
      }
    })
  }

  const copyRichText = async () => {
    const plain = new DOMParser()
      .parseFromString(finalHtml, "text/html")
      .body.innerText
      .replaceAll("\u00a0", " ")
    try {
      if (window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([finalHtml], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ])
      } else {
        const container = document.createElement("div")
        container.contentEditable = "true"
        container.style.position = "fixed"
        container.style.left = "-9999px"
        container.innerHTML = finalHtml
        document.body.appendChild(container)
        const selection = window.getSelection()
        try {
          if (!selection) throw new Error("Selection API unavailable")
          const range = document.createRange()
          range.selectNodeContents(container)
          selection.removeAllRanges()
          selection.addRange(range)
          if (!document.execCommand("copy")) {
            throw new Error("Legacy clipboard copy failed")
          }
        } finally {
          container.remove()
          selection?.removeAllRanges()
        }
      }
      toast.success("已复制公众号富文本", {
        description: "在公众号编辑器中直接粘贴即可。",
      })
    } catch {
      toast.error("复制失败", {
        description: "切换到 HTML 视图后手动复制。",
      })
    }
  }

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${title.trim() || "未命名文章"}.md`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const createDocument = () => {
    setTitle("未命名文章")
    setMarkdown(DEFAULT_MARKDOWN)
  }

  const persistCustomThemes = (themes: ArticleTheme[]) => {
    try {
      localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes))
      return true
    } catch {
      toast.error("模板保存失败", {
        description: "浏览器存储空间不足或不可用。",
      })
      return false
    }
  }

  const saveCustomTheme = () => {
    const id = `custom-${Date.now()}`
    const next: ArticleTheme = {
      ...activeTheme,
      id,
      name: `我的模板 ${customThemes.length + 1}`,
      description: "自定义",
    }
    const list = [...customThemes, next]
    if (!persistCustomThemes(list)) return
    setCustomThemes(list)
    setSelectedThemeId(id)
    setActiveTheme(next)
    setSettingsOpen(false)
    toast.success("模板已保存")
  }

  const startRenamingTheme = (theme: ArticleTheme) => {
    setRenamingThemeId(theme.id)
    setRenameValue(theme.name)
  }

  const cancelRenamingTheme = () => {
    setRenamingThemeId(null)
    setRenameValue("")
  }

  const renameCustomTheme = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!renamingThemeId) return

    const name = renameValue.trim()
    if (!name) {
      toast.error("模板名称不能为空")
      return
    }

    const list = customThemes.map((theme) =>
      theme.id === renamingThemeId ? { ...theme, name } : theme,
    )
    if (!persistCustomThemes(list)) return

    setCustomThemes(list)
    if (selectedThemeId === renamingThemeId) {
      setActiveTheme((theme) => ({ ...theme, name }))
    }
    cancelRenamingTheme()
    toast.success("模板已重命名")
  }

  const deleteCustomTheme = () => {
    if (!deletingTheme) return

    const list = customThemes.filter((item) => item.id !== deletingTheme.id)
    if (!persistCustomThemes(list)) return

    setCustomThemes(list)
    if (selectedThemeId === deletingTheme.id) {
      const fallback = structuredClone(BUILTIN_THEMES.clean)
      setSelectedThemeId(fallback.id)
      setActiveTheme(fallback)
    }
    if (renamingThemeId === deletingTheme.id) cancelRenamingTheme()
    setDeletingTheme(null)
    toast.success("模板已删除")
  }

  const resetTheme = () => {
    const original = allThemes[selectedThemeId] || BUILTIN_THEMES.clean
    setActiveTheme(structuredClone(original))
  }

  return (
    <div className="app-shell">
      <Toaster position="top-center" closeButton />

      <AlertDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      >
        <AlertDialogContent className="confirm-dialog-content">
          <AlertDialogHeader>
            <AlertDialogTitle className="confirm-dialog-title">
              新建文章？
            </AlertDialogTitle>
            <AlertDialogDescription className="confirm-dialog-description">
              当前编辑区将恢复为默认参考文章；已保存的模板不会受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="confirm-dialog-actions">
            <AlertDialogCancel asChild>
              <Button variant="outline">取消</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={createDocument}>新建文章</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deletingTheme)}
        onOpenChange={(open) => {
          if (!open) setDeletingTheme(null)
        }}
      >
        <AlertDialogContent className="confirm-dialog-content">
          <AlertDialogHeader>
            <AlertDialogTitle className="confirm-dialog-title">
              删除这个模板？
            </AlertDialogTitle>
            <AlertDialogDescription className="confirm-dialog-description">
              “{deletingTheme?.name}”将从当前浏览器永久删除，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="confirm-dialog-actions">
            <AlertDialogCancel asChild>
              <Button variant="outline">取消</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={deleteCustomTheme}>
                删除模板
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="app-header">
        <a className="wordmark" href="#" aria-label="排版间首页">
          <span aria-hidden="true" />
          <strong>排版间</strong>
        </a>

        <div className="document-status">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="文章名称"
            className="document-title"
          />
          <span
            className={cn(
              saveState === "saving" && "is-saving",
              saveState === "error" && "is-error",
            )}
          >
            {saveState === "saving"
              ? "保存中"
              : saveState === "error"
                ? "保存失败"
                : "已保存"}
          </span>
        </div>

        <div className="header-actions">
          <Tooltip delayDuration={350}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                hoverScale={1.02}
                tapScale={0.96}
                aria-label="新建文章"
                onClick={() => setCreateDialogOpen(true)}
              >
                <FilePlus2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">新建文章</TooltipContent>
          </Tooltip>
          <Button
            onClick={() => void copyRichText()}
            hoverScale={1.015}
            tapScale={0.98}
            className="copy-action"
          >
            <Check className="copy-check" />
            复制到公众号
            <kbd>⌘↵</kbd>
          </Button>
        </div>
      </header>

      <Tabs
        value={workspaceView}
        onValueChange={(value) => setWorkspaceView(value as WorkspaceView)}
        className="mobile-workspace-tabs"
      >
        <TabsList className="w-full">
          <TabsTrigger value="write">写作</TabsTrigger>
          <TabsTrigger value="preview">预览</TabsTrigger>
          <TabsTrigger value="style">模板</TabsTrigger>
        </TabsList>
      </Tabs>

      <main className="workspace" data-mobile-view={workspaceView}>
        <aside className="themes-panel workspace-panel" aria-label="模板">
          <SectionHeader
            title="模板"
            meta={`${Object.keys(allThemes).length} 个版式`}
            actions={
              <Button
                variant="ghost"
                size="icon-sm"
                hoverScale={1.02}
                tapScale={0.96}
                onClick={() => setSettingsOpen(true)}
                aria-label="调整模板"
              >
                <Settings2 />
              </Button>
            }
          />

          <div className="theme-list">
            {Object.values(allThemes).map((theme) => {
              const selected = theme.id === selectedThemeId
              const isCustom = theme.id.startsWith("custom-")
              const isRenaming = theme.id === renamingThemeId
              return (
                <div
                  key={theme.id}
                  className={cn(
                    "theme-item",
                    isCustom && "is-custom",
                    isRenaming && "is-renaming",
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "theme-option",
                      selected && "is-selected",
                      isCustom && "has-actions",
                    )}
                    onClick={() => selectTheme(theme.id)}
                  >
                    {selected && (
                      <motion.span
                        layoutId="theme-selection"
                        className="theme-selection"
                        transition={{ type: "spring", stiffness: 360, damping: 34 }}
                      />
                    )}
                    <ThemeThumbnail theme={theme} />
                    <span className="theme-copy">
                      <strong>{theme.name}</strong>
                      <small>{theme.description}</small>
                    </span>
                    <Check className="theme-check" />
                  </button>

                  {isCustom && (
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          className="theme-menu-trigger"
                          aria-label={`管理模板“${theme.name}”`}
                        >
                          <MoreHorizontal />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="theme-menu-content"
                          side="bottom"
                          align="end"
                          sideOffset={4}
                          collisionPadding={10}
                        >
                          <DropdownMenu.Item
                            className="theme-menu-item"
                            onSelect={() => startRenamingTheme(theme)}
                          >
                            <PencilLine />
                            重命名
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="theme-menu-separator" />
                          <DropdownMenu.Item
                            className="theme-menu-item is-destructive"
                            onSelect={() => setDeletingTheme(theme)}
                          >
                            <Trash2 />
                            删除
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  )}

                  <AnimatePresence initial={false}>
                    {isRenaming && (
                      <motion.form
                        className="theme-rename-form"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                        onSubmit={renameCustomTheme}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            cancelRenamingTheme()
                          }
                        }}
                      >
                        <Input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          maxLength={30}
                          autoFocus
                          aria-label="新的模板名称"
                          className="theme-rename-input"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="取消重命名"
                          onClick={cancelRenamingTheme}
                        >
                          <X />
                        </Button>
                        <Button
                          type="submit"
                          size="icon-sm"
                          aria-label="保存模板名称"
                        >
                          <Check />
                        </Button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            className="adjust-row"
            onClick={() => setSettingsOpen(true)}
          >
            <span>
              <Settings2 />
              <span>
                <strong>调整当前模板</strong>
                <small>颜色、文字与间距</small>
              </span>
            </span>
            <ChevronRight />
          </button>

          <p className="local-note">
            模板和草稿仅保存在当前浏览器。复制后的样式不依赖本站。
          </p>
        </aside>

        <section className="editor-panel workspace-panel" aria-label="Markdown 编辑器">
          <SectionHeader
            title="Markdown"
            meta={`${characterCount} 字 · 约 ${Math.max(1, Math.ceil(characterCount / 400))} 分钟`}
            actions={
              <Button
                variant="ghost"
                size="sm"
                hoverScale={1.02}
                tapScale={0.96}
                onClick={downloadMarkdown}
                className="download-button"
              >
                <Download />
                .md
              </Button>
            }
          />

          <div className="editor-toolbar" role="toolbar" aria-label="Markdown 格式">
            <IconTool
              label="二级标题"
              icon={<Heading2 />}
              onClick={() => insertMarkdown("heading")}
            />
            <IconTool
              label="加粗"
              icon={<Bold />}
              onClick={() => insertMarkdown("bold")}
            />
            <IconTool
              label="引用"
              icon={<MessageSquareQuote />}
              onClick={() => insertMarkdown("quote")}
            />
            <IconTool
              label="链接"
              icon={<Link2 />}
              onClick={() => insertMarkdown("link")}
            />
            <IconTool
              label="列表"
              icon={<List />}
              onClick={() => insertMarkdown("list")}
            />
            <IconTool
              label="代码"
              icon={<Code2 />}
              onClick={() => insertMarkdown("code")}
            />
          </div>

          <Textarea
            ref={editorRef}
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck
            aria-label="Markdown 内容"
            className="markdown-editor"
          />

          <footer className="editor-footer">
            <span>
              <i />
              自动保存
            </span>
            <span>Markdown</span>
          </footer>
        </section>

        <section className="preview-panel workspace-panel" aria-label="公众号预览">
          <SectionHeader
            title="公众号预览"
            meta={`${previewWidth} px`}
            actions={
              <DropdownMenu.Root>
                <Tooltip delayDuration={350}>
                  <TooltipTrigger asChild>
                    <DropdownMenu.Trigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        hoverScale={1.02}
                        tapScale={0.96}
                        aria-label="更多预览选项"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenu.Trigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">预览选项</TooltipContent>
                </Tooltip>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="preview-options-menu"
                    side="bottom"
                    align="end"
                    sideOffset={7}
                    collisionPadding={10}
                  >
                    <DropdownMenu.Label className="preview-options-label">
                      预览宽度
                    </DropdownMenu.Label>
                    <DropdownMenu.RadioGroup
                      value={String(previewWidth)}
                      onValueChange={(value) =>
                        setPreviewWidth(Number(value) as PreviewWidth)
                      }
                    >
                      {PREVIEW_WIDTHS.map((option) => (
                        <DropdownMenu.RadioItem
                          key={option.value}
                          value={String(option.value)}
                          className="preview-option"
                        >
                          <span>{option.label}</span>
                          <small>{option.value} px</small>
                          <DropdownMenu.ItemIndicator className="preview-option-check">
                            <Check />
                          </DropdownMenu.ItemIndicator>
                        </DropdownMenu.RadioItem>
                      ))}
                    </DropdownMenu.RadioGroup>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            }
          />

          <Tabs
            value={previewMode}
            onValueChange={(value) => setPreviewMode(value as PreviewMode)}
            className="preview-tabs"
            style={
              {
                "--preview-width": `${previewWidth}px`,
              } as React.CSSProperties
            }
          >
            <TabsList className="preview-tab-list">
              <TabsTrigger value="visual">预览</TabsTrigger>
              <TabsTrigger value="html">
                <Braces />
                HTML
              </TabsTrigger>
            </TabsList>
            <TabsContents mode="layout" className="preview-tab-contents">
              <TabsContent value="visual" className="preview-tab-content">
                <div className="preview-canvas">
                  <div className="preview-width">
                    <i />
                    <span>{previewWidth}</span>
                    <i />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.article
                      key={`${selectedThemeId}-${activeTheme.accent}-${activeTheme.fontSize}-${activeTheme.headingStyle}`}
                      className="article-preview"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      dangerouslySetInnerHTML={{ __html: finalHtml }}
                    />
                  </AnimatePresence>
                </div>
              </TabsContent>
              <TabsContent value="html" className="preview-tab-content">
                <pre className="html-output">
                  <code>{finalHtml}</code>
                </pre>
              </TabsContent>
            </TabsContents>
          </Tabs>
        </section>
      </main>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent
          side="right"
          className="template-sheet sm:w-[420px]"
          transition={{ type: "spring", stiffness: 240, damping: 30 }}
        >
          <SheetHeader className="sheet-heading">
            <SheetTitle>调整模板</SheetTitle>
            <SheetDescription>
              所有设置会实时反映在预览中。
            </SheetDescription>
          </SheetHeader>

          <div className="settings-scroll">
            {editableColorControls.length > 0 && (
              <section className="setting-section">
                <h3>颜色</h3>
                <div className="color-settings">
                  {editableColorControls.map((key) => (
                    <label key={key}>
                      <span>{THEME_CONTROL_LABELS[key]}</span>
                      <input
                        type="color"
                        value={activeTheme[key]}
                        onChange={(event) =>
                          updateTheme(key, event.target.value)
                        }
                      />
                    </label>
                  ))}
                </div>
              </section>
            )}

            <section className="setting-section">
              <h3>阅读参数</h3>
              {isControlEditable("fontSize") && (
                <SettingSlider
                  label={THEME_CONTROL_LABELS.fontSize}
                  value={activeTheme.fontSize}
                  display={`${activeTheme.fontSize}px`}
                  min={14}
                  max={19}
                  onChange={(value) => updateTheme("fontSize", value)}
                />
              )}
              {isControlEditable("lineHeight") && (
                <SettingSlider
                  label={THEME_CONTROL_LABELS.lineHeight}
                  value={activeTheme.lineHeight}
                  display={activeTheme.lineHeight.toFixed(1)}
                  min={1.5}
                  max={2.3}
                  step={0.1}
                  onChange={(value) => updateTheme("lineHeight", value)}
                />
              )}
              {isControlEditable("spacing") && (
                <SettingSlider
                  label={THEME_CONTROL_LABELS.spacing}
                  value={activeTheme.spacing}
                  display={`${activeTheme.spacing}px`}
                  min={14}
                  max={36}
                  step={2}
                  onChange={(value) => updateTheme("spacing", value)}
                />
              )}
              {isControlEditable("radius") && (
                <SettingSlider
                  label={THEME_CONTROL_LABELS.radius}
                  value={activeTheme.radius}
                  display={`${activeTheme.radius}px`}
                  min={0}
                  max={20}
                  step={2}
                  onChange={(value) => updateTheme("radius", value)}
                />
              )}
            </section>

            {themeContract.structureNote && (
              <section className="setting-section">
                <h3>模板结构</h3>
                <p className="structure-note">
                  {themeContract.structureNote}
                </p>
              </section>
            )}

            {isControlEditable("headingStyle") && (
              <section className="setting-section">
                <h3>标题造型</h3>
                <div className="choice-grid">
                  {(
                    [
                      ["bar", "竖线"],
                      ["underline", "下划线"],
                      ["label", "标签"],
                    ] as [HeadingStyle, string][]
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant={
                        activeTheme.headingStyle === value
                          ? "secondary"
                          : "outline"
                      }
                      hoverScale={1.015}
                      tapScale={0.98}
                      onClick={() => updateTheme("headingStyle", value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </section>
            )}

            {isControlEditable("fontFamily") && (
              <section className="setting-section">
                <h3>字体气质</h3>
                <div className="choice-grid">
                  {(
                    [
                      ["sans", "现代"],
                      ["serif", "人文"],
                      ["rounded", "圆润"],
                    ] as [FontFamily, string][]
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant={
                        activeTheme.fontFamily === value
                          ? "secondary"
                          : "outline"
                      }
                      hoverScale={1.015}
                      tapScale={0.98}
                      onClick={() => updateTheme("fontFamily", value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <SheetFooter className="sheet-footer">
            <Button
              variant="outline"
              hoverScale={1.015}
              tapScale={0.98}
              onClick={resetTheme}
            >
              恢复模板
            </Button>
            <Button
              hoverScale={1.015}
              tapScale={0.98}
              onClick={saveCustomTheme}
            >
              保存为新模板
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
