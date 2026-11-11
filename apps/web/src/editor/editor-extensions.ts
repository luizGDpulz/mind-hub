import { getSchema, type AnyExtension } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import type { TiptapDoc, TiptapNode } from '@mind-hub/shared';

type Schema = ReturnType<typeof getSchema>;

/**
 * Single source of truth for the Tiptap schema used by the block editor.
 *
 * Every node/mark produced by `markdownToTiptap` (packages/shared) MUST have a
 * matching extension here. If the editor receives a document containing an
 * unknown node or mark, ProseMirror rejects the whole document and Tiptap
 * silently renders it empty (root cause of #34: `link` marks were missing).
 */
export function createEditorExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Placeholder.configure({
      placeholder: "Type '/' for commands or '@' to mention users and pages...",
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        rel: 'noopener noreferrer nofollow',
        target: null,
      },
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Underline,
  ];
}

export function createEditorSchema(extensions: AnyExtension[] = createEditorExtensions()): Schema {
  return getSchema(extensions);
}

function collectText(node: TiptapNode): string {
  if (typeof node.text === 'string') return node.text;
  return (node.content ?? []).map(collectText).join('');
}

function sanitizeNode(node: TiptapNode, schema: Schema, dropped: Set<string>): TiptapNode {
  if (!schema.nodes[node.type]) {
    dropped.add(`node:${node.type}`);
    const text = collectText(node);
    return text
      ? { type: 'paragraph', content: [{ type: 'text', text }] }
      : { type: 'paragraph' };
  }

  const next: TiptapNode = { ...node };

  if (node.marks) {
    const keptMarks = node.marks.filter((mark) => {
      const known = Boolean(schema.marks[mark.type]);
      if (!known) dropped.add(`mark:${mark.type}`);
      return known;
    });
    if (keptMarks.length > 0) {
      next.marks = keptMarks;
    } else {
      delete next.marks;
    }
  }

  if (node.content) {
    next.content = node.content.map((child) => sanitizeNode(child, schema, dropped));
  }

  return next;
}

function markdownAsPlainParagraphs(markdown: string): TiptapDoc {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const content: TiptapNode[] = lines.map((line) =>
    line.length > 0
      ? { type: 'paragraph', content: [{ type: 'text', text: line }] }
      : { type: 'paragraph' },
  );
  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
}

export interface SafeDocResult {
  doc: TiptapDoc;
  /** Unknown node/mark types that had to be stripped (empty when the doc was valid). */
  dropped: string[];
  /** True when even the sanitized JSON was invalid and we rebuilt from raw Markdown. */
  usedMarkdownFallback: boolean;
}

/**
 * Guarantees the editor never receives a document it would silently discard.
 * 1. Strips unknown marks and converts unknown nodes to plain paragraphs (text is preserved).
 * 2. Validates against the schema; if still invalid, rebuilds plain paragraphs from Markdown.
 */
export function toSchemaSafeDoc(
  doc: TiptapDoc | null | undefined,
  schema: Schema,
  fallbackMarkdown = '',
): SafeDocResult {
  const dropped = new Set<string>();

  if (doc && doc.type === 'doc') {
    const sanitized = sanitizeNode(doc as TiptapNode, schema, dropped) as TiptapDoc;
    if (!sanitized.content || sanitized.content.length === 0) {
      sanitized.content = [{ type: 'paragraph' }];
    }
    try {
      schema.nodeFromJSON(sanitized).check();
      return { doc: sanitized, dropped: Array.from(dropped), usedMarkdownFallback: false };
    } catch {
      // fall through to Markdown fallback
    }
  }

  return {
    doc: markdownAsPlainParagraphs(fallbackMarkdown),
    dropped: Array.from(dropped),
    usedMarkdownFallback: true,
  };
}
