import { nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import MindEditor from '../MindEditor.vue';

function setRect(
  el: Element,
  rect: { top: number; left: number; width: number; height: number }
): void {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      top: rect.top,
      left: rect.left,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => {},
    }),
  });
}

function applyTableRects(wrapper: VueWrapper): {
  table: HTMLTableElement;
  rows: HTMLTableRowElement[];
} {
  const root = wrapper.find('[data-testid="mind-editor-root"]').element;
  const canvas = wrapper.find('.mind-editor-canvas-container').element;
  const proseMirror = wrapper.find('.ProseMirror').element;
  const tableWrapper = proseMirror.querySelector('.tableWrapper')!;
  const table = proseMirror.querySelector('table')!;
  const rows = Array.from(table.querySelectorAll('tr'));

  const tableLeft = 200;
  const tableTop = 120;
  const rowHeight = 36;
  const colWidth = 200;
  const colsCount = rows[0]?.children.length ?? 3;
  const tableWidth = colsCount * colWidth;
  const tableHeight = rows.length * rowHeight;

  setRect(root, { top: 60, left: 100, width: 920, height: 600 });
  setRect(canvas, { top: 100, left: 180, width: 760, height: 520 });
  setRect(proseMirror, { top: 100, left: 180, width: 760, height: 520 });
  setRect(tableWrapper, { top: tableTop, left: tableLeft, width: tableWidth, height: tableHeight });
  setRect(table, { top: tableTop, left: tableLeft, width: tableWidth, height: tableHeight });

  rows.forEach((tr, rIdx) => {
    const rTop = tableTop + rIdx * rowHeight;
    setRect(tr, { top: rTop, left: tableLeft, width: tableWidth, height: rowHeight });
    Array.from(tr.children).forEach((cell, cIdx) => {
      setRect(cell, {
        top: rTop,
        left: tableLeft + cIdx * colWidth,
        width: colWidth,
        height: rowHeight,
      });
    });
  });

  return { table, rows };
}

const INITIAL_3X3_TABLE_HTML =
  '<table><tbody>' +
  '<tr><td><p>A1</p></td><td><p>B1</p></td><td><p>C1</p></td></tr>' +
  '<tr><td><p>A2</p></td><td><p>B2</p></td><td><p>C2</p></td></tr>' +
  '<tr><td><p>A3</p></td><td><p>B3</p></td><td><p>C3</p></td></tr>' +
  '</tbody></table>';

describe('TableControlsOverlay & MindEditor table UX', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows bottom and right + bars with tooltips and supports click + drag add/remove rows and columns', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const wrapper = mount(MindEditor, {
      attachTo: host,
      props: {
        modelValue: INITIAL_3X3_TABLE_HTML,
        enableFrontmatterHeader: false,
      },
      global: {
        stubs: { BubbleFormattingMenu: true },
      },
    });

    await nextTick();
    await nextTick();
    const { table } = applyTableRects(wrapper);

    // Hover inside table cell (0,0)
    const firstCell = table.querySelector('td')!;
    firstCell.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 240, clientY: 136, bubbles: true })
    );
    await nextTick();

    const rowBar = wrapper.find('[data-testid="table-add-row-bar"]');
    const colBar = wrapper.find('[data-testid="table-add-col-bar"]');
    expect(rowBar.exists()).toBe(true);
    expect(colBar.exists()).toBe(true);

    // Hover bottom bar -> tooltip matching Image 1
    await wrapper.find('.table-add-row-anchor').trigger('mouseenter');
    const rowTooltip = wrapper.find('[data-testid="table-add-row-tooltip"]');
    expect(rowTooltip.exists()).toBe(true);
    expect(rowTooltip.text()).toContain('Clique para adicionar uma nova linha');
    expect(rowTooltip.text()).toContain('Arraste para adicionar ou remover linhas');

    // Click bottom bar -> 3 rows becomes 4 rows
    await rowBar.trigger('click');
    await nextTick();
    applyTableRects(wrapper);
    expect(wrapper.findAll('.ProseMirror table tr')).toHaveLength(4);

    // Drag bottom bar downward (+72px => +2 rows => 6 rows), then upward (-144px => 2 rows)
    rowBar.element.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 300, clientY: 270, button: 0, bubbles: true })
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 300, clientY: 342, bubbles: true })
    );
    await nextTick();
    expect(wrapper.findAll('.ProseMirror table tr')).toHaveLength(6);

    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 300, clientY: 198, bubbles: true })
    );
    await nextTick();
    expect(wrapper.findAll('.ProseMirror table tr')).toHaveLength(2);
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 300, clientY: 198, bubbles: true }));
    await nextTick();
    applyTableRects(wrapper);

    // Hover right bar -> tooltip matching Image 2
    await wrapper.find('.table-add-col-anchor').trigger('mouseenter');
    const colTooltip = wrapper.find('[data-testid="table-add-col-tooltip"]');
    expect(colTooltip.exists()).toBe(true);
    expect(colTooltip.text()).toContain('Clique para adicionar uma nova coluna');
    expect(colTooltip.text()).toContain('Arraste para adicionar ou remover colunas');

    // Click right bar -> 3 cols becomes 4 cols
    await colBar.trigger('click');
    await nextTick();
    applyTableRects(wrapper);
    expect(wrapper.find('.ProseMirror table tr')!.findAll('td, th')).toHaveLength(4);

    // Drag right bar right (+120px => +1 col => 5 cols), then left (-240px => 2 cols)
    colBar.element.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 810, clientY: 150, button: 0, bubbles: true })
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 930, clientY: 150, bubbles: true })
    );
    await nextTick();
    expect(wrapper.find('.ProseMirror table tr')!.findAll('td, th')).toHaveLength(5);

    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 570, clientY: 150, bubbles: true })
    );
    await nextTick();
    expect(wrapper.find('.ProseMirror table tr')!.findAll('td, th')).toHaveLength(2);
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 570, clientY: 150, bubbles: true }));
    await nextTick();

    wrapper.unmount();
  });

  it('selects column on ::: handle click, applies color, inserts/duplicates/clears/deletes and reorders columns by drag', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const wrapper = mount(MindEditor, {
      attachTo: host,
      props: {
        modelValue: INITIAL_3X3_TABLE_HTML,
        enableFrontmatterHeader: false,
      },
      global: {
        stubs: { BubbleFormattingMenu: true },
      },
    });

    await nextTick();
    await nextTick();
    const { rows } = applyTableRects(wrapper);

    // Hover middle column (index 1, x = 450, y = 136)
    const middleCell = rows[0]!.children[1]!;
    middleCell.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 450, clientY: 136, bubbles: true })
    );
    await nextTick();

    const colHandle = wrapper.find('[data-testid="table-col-handle"]');
    expect(colHandle.exists()).toBe(true);

    // Click handle -> blue handle + blue column selection + context menu without Coluna do cabeçalho (since index 1)
    await colHandle.trigger('click');
    await nextTick();

    expect(colHandle.classes()).toContain('is-selected');
    const selectionBox = wrapper.find('[data-testid="table-axis-selection-box"]');
    expect(selectionBox.exists()).toBe(true);
    expect(selectionBox.attributes('data-axis')).toBe('col');

    const popover = wrapper.find('[data-testid="table-axis-popover"]');
    expect(popover.exists()).toBe(true);
    expect(popover.find('[data-testid="table-axis-toggle-header-col"]').exists()).toBe(false);
    expect(popover.text()).toContain('Inserir à esquerda');
    expect(popover.text()).toContain('Inserir à direita');
    expect(popover.text()).toContain('Duplicar');
    expect(popover.text()).toContain('Apagar conteúdo');
    expect(popover.text()).toContain('Excluir');

    // Filter action via search input ("duplicar")
    const searchInput = popover.find('[data-testid="table-axis-search-input"]');
    await searchInput.setValue('duplicar');
    expect(popover.find('[data-testid="table-axis-search-results"]').exists()).toBe(true);
    await popover.find('[data-testid="table-axis-duplicate"]').trigger('click');
    await nextTick();
    applyTableRects(wrapper);

    // Column 1 duplicated at index 2 -> 4 columns total
    const afterDupTexts = wrapper
      .findAll('.ProseMirror table tr:first-child td')
      .map((w) => w.text());
    expect(afterDupTexts).toEqual(['A1', 'B1', 'B1', 'C1']);

    // Clear content of duplicated column (index 2)
    await wrapper.find('[data-testid="table-col-handle"]').trigger('click');
    await nextTick();
    await wrapper.find('[data-testid="table-axis-clear"]').trigger('click');
    await nextTick();
    expect(
      wrapper.findAll('.ProseMirror table tr:first-child td').map((w) => w.text())
    ).toEqual(['A1', 'B1', '', 'C1']);

    // Apply pastel blue background to column 2
    await wrapper.find('[data-testid="table-col-handle"]').trigger('click');
    await nextTick();
    await wrapper.find('[data-testid="menu-trigger-color"]').trigger('mouseenter');
    await nextTick();
    await wrapper.find('[data-testid="submenu-color-bg-trigger"]').trigger('mouseenter');
    await nextTick();
    await wrapper.find('[data-testid="bg-color-blue"]').trigger('click');
    await nextTick();
    const row0Cells = wrapper.findAll('.ProseMirror table tr:first-child td');
    expect(row0Cells[2]!.attributes('data-block-bg')).toBe('blue');

    // Delete column 2 via keyboard Delete while selected
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await nextTick();
    applyTableRects(wrapper);
    expect(
      wrapper.findAll('.ProseMirror table tr:first-child td').map((w) => w.text())
    ).toEqual(['A1', 'B1', 'C1']);

    // Drag column 0 handle to column 2 (clientX: 250 -> 660)
    const firstCell = wrapper.find('.ProseMirror table tr:first-child td').element;
    firstCell.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 250, clientY: 136, bubbles: true })
    );
    await nextTick();

    const handle0 = wrapper.find('[data-testid="table-col-handle"]').element;
    handle0.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 300, clientY: 112, button: 0, bubbles: true })
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 680, clientY: 112, bubbles: true })
    );
    await nextTick();
    expect(wrapper.find('[data-testid="table-reorder-drop-line"]').exists()).toBe(true);

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 680, clientY: 112, bubbles: true }));
    await nextTick();
    expect(
      wrapper.findAll('.ProseMirror table tr:first-child td').map((w) => w.text())
    ).toEqual(['B1', 'C1', 'A1']);

    wrapper.unmount();
  });

  it('selects row 0 on ⠿ handle click, toggles Linha do cabeçalho, duplicates/reorders rows, and opens Tabela block menu', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const wrapper = mount(MindEditor, {
      attachTo: host,
      props: {
        modelValue: INITIAL_3X3_TABLE_HTML,
        enableFrontmatterHeader: false,
      },
      global: {
        stubs: { BubbleFormattingMenu: true },
      },
    });

    await nextTick();
    await nextTick();
    const { rows } = applyTableRects(wrapper);

    // Hover row 0 cell
    rows[0]!.children[0]!.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 240, clientY: 136, bubbles: true })
    );
    await nextTick();

    const rowHandle = wrapper.find('[data-testid="table-row-handle"]');
    expect(rowHandle.exists()).toBe(true);

    await rowHandle.trigger('click');
    await nextTick();

    expect(rowHandle.classes()).toContain('is-selected');
    expect(wrapper.find('[data-testid="table-axis-selection-box"]').attributes('data-axis')).toBe(
      'row'
    );

    // Row 0 menu displays Linha do cabeçalho toggle (Image 4)
    const headerRowToggle = wrapper.find('[data-testid="table-axis-toggle-header-row"]');
    expect(headerRowToggle.exists()).toBe(true);
    expect(headerRowToggle.attributes('aria-checked')).toBe('false');

    await headerRowToggle.trigger('click');
    await nextTick();
    applyTableRects(wrapper);

    expect(headerRowToggle.attributes('aria-checked')).toBe('true');
    expect(wrapper.find('.ProseMirror table').attributes('data-header-row')).toBe('true');
    expect(wrapper.findAll('.ProseMirror table tr:first-child th')).toHaveLength(3);

    // Close axis menu with Escape
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();
    expect(wrapper.find('[data-testid="table-axis-popover"]').exists()).toBe(false);

    // Clear axis selection with second Escape
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();
    expect(wrapper.find('[data-testid="table-axis-selection-box"]').exists()).toBe(false);

    // Now hover the outer left margin gutter to open the Table Block menu (Image 5)
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 156, clientY: 136, bubbles: true })
    );
    await nextTick();

    const gutterHandle = wrapper.find('[data-testid="block-gutter-handle-btn"]');
    expect(gutterHandle.exists()).toBe(true);
    await gutterHandle.trigger('click');
    await nextTick();

    const blockMenu = wrapper.find('[data-testid="block-actions-popover"]');
    expect(blockMenu.exists()).toBe(true);
    expect(blockMenu.text()).toContain('Tabela');
    expect(blockMenu.find('[data-testid="table-action-fit-width"]').exists()).toBe(true);
    expect(blockMenu.find('[data-testid="table-toggle-header-row"]').attributes('aria-checked')).toBe(
      'true'
    );
    expect(blockMenu.find('[data-testid="table-toggle-header-col"]').attributes('aria-checked')).toBe(
      'false'
    );
    expect(blockMenu.find('[data-testid="menu-trigger-turn-into"]').exists()).toBe(false);

    // Soft blue tint highlights entire table while block menu is open
    expect(wrapper.find('[data-testid="table-block-menu-tint"]').exists()).toBe(true);

    // Toggle Coluna do cabeçalho ON via block menu
    await blockMenu.find('[data-testid="table-toggle-header-col"]').trigger('click');
    await nextTick();
    expect(blockMenu.find('[data-testid="table-toggle-header-col"]').attributes('aria-checked')).toBe(
      'true'
    );
    expect(wrapper.find('.ProseMirror table').attributes('data-header-column')).toBe('true');

    // Click Ajustar à largura
    await blockMenu.find('[data-testid="table-action-fit-width"]').trigger('click');
    await nextTick();
    expect(wrapper.find('.ProseMirror table').attributes('data-full-width')).toBe('false');

    wrapper.unmount();
  });

  it('shows mini-gutters pinned to clicked cell, tracks hover reactively, hides + bars on leave, and clears pin on outside selection', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const wrapper = mount(MindEditor, {
      attachTo: host,
      props: {
        modelValue: INITIAL_3X3_TABLE_HTML + '<p>Texto abaixo da tabela</p>',
        enableFrontmatterHeader: false,
      },
      global: {
        stubs: { BubbleFormattingMenu: true },
      },
    });

    await nextTick();
    await nextTick();
    const { table } = applyTableRects(wrapper);

    // Focus caret inside first cell (0,0) -> mini-gutters stay pinned on (0,0)
    const editor = wrapper.findComponent({ name: 'EditorContent' }).props('editor');
    editor.chain().setTextSelection(4).run();
    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-testid="table-col-handle"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="table-row-handle"]').exists()).toBe(true);
    expect(wrapper.find('.table-mini-dash-col').exists()).toBe(true);
    expect(wrapper.find('.table-mini-dash-row').exists()).toBe(true);

    const pinnedColLeft = wrapper.find('[data-testid="table-col-handle"]').attributes('style');
    const pinnedRowTop = wrapper.find('[data-testid="table-row-handle"]').attributes('style');

    // Hover a different cell (row 1, col 2) -> handles move reactively and + bars appear
    const cells = Array.from(table.querySelectorAll('td'));
    cells[5]!.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 720, clientY: 180, bubbles: true })
    );
    await nextTick();

    expect(wrapper.find('[data-testid="table-add-row-bar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="table-add-col-bar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="table-col-handle"]').attributes('style')).not.toBe(pinnedColLeft);
    expect(wrapper.find('[data-testid="table-row-handle"]').attributes('style')).not.toBe(pinnedRowTop);

    // Click handle -> popover opens and responds to action click
    await wrapper.find('[data-testid="table-col-handle"]').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="table-axis-popover"]').exists()).toBe(true);

    // Close menu and selection
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    // Move mouse away from table while caret is still inside cell (0,0):
    // + bars hide immediately, while mini-gutters snap back to pinned cell (0,0)
    const belowP = wrapper.find('.ProseMirror > p:last-child').element;
    setRect(belowP, { top: 320, left: 180, width: 760, height: 32 });
    belowP.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 250, clientY: 336, bubbles: true })
    );
    await nextTick();

    expect(wrapper.find('[data-testid="table-add-row-bar"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="table-add-col-bar"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="table-col-handle"]').attributes('style')).toBe(pinnedColLeft);
    expect(wrapper.find('[data-testid="table-row-handle"]').attributes('style')).toBe(pinnedRowTop);

    // Move caret outside table -> pinned mini-gutters disappear too
    const docSize = editor.state.doc.content.size;
    editor.chain().setTextSelection(docSize - 2).run();
    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-testid="table-col-handle"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="table-row-handle"]').exists()).toBe(false);

    wrapper.unmount();
  });
});
