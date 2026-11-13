import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const editorSrcDir = currentDir;

function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (
      entry.name !== 'style-compliance.test.ts' &&
      (entry.name.endsWith('.vue') ||
        entry.name.endsWith('.css') ||
        entry.name.endsWith('.ts'))
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('packages/editor — Gatekeeper UI & Style Compliance (mind-light-style)', () => {
  const sourceFiles = collectSourceFiles(editorSrcDir);

  it('banishes dark-blue AI hex colors (#0b0f19, #0f172a, #6366f1, #1e293b, #090d16, #a5b4fc)', () => {
    const bannedHexes = ['#0b0f19', '#0f172a', '#6366f1', '#1e293b', '#090d16', '#a5b4fc'];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();
      for (const hex of bannedHexes) {
        expect(
          content.includes(hex),
          `Cor banida "${hex}" encontrada em packages/editor/${path.basename(filePath)}`
        ).toBe(false);
      }
    }
  });

  it('prohibits neon utility classes (indigo-*, teal-*, bg-dark) and telemetry pollution', () => {
    const bannedPatterns = [
      'indigo-',
      'teal-',
      'bg-dark',
      'MCP Ready',
      'Salva em <',
      'Slug:',
    ];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const pattern of bannedPatterns) {
        expect(
          content.includes(pattern),
          `Padrão poluído banido "${pattern}" encontrado em packages/editor/${path.basename(filePath)}`
        ).toBe(false);
      }
    }
  });

  it('verifies that all exported components exist and have standard testids', () => {
    const expectedTestIds = [
      'mind-editor-root',
      'mind-frontmatter-header',
      'block-gutter-shell',
      'slash-menu-shell',
      'page-mention-suggest-popover',
      'mermaid-block-shell',
      'bubble-formatting-menu',
    ];

    let allContent = '';
    for (const filePath of sourceFiles) {
      allContent += fs.readFileSync(filePath, 'utf-8') + '\n';
    }

    for (const testId of expectedTestIds) {
      expect(
        allContent.includes(`data-testid="${testId}"`),
        `TestId obrigatório "${testId}" não encontrado em packages/editor`
      ).toBe(true);
    }
  });
});
