const STORAGE_KEY = "paibanjian-document-v1";
const CUSTOM_THEMES_KEY = "paibanjian-custom-themes-v1";

const defaultMarkdown = `# 让文字，拥有自己的呼吸

> 好的排版不是装饰，而是让读者更自然地走进内容。

这是一个为微信公众号准备的 **Markdown 排版工具**。你只需要专注写作，剩下的交给模板。

## 从 Markdown 开始

把熟悉的 Markdown 粘贴到左侧，右边会实时呈现最终效果。复制后，标题、引用、列表和代码样式都会一起进入公众号编辑器。

### 一套简单的写作流程

1. 写下文章，不被样式打断
2. 选择符合内容气质的模板
3. 调整品牌色与字号
4. 一键复制到公众号后台

## 让重点被看见

你可以使用 **粗体强调关键信息**，也可以插入[延伸阅读](https://example.com)。

- 短句适合制造节奏
- 列表适合梳理信息
- 留白适合给观点一点时间

---

\`\`\`js
const idea = "好内容";
const layout = "好阅读";
console.log(idea + " × " + layout);
\`\`\`

| 模板 | 气质 | 适合内容 |
| --- | --- | --- |
| 墨印 | 克制、人文 | 随笔与深度文章 |
| 窗纸 | 明快、清新 | 生活方式与品牌 |
| 电波 | 利落、理性 | 科技与知识分享 |

> 现在，试着替换这些文字，写下你的第一篇文章。`;

const themes = {
  ink: {
    id: "ink",
    name: "墨印",
    description: "人文 · 克制",
    accent: "#b5452f",
    text: "#302f2b",
    paper: "#fffef9",
    quote: "#f2eee5",
    code: "#292925",
    fontSize: 16,
    lineHeight: 1.95,
    spacing: 24,
    radius: 2,
    headingStyle: "bar",
    fontFamily: "serif"
  },
  window: {
    id: "window",
    name: "窗纸",
    description: "清新 · 松弛",
    accent: "#21856f",
    text: "#263633",
    paper: "#fbfffc",
    quote: "#eaf5f0",
    code: "#213631",
    fontSize: 16,
    lineHeight: 1.9,
    spacing: 26,
    radius: 12,
    headingStyle: "label",
    fontFamily: "sans"
  },
  signal: {
    id: "signal",
    name: "电波",
    description: "理性 · 醒目",
    accent: "#e06629",
    text: "#202329",
    paper: "#fffdfa",
    quote: "#f6eee7",
    code: "#202329",
    fontSize: 15,
    lineHeight: 1.85,
    spacing: 22,
    radius: 0,
    headingStyle: "underline",
    fontFamily: "sans"
  }
};

const elements = {
  markdown: document.querySelector("#markdownInput"),
  preview: document.querySelector("#articlePreview"),
  html: document.querySelector("#htmlPreview code"),
  title: document.querySelector("#documentTitle"),
  wordCount: document.querySelector("#wordCount"),
  readTime: document.querySelector("#readTime"),
  savedLabel: document.querySelector("#savedLabel"),
  templateList: document.querySelector("#templateList"),
  templateCount: document.querySelector("#templateCount"),
  customizer: document.querySelector("#customizer"),
  toast: document.querySelector("#toast")
};

let selectedThemeId = "ink";
let activeTheme = structuredClone(themes.ink);
let saveTimer;
let toastTimer;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value) {
  const trimmed = value.trim();
  if (/^(https?:\/\/|mailto:|tel:|#)/i.test(trimmed)) return escapeHtml(trimmed);
  return "#";
}

function parseInline(source) {
  let value = escapeHtml(source);
  const tokens = [];

  const stash = (html) => {
    const index = tokens.push(html) - 1;
    return `\u0000${index}\u0000`;
  };

  value = value.replace(/`([^`\n]+)`/g, (_, code) =>
    stash(`<code data-inline="true">${code}</code>`)
  );
  value = value.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_, alt, url) => stash(`<img src="${safeUrl(url)}" alt="${alt}" />`)
  );
  value = value.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_, label, url) => stash(`<a href="${safeUrl(url)}">${label}</a>`)
  );
  value = value.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
  value = value.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
  value = value.replace(/(^|[^\*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  value = value.replace(/ {2}$/g, "<br />");
  value = value.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
  return value;
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const output = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];
  let inCode = false;
  let codeLanguage = "";
  let codeLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${parseInline(paragraph.join("\n").replace(/\n/g, " "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType) return;
    output.push(
      `<${listType}>${listItems.map((item) => `<li>${parseInline(item)}</li>`).join("")}</${listType}>`
    );
    listType = null;
    listItems = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (inCode) {
      if (/^```/.test(line)) {
        output.push(
          `<pre data-language="${escapeHtml(codeLanguage || "text")}"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`
        );
        inCode = false;
        codeLanguage = "";
        codeLines = [];
      } else {
        codeLines.push(line);
      }
      continue;
    }

    const codeStart = line.match(/^```\s*([\w-]*)/);
    if (codeStart) {
      flushParagraph();
      flushList();
      inCode = true;
      codeLanguage = codeStart[1];
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (
      line.includes("|") &&
      lines[index + 1] &&
      /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])
    ) {
      flushParagraph();
      flushList();
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      output.push(
        `<table><thead><tr>${headers.map((cell) => `<th>${parseInline(cell)}</th>`).join("")}</tr></thead>` +
          `<tbody>${rows
            .map(
              (row) =>
                `<tr>${headers.map((_, cellIndex) => `<td>${parseInline(row[cellIndex] || "")}</td>`).join("")}</tr>`
            )
            .join("")}</tbody></table>`
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length, 4);
      output.push(`<h${level}>${parseInline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      flushParagraph();
      flushList();
      output.push("<hr />");
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      const quoteLines = [quote[1]];
      while (index + 1 < lines.length && /^>\s?/.test(lines[index + 1])) {
        index += 1;
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
      }
      output.push(`<blockquote>${parseInline(quoteLines.join("<br />"))}</blockquote>`);
      continue;
    }

    const unordered = line.match(/^\s*[-+*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((unordered || ordered)[1]);
      continue;
    }

    paragraph.push(line);
  }

  if (inCode) {
    output.push(`<pre data-language="${escapeHtml(codeLanguage || "text")}"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  flushParagraph();
  flushList();
  return output.join("");
}

function fontStack(theme) {
  return theme.fontFamily === "serif"
    ? '"Songti SC","STSong","Noto Serif CJK SC",serif'
    : '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
}

function buildStyles(theme) {
  const family = fontStack(theme);
  const h2Base = [
    `margin:2.2em 0 1em`,
    `color:${theme.text}`,
    `font-family:${family}`,
    `font-size:${theme.fontSize + 5}px`,
    "line-height:1.45",
    "font-weight:700"
  ];

  let h2Style = "";
  if (theme.headingStyle === "bar") {
    h2Style = [...h2Base, `padding-left:12px`, `border-left:4px solid ${theme.accent}`].join(";");
  } else if (theme.headingStyle === "underline") {
    h2Style = [
      ...h2Base,
      "padding-bottom:9px",
      `border-bottom:2px solid ${theme.accent}`
    ].join(";");
  } else {
    h2Style = [
      ...h2Base,
      "display:table",
      "padding:5px 11px",
      `color:${theme.paper}`,
      `background:${theme.accent}`,
      `border-radius:${theme.radius}px`
    ].join(";");
  }

  return {
    root: `padding:${theme.spacing + 8}px ${theme.spacing}px 54px;color:${theme.text};background:${theme.paper};font-family:${family};font-size:${theme.fontSize}px;line-height:${theme.lineHeight};word-break:break-word`,
    h1: `margin:0 0 0.65em;color:${theme.text};font-family:${family};font-size:${theme.fontSize + 12}px;line-height:1.35;letter-spacing:0.03em;font-weight:700`,
    h2: h2Style,
    h3: `margin:2em 0 0.8em;color:${theme.accent};font-family:${family};font-size:${theme.fontSize + 2}px;line-height:1.5;font-weight:700`,
    h4: `margin:1.6em 0 0.7em;color:${theme.text};font-size:${theme.fontSize}px;line-height:1.5;font-weight:700`,
    p: `margin:0 0 1.25em;color:${theme.text};font-size:${theme.fontSize}px;line-height:${theme.lineHeight};letter-spacing:0.035em;text-align:justify`,
    strong: `color:${theme.accent};font-weight:700`,
    em: "font-style:italic",
    del: "opacity:0.55",
    a: `color:${theme.accent};text-decoration:none;border-bottom:1px solid ${theme.accent}`,
    blockquote: `margin:1.6em 0;padding:16px 18px;color:${theme.text};background:${theme.quote};border-radius:${theme.radius}px;border-left:3px solid ${theme.accent};font-size:${theme.fontSize - 1}px;line-height:${theme.lineHeight}`,
    ul: `margin:0 0 1.4em;padding-left:1.4em;color:${theme.text}`,
    ol: `margin:0 0 1.4em;padding-left:1.4em;color:${theme.text}`,
    li: `margin:0.45em 0;padding-left:0.25em;line-height:${theme.lineHeight}`,
    hr: `height:1px;margin:2.4em auto;border:0;background:${theme.accent};opacity:0.35`,
    pre: `margin:1.6em 0;padding:18px;overflow-x:auto;color:#f3efe5;background:${theme.code};border-radius:${theme.radius}px;font-family:Menlo,Consolas,monospace;font-size:12px;line-height:1.75;white-space:pre-wrap;word-break:break-all`,
    inlineCode: `margin:0 3px;padding:2px 5px;color:${theme.accent};background:${theme.quote};border-radius:3px;font-family:Menlo,Consolas,monospace;font-size:0.88em`,
    img: `display:block;max-width:100%;height:auto;margin:1.8em auto;border-radius:${theme.radius}px`,
    table: `width:100%;margin:1.8em 0;border-collapse:collapse;color:${theme.text};font-size:${theme.fontSize - 2}px;line-height:1.6`,
    th: `padding:9px 8px;border:1px solid ${theme.accent};color:${theme.paper};background:${theme.accent};font-weight:700;text-align:left`,
    td: `padding:9px 8px;border:1px solid ${theme.accent}55;text-align:left`
  };
}

function inlineDocument(html, theme) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<section>${html}</section>`, "text/html");
  const root = doc.querySelector("section");
  const styles = buildStyles(theme);
  root.setAttribute("style", styles.root);

  const selectorStyles = {
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
    hr: styles.hr,
    pre: styles.pre,
    img: styles.img,
    table: styles.table,
    th: styles.th,
    td: styles.td
  };

  Object.entries(selectorStyles).forEach(([selector, style]) => {
    root.querySelectorAll(selector).forEach((node) => node.setAttribute("style", style));
  });
  root.querySelectorAll('code[data-inline="true"]').forEach((node) => {
    node.setAttribute("style", styles.inlineCode);
    node.removeAttribute("data-inline");
  });
  root.querySelectorAll("pre").forEach((node) => node.removeAttribute("data-language"));
  root.querySelectorAll("a").forEach((node) => node.setAttribute("target", "_blank"));
  return root.outerHTML;
}

function getAllThemes() {
  const custom = JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY) || "[]");
  return { ...themes, ...Object.fromEntries(custom.map((theme) => [theme.id, theme])) };
}

function renderTemplateList() {
  const allThemes = getAllThemes();
  const items = Object.values(allThemes);
  elements.templateCount.textContent = String(items.length).padStart(2, "0");
  elements.templateList.innerHTML = items
    .map(
      (theme) => `
        <button class="template-card ${theme.id === selectedThemeId ? "active" : ""}" data-theme="${theme.id}" type="button">
          <span class="template-swatch" style="--swatch-paper:${theme.paper};--swatch-accent:${theme.accent};--swatch-ink:${theme.text}"></span>
          <span class="template-meta">
            <strong>${escapeHtml(theme.name)}</strong>
            <small>${escapeHtml(theme.description)}</small>
          </span>
          <span class="template-check">✓</span>
        </button>`
    )
    .join("");
}

function updatePreview() {
  const rawHtml = markdownToHtml(elements.markdown.value);
  const finalHtml = inlineDocument(rawHtml, activeTheme);
  elements.preview.innerHTML = finalHtml;
  elements.html.textContent = finalHtml;

  const text = elements.markdown.value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_~`|[\]()!-]/g, "")
    .replace(/\s+/g, "");
  elements.wordCount.textContent = `${text.length} 字`;
  elements.readTime.textContent = `约 ${Math.max(1, Math.ceil(text.length / 400))} 分钟`;
  scheduleSave();
}

function scheduleSave() {
  elements.savedLabel.textContent = "保存中…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        markdown: elements.markdown.value,
        title: elements.title.value,
        selectedThemeId,
        activeTheme
      })
    );
    elements.savedLabel.textContent = "已自动保存";
  }, 350);
}

function loadDocument() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved) {
      elements.markdown.value = saved.markdown || defaultMarkdown;
      elements.title.value = saved.title || "未命名文章";
      const allThemes = getAllThemes();
      selectedThemeId = allThemes[saved.selectedThemeId] ? saved.selectedThemeId : "ink";
      activeTheme = saved.activeTheme || structuredClone(allThemes[selectedThemeId]);
      return;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  elements.markdown.value = defaultMarkdown;
}

function selectTheme(id) {
  const theme = getAllThemes()[id];
  if (!theme) return;
  selectedThemeId = id;
  activeTheme = structuredClone(theme);
  renderTemplateList();
  syncCustomizer();
  updatePreview();
}

function syncCustomizer() {
  const map = {
    accentColor: activeTheme.accent,
    textColor: activeTheme.text,
    paperColor: activeTheme.paper,
    fontSize: activeTheme.fontSize,
    lineHeight: activeTheme.lineHeight,
    spacing: activeTheme.spacing,
    radius: activeTheme.radius
  };
  Object.entries(map).forEach(([id, value]) => {
    document.querySelector(`#${id}`).value = value;
  });
  updateCustomizerOutputs();
  document.querySelectorAll("[data-heading-style]").forEach((button) => {
    button.classList.toggle("active", button.dataset.headingStyle === activeTheme.headingStyle);
  });
  document.querySelectorAll("[data-font-family]").forEach((button) => {
    button.classList.toggle("active", button.dataset.fontFamily === activeTheme.fontFamily);
  });
}

function updateCustomizerOutputs() {
  document.querySelector("#fontSizeOutput").textContent = `${activeTheme.fontSize}px`;
  document.querySelector("#lineHeightOutput").textContent = activeTheme.lineHeight;
  document.querySelector("#spacingOutput").textContent = `${activeTheme.spacing}px`;
  document.querySelector("#radiusOutput").textContent = `${activeTheme.radius}px`;
}

function showToast(title = "已复制富文本", subtitle = "现在去公众号编辑器粘贴吧") {
  elements.toast.querySelector("strong").textContent = title;
  elements.toast.querySelector("small").textContent = subtitle;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

async function copyToClipboard() {
  const html = elements.preview.innerHTML;
  const plain = elements.preview.innerText;
  try {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" })
        })
      ]);
    } else {
      const temporary = document.createElement("div");
      temporary.contentEditable = "true";
      temporary.style.position = "fixed";
      temporary.style.left = "-9999px";
      temporary.innerHTML = html;
      document.body.appendChild(temporary);
      const range = document.createRange();
      range.selectNodeContents(temporary);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("copy");
      temporary.remove();
      selection.removeAllRanges();
    }
    showToast();
  } catch {
    showToast("复制失败", "请在 HTML 模式中手动复制");
  }
}

function insertMarkdown(type) {
  const textarea = elements.markdown;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const presets = {
    heading: [`## ${selected || "小标题"}`, 3, selected ? 0 : 3],
    bold: [`**${selected || "重点内容"}**`, 2, selected ? 0 : 4],
    quote: [`> ${selected || "引用内容"}`, 2, selected ? 0 : 4],
    link: [`[${selected || "链接文字"}](https://example.com)`, 1, selected ? 0 : 4],
    list: [`- ${selected || "列表项目"}`, 2, selected ? 0 : 4],
    code: [`\`\`\`js\n${selected || "const hello = 'world';"}\n\`\`\``, 6, selected ? 0 : 22]
  };
  const [replacement, cursorStart, cursorEndOffset] = presets[type];
  textarea.setRangeText(replacement, start, end, "end");
  if (!selected) {
    textarea.setSelectionRange(start + cursorStart, start + replacement.length - cursorEndOffset);
  }
  textarea.focus();
  updatePreview();
}

function downloadMarkdown() {
  const blob = new Blob([elements.markdown.value], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${elements.title.value.trim() || "未命名文章"}.md`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function openCustomizer() {
  syncCustomizer();
  elements.customizer.classList.add("open");
  elements.customizer.setAttribute("aria-hidden", "false");
}

function closeCustomizer() {
  elements.customizer.classList.remove("open");
  elements.customizer.setAttribute("aria-hidden", "true");
}

function saveCustomTheme() {
  const customThemes = JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY) || "[]");
  const id = `custom-${Date.now()}`;
  const customTheme = {
    ...activeTheme,
    id,
    name: `我的版式 ${customThemes.length + 1}`,
    description: "自定义 · 已保存"
  };
  customThemes.push(customTheme);
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes));
  selectedThemeId = id;
  activeTheme = structuredClone(customTheme);
  renderTemplateList();
  updatePreview();
  closeCustomizer();
  showToast("模板已保存", "已加入左侧模板列表");
}

elements.markdown.addEventListener("input", updatePreview);
elements.title.addEventListener("input", scheduleSave);
document.querySelector("#copyButton").addEventListener("click", copyToClipboard);
document.querySelector("#downloadButton").addEventListener("click", downloadMarkdown);
document.querySelector("#customizeTrigger").addEventListener("click", openCustomizer);
document.querySelector("#saveCustomTheme").addEventListener("click", saveCustomTheme);

document.querySelector("#clearButton").addEventListener("click", () => {
  if (!window.confirm("新建文章会清空当前编辑区，已保存的模板不会受影响。继续吗？")) return;
  elements.markdown.value = "# 新文章\n\n从这里开始写作……";
  elements.title.value = "未命名文章";
  updatePreview();
});

document.querySelectorAll("[data-close-customizer]").forEach((element) => {
  element.addEventListener("click", closeCustomizer);
});

document.querySelectorAll("[data-insert]").forEach((button) => {
  button.addEventListener("click", () => insertMarkdown(button.dataset.insert));
});

elements.templateList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-theme]");
  if (card) selectTheme(card.dataset.theme);
});

document.querySelectorAll("[data-preview-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.previewMode;
    document.querySelectorAll("[data-preview-mode]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    elements.preview.hidden = mode !== "visual";
    document.querySelector("#htmlPreview").hidden = mode !== "html";
    document.querySelector(".phone-ruler").hidden = mode === "html";
  });
});

document.querySelectorAll("[data-mobile-view]").forEach((button) => {
  if (!button.closest(".mobile-tabs")) return;
  button.addEventListener("click", () => {
    document.querySelectorAll(".mobile-tabs button").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    document.querySelector(".workspace").dataset.mobileView = button.dataset.mobileView;
  });
});

const liveControls = [
  ["accentColor", "accent", (value) => value],
  ["textColor", "text", (value) => value],
  ["paperColor", "paper", (value) => value],
  ["fontSize", "fontSize", Number],
  ["lineHeight", "lineHeight", Number],
  ["spacing", "spacing", Number],
  ["radius", "radius", Number]
];

liveControls.forEach(([id, property, transform]) => {
  document.querySelector(`#${id}`).addEventListener("input", (event) => {
    activeTheme[property] = transform(event.target.value);
    updateCustomizerOutputs();
    updatePreview();
  });
});

document.querySelector("#headingStyle").addEventListener("click", (event) => {
  const button = event.target.closest("[data-heading-style]");
  if (!button) return;
  activeTheme.headingStyle = button.dataset.headingStyle;
  syncCustomizer();
  updatePreview();
});

document.querySelector("#fontFamily").addEventListener("click", (event) => {
  const button = event.target.closest("[data-font-family]");
  if (!button) return;
  activeTheme.fontFamily = button.dataset.fontFamily;
  syncCustomizer();
  updatePreview();
});

document.querySelector("#resetTheme").addEventListener("click", () => {
  const original = getAllThemes()[selectedThemeId] || themes.ink;
  activeTheme = structuredClone(original);
  syncCustomizer();
  updatePreview();
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    copyToClipboard();
  }
  if (event.key === "Escape") closeCustomizer();
});

loadDocument();
renderTemplateList();
syncCustomizer();
updatePreview();
