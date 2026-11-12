import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webRootDir = path.resolve(currentDir, '..');

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
        entry.name.endsWith('.ts') ||
        entry.name.endsWith('.html') ||
        entry.name.endsWith('.webmanifest') ||
        entry.name.endsWith('.svg'))
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Gatekeeper UI — Validação Rigorosa mind-light-style (Veto ao Azul Escuro IA)', () => {
  const uiFiles = collectSourceFiles(webRootDir);

  it('proíbe terminantemente cores hex do "azul escuro IA" (#0b0f19, #0f172a, #6366f1, #1e293b, #090d16) e Quasar dark: true', () => {
    const bannedHexes = ['#0b0f19', '#0f172a', '#6366f1', '#1e293b', '#090d16', '#a5b4fc'];

    for (const filePath of uiFiles) {
      const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();
      for (const hex of bannedHexes) {
        expect(
          content.includes(hex),
          `Cor banida "${hex}" encontrada em ${path.basename(filePath)}`,
        ).toBe(false);
      }
    }

    const mainTs = fs.readFileSync(path.join(currentDir, 'main.ts'), 'utf-8');
    expect(mainTs).toContain('dark: false');
    expect(mainTs).not.toContain('dark: true');
  });

  it('proíbe classes neon Quasar (indigo-*, teal-*, bg-dark) e poluição de telemetria na UI', () => {
    const bannedPatterns = [
      'indigo-',
      'teal-',
      'bg-dark',
      'MCP /mcp Ready',
      'Salva em &lt; 2ms',
      'Licença AGPLv3',
      'Slug:',
    ];

    for (const filePath of uiFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const pattern of bannedPatterns) {
        expect(
          content.includes(pattern),
          `Padrão poluído banido "${pattern}" encontrado em ${path.basename(filePath)}`,
        ).toBe(false);
      }
    }
  });

  it('exige tokens oficiais do mind-light-style e pílulas pastéis em app.css', () => {
    const cssPath = path.join(currentDir, 'styles', 'app.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    expect(css).toContain('--mind-bg-canvas: #ffffff');
    expect(css).toContain('--mind-bg-sidebar: #f8f9fa');
    expect(css).toContain('--mind-bg-active: #e9ecef');
    expect(css).toContain('--mind-border-subtle: #e9ecef');
    expect(css).toContain('--mind-accent-primary: #1971c2');
    expect(css).toContain('.mind-pill-green');
    expect(css).toContain('.mind-pill-blue');
    expect(css).toContain('.mind-pill-orange');
    expect(css).toContain('.mind-pill-yellow');
    expect(css).toContain('.mind-pill-pink');
  });

  it('verifica presença dos componentes obrigatórios: Left Gutter Handles (+ / ⠿), Menus / e @, Database, Diagramas e Login Clean', () => {
    const appVue = fs.readFileSync(path.join(currentDir, 'App.vue'), 'utf-8');
    expect(appVue).toContain("from '@mind-hub/editor'");
    expect(appVue).toContain('<MindEditor');

    const editorDir = path.resolve(currentDir, '../../../packages/editor/src/components');
    const gutterVue = fs.readFileSync(path.join(editorDir, 'BlockGutter.vue'), 'utf-8');
    expect(gutterVue).toContain('data-testid="block-gutter-add-btn"');
    expect(gutterVue).toContain('data-testid="block-gutter-handle-btn"');
    expect(gutterVue).toContain('data-testid="action-move-up"');
    expect(gutterVue).toContain('data-testid="action-move-down"');

    const slashVue = fs.readFileSync(path.join(editorDir, 'SlashMenu.vue'), 'utf-8');
    expect(slashVue).toContain('data-testid="slash-command-menu"');

    const mentionVue = fs.readFileSync(path.join(editorDir, 'PageMentionPopover.vue'), 'utf-8');
    expect(mentionVue).toContain('data-testid="mention-menu-popover"');

    const mindEditorVue = fs.readFileSync(path.join(editorDir, 'MindEditor.vue'), 'utf-8');
    expect(mindEditorVue).not.toContain('editor-toolbar');

    const dbVue = fs.readFileSync(
      path.join(currentDir, 'components', 'DatabaseViewBlock.vue'),
      'utf-8',
    );
    expect(dbVue).toContain('data-testid="db-tab-table"');
    expect(dbVue).toContain('data-testid="db-tab-board"');
    expect(dbVue).toContain('data-testid="db-kanban-board"');

    const diagramsVue = fs.readFileSync(
      path.join(currentDir, 'components', 'DiagramEmbedsBlock.vue'),
      'utf-8',
    );
    expect(diagramsVue).toContain('data-testid="mermaid-diagram-block"');
    expect(diagramsVue).toContain('data-testid="excalidraw-whiteboard-block"');
    expect(diagramsVue).toContain('data-testid="drawio-diagram-block"');

    const loginVue = fs.readFileSync(
      path.join(currentDir, 'components', 'CleanLoginView.vue'),
      'utf-8',
    );
    expect(loginVue).toContain('autocomplete="username"');
    expect(loginVue).toContain('autocomplete="current-password"');
    expect(loginVue).toContain('Sign In');
  });
});
