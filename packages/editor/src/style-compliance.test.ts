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

  it('enforces shared block geometry tokens (--mind-block-bleed and --mind-block-full-width) across all block containers including tables', () => {
    const canvasCssPath = path.join(editorSrcDir, 'components', 'mind-editor-canvas.css');
    const canvasCss = fs.readFileSync(canvasCssPath, 'utf-8');

    expect(canvasCss).toContain('--mind-block-bleed:');
    expect(canvasCss).toContain('--mind-block-full-width:');
    expect(canvasCss).toContain('.tableWrapper');
    expect(canvasCss).toMatch(/\.tableWrapper[\s\S]*?--mind-block-full-width/);
    expect(canvasCss).toMatch(/\.tableWrapper[\s\S]*?--mind-block-bleed/);

    const blockViewFiles = [
      'CalloutBlockView.vue',
      'SubpageBlockView.vue',
      'MermaidBlockView.vue',
    ];
    for (const fileName of blockViewFiles) {
      const content = fs.readFileSync(
        path.join(editorSrcDir, 'components', fileName),
        'utf-8'
      );
      expect(
        content.includes('--mind-block-full-width'),
        `${fileName} deve usar --mind-block-full-width para alinhar às mesmas margens`
      ).toBe(true);
      expect(
        content.includes('--mind-block-bleed'),
        `${fileName} deve usar --mind-block-bleed para sangria simétrica`
      ).toBe(true);
    }

    const axisMenuPath = path.join(editorSrcDir, 'components', 'table', 'TableAxisContextMenu.vue');
    const axisMenuContent = fs.readFileSync(axisMenuPath, 'utf-8');
    expect(axisMenuContent).toMatch(/\.table-axis-popover[\s\S]*?pointer-events:\s*auto/);

    expect(canvasCss).toMatch(/:deep\(\.ProseMirror\s+hr\)[\s\S]*?padding:\s*10px\s+0;/);

    const tableOverlayPath = path.join(editorSrcDir, 'components', 'table', 'TableControlsOverlay.vue');
    const tableOverlayContent = fs.readFileSync(tableOverlayPath, 'utf-8');
    expect(tableOverlayContent).toMatch(
      /\.table-add-bar\s*\{[\s\S]*?background(?:-color)?:\s*#ffffff;/
    );
  });
});
