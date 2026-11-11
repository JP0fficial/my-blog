// 외부 라이브러리 없이 구현한 마크다운 → HTML 변환기
// 원문은 항상 HTML 이스케이프한 뒤 변환하므로 마크다운 안의 HTML 태그는 글자 그대로 보인다.

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);

// ===== front matter =====

const unquote = (value) => value.replace(/^(['"])(.*)\1$/, '$2');

export const parseFrontMatter = (text) => {
  const source = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const match = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(source);
  if (!match) return { meta: {}, body: source };

  const meta = {};
  for (const line of match[1].split('\n')) {
    const pair = /^([\w-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    const [, key, raw] = pair;
    const value = unquote(raw.trim());
    meta[key] = key === 'tags'
      ? value.replace(/^\[|\]$/g, '').split(',').map((t) => unquote(t.trim())).filter(Boolean)
      : value;
  }
  return { meta, body: source.slice(match[0].length) };
};

// ===== URL 검사 =====

const SAFE_SCHEMES = ['http', 'https', 'mailto'];

const sanitizeUrl = (url) => {
  const compact = url.replace(/[\u0000- ]/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  if (scheme && !SAFE_SCHEMES.includes(scheme[1].toLowerCase())) return '#';
  return compact;
};

const isExternal = (url) => /^https?:\/\//i.test(url);

// ===== 인라인 =====

const applyEmphasis = (text) => text
  .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/g, '<strong>$1</strong>')
  .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<strong>$2</strong>')
  .replace(/\*(?=\S)([\s\S]*?\S)\*/g, '<em>$1</em>')
  .replace(/(^|[^\w])_(?=\S)([\s\S]*?\S)_(?!\w)/g, '$1<em>$2</em>')
  .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');

// 링크 URL과 선택적 "title" (이스케이프 이후 기준)
// URL 안의 괄호는 한 단계까지 허용 (예: 위키백과 주소)
const LINK_TARGET = String.raw`\(\s*([^\s()]*(?:\([^\s()]*\)[^\s()]*)*)(?:\s+&quot;(.*?)&quot;)?\s*\)`;
const IMAGE_RE = new RegExp(String.raw`!\[([^\]]*)\]` + LINK_TARGET, 'g');
const LINK_RE = new RegExp(String.raw`\[([^\]]+)\]` + LINK_TARGET, 'g');
const AUTOLINK_RE = /https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]*_~]/g;

const anchor = (href, label, title) => {
  const safe = sanitizeUrl(href);
  const titleAttr = title ? ` title="${title}"` : '';
  const extra = isExternal(safe) ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a href="${safe}"${titleAttr}${extra}>${label}</a>`;
};

export const renderInline = (source) => {
  const stash = [];
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`;

  let text = source
    // 1. 인라인 코드는 다른 문법보다 먼저 보호
    .replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) => keep(`<code>${escapeHtml(code.trim())}</code>`))
    // 2. 백슬래시 이스케이프 (\* → *)
    .replace(/\\([\\`*_{}[\]()#+\-.!~|>])/g, (_, ch) => keep(escapeHtml(ch)));

  // 3. 나머지 원문 이스케이프
  text = escapeHtml(text);

  // 4. 이미지 → 링크 → 자동 링크 (결과는 보호해 강조 문법이 URL을 건드리지 않게 함)
  text = text
    .replace(IMAGE_RE, (_, alt, src, title) => {
      const titleAttr = title ? ` title="${title}"` : '';
      return keep(`<img src="${sanitizeUrl(src)}" alt="${alt}"${titleAttr} loading="lazy">`);
    })
    .replace(LINK_RE, (_, label, href, title) => keep(anchor(href, applyEmphasis(label), title)))
    .replace(AUTOLINK_RE, (url) => keep(anchor(url, url)));

  // 5. 강조
  text = applyEmphasis(text);

  // 6. 보호해 둔 조각 복원 (중첩된 조각까지)
  while (text.includes('\u0000')) {
    text = text.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]);
  }
  return text;
};

// ===== 블록 =====

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]*)[^`]*$/;
const HEADING_RE = /^ {0,3}(#{1,6})(?:\s+(.*?))?(?:\s+#+)?\s*$/;
const HR_RE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE_RE = /^ {0,3}>/;
const LIST_RE = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

const isBlank = (line) => line.trim() === '';
const isTableStart = (line, next) => line.includes('|') && next !== undefined && TABLE_SEP_RE.test(next) && next.includes('-');

const isBlockStart = (line, next) => FENCE_RE.test(line)
  || HEADING_RE.test(line)
  || HR_RE.test(line)
  || QUOTE_RE.test(line)
  || LIST_RE.test(line)
  || isTableStart(line, next);

const indentOf = (spaces) => spaces.replace(/\t/g, '    ').length;

const slugify = (html) => html
  .replace(/<[^>]+>/g, '')
  .replace(/&[#\w]+;/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^\p{L}\p{N}\s-]/gu, '')
  .replace(/\s+/g, '-') || 'section';

const splitRow = (row) => row
  .trim()
  .replace(/^\|/, '')
  .replace(/(?<!\\)\|$/, '')
  .split(/(?<!\\)\|/)
  .map((cell) => cell.trim());

const renderTable = (rows) => {
  const header = splitRow(rows[0]);
  const aligns = splitRow(rows[1]).map((cell) => {
    if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
    if (cell.endsWith(':')) return 'right';
    if (cell.startsWith(':')) return 'left';
    return '';
  });
  const cell = (tag, text, i) => {
    const style = aligns[i] ? ` style="text-align:${aligns[i]}"` : '';
    return `<${tag}${style}>${renderInline(text ?? '')}</${tag}>`;
  };
  const head = `<tr>${header.map((text, i) => cell('th', text, i)).join('')}</tr>`;
  const body = rows.slice(2).map((row) => {
    const cells = splitRow(row);
    return `<tr>${header.map((_, i) => cell('td', cells[i], i)).join('')}</tr>`;
  }).join('');
  return `<div class="table-wrapper"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
};

const renderListItemText = (text) => {
  const task = /^\[([ xX])\]\s+(.*)$/.exec(text);
  if (!task) return renderInline(text);
  const checked = task[1] !== ' ' ? ' checked' : '';
  return `<input type="checkbox" disabled${checked}> ${renderInline(task[2])}`;
};

// tokens: [{ indent, ordered, start, text }]
const buildList = (tokens, pos) => {
  const level = tokens[pos].indent;
  const { ordered, start } = tokens[pos];
  const open = ordered ? `<ol${start !== 1 ? ` start="${start}"` : ''}>` : '<ul>';
  let html = open;

  while (pos < tokens.length && tokens[pos].indent >= level) {
    const item = tokens[pos];
    pos += 1;
    let inner = renderListItemText(item.text);
    while (pos < tokens.length && tokens[pos].indent >= level + 2) {
      const [child, next] = buildList(tokens, pos);
      inner += child;
      pos = next;
    }
    html += `<li>${inner}</li>`;
  }
  return [html + (ordered ? '</ol>' : '</ul>'), pos];
};

const parseBlocks = (lines, ids) => {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      i += 1;
      continue;
    }

    // 코드 블록
    const fence = FENCE_RE.exec(line);
    if (fence) {
      const marker = fence[1];
      const lang = fence[2].replace(/[^\w+#-]/g, '');
      const code = [];
      i += 1;
      while (i < lines.length && !new RegExp(`^ {0,3}${marker[0]}{${marker.length},}\\s*$`).test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // 닫는 펜스
      const cls = lang ? ` class="language-${lang}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // 제목
    const heading = HEADING_RE.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2] ?? '');
      const base = slugify(content);
      const count = ids.get(base) ?? 0;
      ids.set(base, count + 1);
      const id = count ? `${base}-${count}` : base;
      out.push(`<h${level} id="${id}">${content}</h${level}>`);
      i += 1;
      continue;
    }

    // 수평선
    if (HR_RE.test(line)) {
      out.push('<hr>');
      i += 1;
      continue;
    }

    // 인용문 (내부를 다시 블록으로 해석)
    if (QUOTE_RE.test(line)) {
      const inner = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        inner.push(lines[i].replace(/^ {0,3}> ?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${parseBlocks(inner, ids)}</blockquote>`);
      continue;
    }

    // 표
    if (isTableStart(line, lines[i + 1])) {
      const rows = [];
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes('|')) {
        rows.push(lines[i]);
        i += 1;
      }
      out.push(renderTable(rows));
      continue;
    }

    // 목록
    if (LIST_RE.test(line)) {
      const tokens = [];
      while (i < lines.length) {
        const current = lines[i];
        const item = LIST_RE.exec(current);
        if (item && !HR_RE.test(current)) {
          const marker = item[2];
          const ordered = /\d/.test(marker);
          // 최상위에서 목록 종류(순서 있음/없음)가 바뀌면 새 목록으로 시작
          if (tokens.length && indentOf(item[1]) < tokens[0].indent + 2 && ordered !== tokens[0].ordered) break;
          tokens.push({
            indent: indentOf(item[1]),
            ordered,
            start: ordered ? parseInt(marker, 10) : 1,
            text: item[3],
          });
          i += 1;
        } else if (isBlank(current)) {
          // 빈 줄 다음이 목록 항목이거나 들여쓴 줄이면 목록이 이어진다
          let j = i + 1;
          while (j < lines.length && isBlank(lines[j])) j += 1;
          if (j < lines.length && (LIST_RE.test(lines[j]) || /^\s{2,}\S/.test(lines[j]))) {
            i = j;
          } else {
            break;
          }
        } else if (/^\s{2,}\S/.test(current) || !isBlockStart(current, lines[i + 1])) {
          // 들여쓴 줄 또는 이어지는 문장 → 앞 항목에 붙임
          tokens[tokens.length - 1].text += ` ${current.trim()}`;
          i += 1;
        } else {
          break;
        }
      }
      out.push(buildList(tokens, 0)[0]);
      continue;
    }

    // 문단
    const para = [];
    while (i < lines.length && !isBlank(lines[i]) && (para.length === 0 || !isBlockStart(lines[i], lines[i + 1]))) {
      para.push(lines[i]);
      i += 1;
    }
    const html = para
      .map((text, idx) => {
        const hardBreak = idx < para.length - 1 && / {2,}$/.test(text);
        return renderInline(text.trim()) + (hardBreak ? '<br>' : '');
      })
      .join('\n');
    out.push(`<p>${html}</p>`);
  }

  return out.join('\n');
};

export const markdownToHtml = (markdown) => {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  return parseBlocks(lines, new Map());
};
