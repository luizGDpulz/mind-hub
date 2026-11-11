import type { MindPage, TiptapDoc, TiptapNode } from './types.js';

const CALLOUT_ICONS: Record<string, string> = {
  NOTE: 'ℹ️',
  TIP: '💡',
  IMPORTANT: '📌',
  WARNING: '⚠️',
  CAUTION: '🛑',
  INFO: 'ℹ️',
  TODO: '📝',
  SUMMARY: '📋',
  ABSTRACT: '📋',
  EXAMPLE: '🧪',
  QUESTION: '❓',
  QUOTE: '💬',
  SUCCESS: '✅',
  BUG: '🐛',
  DANGER: '🚨',
};

interface ParseState {
  lines: string[];
  index: number;
}

function peek(state: ParseState): string {
  return state.lines[state.index] ?? '';
}

function advance(state: ParseState): string {
  const line = state.lines[state.index] ?? '';
  state.index += 1;
  return line;
}

function isEmpty(line: string): boolean {
  return line.trim() === '';
}

export function parseInline(text: string): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  let current = '';
  let i = 0;

  const flushText = (): void => {
    if (current.length > 0) {
      nodes.push({ type: 'text', text: current });
      current = '';
    }
  };

  while (i < text.length) {
    const ch = text[i];

    if (ch === '*' && i + 1 < text.length && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1 && end > i + 2) {
        flushText();
        nodes.push({
          type: 'text',
          text: text.slice(i + 2, end),
          marks: [{ type: 'bold' }],
        });
        i = end + 2;
        continue;
      }
    }

    if (ch === '*' && (i === 0 || text[i - 1] !== '\\')) {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && end > i + 1) {
        flushText();
        nodes.push({
          type: 'text',
          text: text.slice(i + 1, end),
          marks: [{ type: 'italic' }],
        });
        i = end + 1;
        continue;
      }
    }

    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1 && end > i + 1) {
        flushText();
        nodes.push({
          type: 'text',
          text: text.slice(i + 1, end),
          marks: [{ type: 'code' }],
        });
        i = end + 1;
        continue;
      }
    }

    if (ch === '~' && i + 1 < text.length && text[i + 1] === '~') {
      const end = text.indexOf('~~', i + 2);
      if (end !== -1 && end > i + 2) {
        flushText();
        nodes.push({
          type: 'text',
          text: text.slice(i + 2, end),
          marks: [{ type: 'strike' }],
        });
        i = end + 2;
        continue;
      }
    }

    if (ch === '[') {
      const bracketEnd = text.indexOf(']', i + 1);
      if (bracketEnd !== -1 && text[bracketEnd + 1] === '(') {
        const parenEnd = text.indexOf(')', bracketEnd + 2);
        if (parenEnd !== -1) {
          flushText();
          const linkText = text.slice(i + 1, bracketEnd);
          const url = text.slice(bracketEnd + 2, parenEnd);
          nodes.push({
            type: 'text',
            text: linkText,
            marks: [{ type: 'link', attrs: { href: url } }],
          });
          i = parenEnd + 1;
          continue;
        }
      }
    }

    current += ch ?? '';
    i += 1;
  }

  flushText();
  return nodes;
}

function isSpecialBlockStart(trimmed: string): boolean {
  return (
    /^#{1,6}\s+/.test(trimmed) ||
    trimmed === '---' ||
    trimmed === '***' ||
    trimmed === '___' ||
    trimmed.startsWith('```') ||
    trimmed.startsWith('> ') ||
    trimmed === '>' ||
    /^-\s+\[[ xX]\]\s+/.test(trimmed) ||
    trimmed.startsWith('- ') ||
    trimmed.startsWith('* ') ||
    (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2)
  );
}

function parseBlock(state: ParseState): TiptapNode | null {
  while (state.index < state.lines.length && isEmpty(peek(state))) {
    advance(state);
  }
  if (state.index >= state.lines.length) {
    return null;
  }

  const line = peek(state);
  const trimmed = line.trimStart();

  const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
  if (headingMatch) {
    const hashes = headingMatch[1] ?? '#';
    const text = (headingMatch[2] ?? '').trim();
    advance(state);
    return {
      type: 'heading',
      attrs: { level: Math.min(hashes.length, 3) },
      content: parseInline(text),
    };
  }

  if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
    advance(state);
    return { type: 'horizontalRule' };
  }

  if (trimmed.startsWith('```')) {
    const lang = trimmed.slice(3).trim();
    advance(state);
    const codeLines: string[] = [];
    while (state.index < state.lines.length) {
      const currentLine = peek(state);
      if (currentLine.trimStart().startsWith('```')) {
        advance(state);
        break;
      }
      codeLines.push(currentLine);
      advance(state);
    }
    const codeContent = codeLines.join('\n');
    return {
      type: 'codeBlock',
      attrs: { language: lang.length > 0 ? lang : 'typescript' },
      content: codeContent.length > 0 ? [{ type: 'text', text: codeContent }] : [],
    };
  }

  if (trimmed.startsWith('> ') || trimmed === '>') {
    const quoteLines: string[] = [];
    while (state.index < state.lines.length) {
      const currentTrimmed = peek(state).trimStart();
      if (currentTrimmed.startsWith('> ')) {
        quoteLines.push(currentTrimmed.slice(2));
        advance(state);
      } else if (currentTrimmed === '>') {
        quoteLines.push('');
        advance(state);
      } else {
        break;
      }
    }

    if (quoteLines.length > 0 && quoteLines[0]) {
      const calloutMatch = /^\[!([A-Za-z]+)\][-+]?\s*(.*)$/.exec(quoteLines[0].trim());
      if (calloutMatch) {
        const kind = (calloutMatch[1] ?? 'NOTE').toUpperCase();
        const icon = CALLOUT_ICONS[kind] ?? 'ℹ️';
        const rest = (calloutMatch[2] ?? '').trim();
        quoteLines[0] = rest ? `${icon} **[${kind}]** ${rest}` : `${icon} **[${kind}]**`;
      }
    }

    return {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: parseInline(quoteLines.join(' ').trim()),
        },
      ],
    };
  }

  if (/^-\s+\[[ xX]\]\s+/.test(trimmed)) {
    const taskItems: TiptapNode[] = [];
    while (state.index < state.lines.length) {
      const currentTrimmed = peek(state).trimStart();
      const match = currentTrimmed.match(/^-\s+\[([ xX])\]\s+(.*)$/);
      if (!match) break;
      const checked = (match[1] ?? ' ').toLowerCase() === 'x';
      const itemText = (match[2] ?? '').trim();
      taskItems.push({
        type: 'taskItem',
        attrs: { checked },
        content: [{ type: 'paragraph', content: parseInline(itemText) }],
      });
      advance(state);
    }
    return {
      type: 'taskList',
      content: taskItems,
    };
  }

  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    const listItems: TiptapNode[] = [];
    while (state.index < state.lines.length) {
      const currentTrimmed = peek(state).trimStart();
      if (
        (!currentTrimmed.startsWith('- ') && !currentTrimmed.startsWith('* ')) ||
        /^-\s+\[[ xX]\]\s+/.test(currentTrimmed)
      ) {
        break;
      }
      const itemText = currentTrimmed.slice(2).trim();
      listItems.push({
        type: 'listItem',
        content: [{ type: 'paragraph', content: parseInline(itemText) }],
      });
      advance(state);
    }
    return {
      type: 'bulletList',
      content: listItems,
    };
  }

  if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
    const rows: TiptapNode[] = [];
    let isFirstRow = true;
    while (state.index < state.lines.length) {
      const currentTrimmed = peek(state).trim();
      if (!currentTrimmed.startsWith('|') || !currentTrimmed.endsWith('|')) {
        break;
      }
      advance(state);
      const rawCells = currentTrimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      const isSeparatorRow = rawCells.every((c) => /^:?-+:?$/.test(c));
      if (isSeparatorRow) {
        continue;
      }

      const cellType = isFirstRow ? 'tableHeader' : 'tableCell';
      rows.push({
        type: 'tableRow',
        content: rawCells.map((cellText) => ({
          type: cellType,
          content: [{ type: 'paragraph', content: parseInline(cellText) }],
        })),
      });
      isFirstRow = false;
    }
    return {
      type: 'table',
      content: rows,
    };
  }

  const paragraphLines: string[] = [];
  while (state.index < state.lines.length) {
    const currentLine = peek(state);
    if (isEmpty(currentLine)) break;
    const currentTrimmed = currentLine.trimStart();
    if (paragraphLines.length > 0 && isSpecialBlockStart(currentTrimmed)) {
      break;
    }
    paragraphLines.push(currentLine.trim());
    advance(state);
  }

  const paragraphText = paragraphLines.join(' ').trim();
  if (paragraphText.length === 0) {
    return null;
  }

  return {
    type: 'paragraph',
    content: parseInline(paragraphText),
  };
}

export function markdownToTiptap(markdown: string): TiptapDoc {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const state: ParseState = { lines, index: 0 };
  const content: TiptapNode[] = [];

  while (state.index < state.lines.length) {
    const node = parseBlock(state);
    if (node) {
      content.push(node);
    }
  }

  if (content.length === 0) {
    content.push({ type: 'paragraph', content: [] });
  }

  return { type: 'doc', content };
}

function serializeInline(nodes: ReadonlyArray<TiptapNode>): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') {
        let text = node.text ?? '';
        const marks = node.marks ?? [];
        for (const mark of marks) {
          switch (mark.type) {
            case 'bold':
              text = `**${text}**`;
              break;
            case 'italic':
              text = `*${text}*`;
              break;
            case 'code':
              text = `\`${text}\``;
              break;
            case 'strike':
              text = `~~${text}~~`;
              break;
            case 'link': {
              const href = String(mark.attrs?.href ?? '');
              text = `[${text}](${href})`;
              break;
            }
          }
        }
        return text;
      }
      if (node.content) {
        return serializeInline(node.content);
      }
      return '';
    })
    .join('');
}

function serializeNode(node: TiptapNode): string {
  switch (node.type) {
    case 'heading': {
      const rawLevel = Number(node.attrs?.level ?? 1);
      const level = Math.max(1, Math.min(3, Number.isFinite(rawLevel) ? rawLevel : 1));
      const prefix = '#'.repeat(level);
      return `${prefix} ${serializeInline(node.content ?? [])}`;
    }
    case 'paragraph':
      return serializeInline(node.content ?? []);
    case 'bulletList':
      return (node.content ?? []).map((item) => serializeNode(item)).join('\n');
    case 'listItem': {
      const inner = (node.content ?? [])
        .map((child) =>
          child.type === 'paragraph' ? serializeInline(child.content ?? []) : serializeNode(child),
        )
        .join(' ');
      return `- ${inner}`;
    }
    case 'taskList':
      return (node.content ?? []).map((item) => serializeNode(item)).join('\n');
    case 'taskItem': {
      const checked = node.attrs?.checked ? 'x' : ' ';
      const inner = (node.content ?? [])
        .map((child) =>
          child.type === 'paragraph' ? serializeInline(child.content ?? []) : serializeNode(child),
        )
        .join(' ');
      return `- [${checked}] ${inner}`;
    }
    case 'codeBlock': {
      const lang = String(node.attrs?.language ?? '');
      const code = (node.content ?? []).map((c) => c.text ?? '').join('');
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }
    case 'blockquote': {
      const inner = (node.content ?? [])
        .map((child) =>
          child.type === 'paragraph' ? serializeInline(child.content ?? []) : serializeNode(child),
        )
        .join('\n');
      return inner
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n');
    }
    case 'horizontalRule':
      return '---';
    case 'table': {
      const rows = node.content ?? [];
      const lines: string[] = [];
      rows.forEach((row, rowIndex) => {
        const cells = (row.content ?? []).map((cell) => {
          const text = (cell.content ?? [])
            .map((p) => (p.type === 'paragraph' ? serializeInline(p.content ?? []) : serializeNode(p)))
            .join(' ');
          return text.trim();
        });
        lines.push(`| ${cells.join(' | ')} |`);
        if (rowIndex === 0) {
          lines.push(`| ${cells.map(() => '---').join(' | ')} |`);
        }
      });
      return lines.join('\n');
    }
    default:
      if (node.content) {
        return serializeInline(node.content);
      }
      return '';
  }
}

export function tiptapToMarkdown(doc: TiptapDoc): string {
  return doc.content
    .map((node) => serializeNode(node))
    .filter((block) => block.length > 0)
    .join('\n\n');
}

export function extractPlainText(doc: TiptapDoc): string {
  function extract(node: TiptapNode): string {
    if (node.type === 'text') {
      return node.text ?? '';
    }
    if (node.content && node.content.length > 0) {
      return node.content.map(extract).join(' ');
    }
    return '';
  }

  return doc.content
    .map(extract)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function exportPageWithFrontmatter(page: MindPage): string {
  const tagsFormatted =
    page.tags.length > 0 ? `[${page.tags.map((t) => t.trim()).join(', ')}]` : '[]';
  const lines = [
    '---',
    `id: ${page.id}`,
    `slug: ${page.slug}`,
    `title: "${page.title.replace(/"/g, '\\"')}"`,
    `icon: "${page.icon}"`,
    `parent: ${page.parentId ?? 'null'}`,
    `tags: ${tagsFormatted}`,
    `created: ${page.createdAt}`,
    `updated: ${page.updatedAt}`,
    '---',
    '',
    `# ${page.icon} ${page.title}`,
    '',
    page.contentMarkdown.trim(),
    '',
  ];
  return lines.join('\n');
}
