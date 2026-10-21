// 把 src/*.md 轉成 docs/ 底下的靜態頁，給 GitHub Pages（main 分支 /docs）直接服務。
// site.json 的 pages 列出各頁（slug 為空字串的是首頁）；沒有 pages 時只轉 src/framework.md。
// 用法：npm install && npm run build
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { Marked } from "marked";

const root = dirname(fileURLToPath(import.meta.url));
const site = JSON.parse(readFileSync(join(root, "site.json"), "utf8"));
// CSS 網址帶內容雜湊，樣式改了瀏覽器就會抓新檔，不受 GitHub Pages 10 分鐘快取影響
const cssVer = createHash("sha256").update(readFileSync(join(root, "style.css"))).digest("hex").slice(0, 8);


const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const strip = (html) => html.replace(/<[^>]+>/g, "");

// 證據標記 [F] [E] [I] [H] [F→I] [F：…] → 小標籤；只動文字節點，不碰 <code>/<pre>
function tagEvidence(html) {
  const re = /\[(F|E|I|H)(?:(→|\/|／)(F|E|I|H))?(：[^\]<]*)?\]/g;
  return html
    .split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<[^>]+>)/g)
    .map((part) =>
      part.startsWith("<")
        ? part
        : part.replace(re, (m, a, _sep, b) => `<span class="tag ${b || a}">${m.slice(1, -1)}</span>`)
    )
    .join("");
}

function render(md) {
  const toc = [];
  const used = new Map();
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading(text, level, raw) {
        const base = raw.replace(/[`*_]/g, "").trim().toLowerCase().replace(/[\s：:、，,（）()／/.]+/g, "-").replace(/^-|-$/g, "") || "s";
        const n = used.get(base) || 0;
        used.set(base, n + 1);
        const id = n ? `${base}-${n}` : base;
        if (level === 2) toc.push({ id, text: strip(text) });
        return `<h${level} id="${esc(id)}">${text}</h${level}>\n`;
      },
      link(href, title, text) {
        const to = href;
        const ext = /^https?:/.test(to) ? ' target="_blank" rel="noopener"' : "";
        return `<a href="${esc(to)}"${title ? ` title="${esc(title)}"` : ""}${ext}>${text}</a>`;
      },
      table(header, body) {
        return `<div class="tbl"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`;
      },
    },
  });
  // 連續的引言行各自成一行（原始檔把版本、依據、標記說明寫成相鄰的 > 行）
  md = md.replace(/^(>[^\n]*\S)\n(?=>\s*\S)/gm, "$1  \n");
  // 第一個 h1 拿出來當頁首
  const m = md.match(/^# (.+)$/m);
  const title = m ? m[1].trim() : "";
  const body = tagEvidence(marked.parse(m ? md.replace(m[0], "") : md));
  return { title, body, toc };
}

const pages = site.pages || [{ file: "framework.md", slug: "", label: site.short, eyebrow: site.eyebrow }];

function page({ title, body, toc, current }) {
  const up = current ? "../" : "./";
  const own = pages.length > 1
    ? pages.map((p) => `<a href="${up}${p.slug ? p.slug + "/" : ""}"${p.slug === current ? ' aria-current="page"' : ""}>${esc(p.label)}</a>`).join("")
    : "";
  const related = (site.related || [])
    .map((r, i) => `<a${i === 0 ? ' class="cta"' : ""} href="${esc(r.url)}">${esc(r.label)}</a>`)
    .join("");
  const tocHtml = `<nav class="toc" aria-label="本頁目錄"><ol>${toc.map((t) => `<li><a href="#${esc(t.id)}">${esc(t.text)}</a></li>`).join("")}</ol></nav>`;
  return `<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(site.description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Raleway:wght@600;700;800&family=Noto+Sans+TC:wght@400;500;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap">
<link rel="stylesheet" href="${up}assets/style.css?v=${cssVer}">
</head>
<body>
<header class="bar"><a class="home" href="${up}">${esc(site.short)}</a><span class="links">${own}${related}</span></header>
<div class="shell">
${tocHtml}
<main>
${body}
<footer>${site.footer}</footer>
</main>
</div>
</body>
</html>
`;
}

const out = join(root, "docs");
mkdirSync(join(out, "assets"), { recursive: true });
copyFileSync(join(root, "style.css"), join(out, "assets", "style.css"));
writeFileSync(join(out, ".nojekyll"), "");

const legend = `<div class="legend">證據標記：<span class="tag F">F</span> 事實 <span class="tag E">E</span> 專家或機構主張 <span class="tag I">I</span> 推論 <span class="tag H">H</span> 未查證</div>`;
for (const p of pages) {
  const { title, body, toc } = render(readFileSync(join(root, "src", p.file), "utf8"));
  const head = `<header class="doc"><div class="eyebrow">${esc(p.eyebrow || site.eyebrow)}</div><h1>${esc(title)}</h1>${legend}</header>\n`;
  const dir = p.slug ? join(out, p.slug) : out;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page({ title, body: head + body, toc, current: p.slug }));
  console.log(`docs/${p.slug ? p.slug + "/" : ""}index.html  ←  src/${p.file}`);
}
