import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { BlockColor } from '../extensions/block-color.js';
import {
  MindTable,
  clearTableColumnContentsAt,
  clearTableRowContentsAt,
  deleteTableColumnAt,
  deleteTableRowAt,
  duplicateTableColumnAt,
  duplicateTableRowAt,
  findEnclosingTablePos,
  getTableAllCellsColors,
  getTableColumnColors,
  getTableMetadata,
  getTableRowColors,
  insertTableColumnAt,
  insertTableRowAt,
  moveTableColumn,
  moveTableRow,
  setTableAllCellsColor,
  setTableColumnColor,
  setTableCountDimensions,
  setTableRowColor,
  toggleTableFullWidth,
  toggleTableHeaderColumn,
  toggleTableHeaderRow,
} from './table-operations.js';

function createTableEditor(initialHtml = '<p></p>'): Editor {
  return new Editor({
    extensions: [StarterKit, MindTable, TableRow, TableHeader, TableCell, BlockColor],
    content: initialHtml,
  });
}

function getRowTexts(editor: Editor, tablePos = 0): string[][] {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta) return [];
  const rows: string[][] = [];
  for (let r = 0; r < meta.node.childCount; r += 1) {
    const row = meta.node.child(r);
    const cols: string[] = [];
    for (let c = 0; c < row.childCount; c += 1) {
      cols.push(row.child(c).textContent);
    }
    rows.push(cols);
  }
  return rows;
}

describe('table-operations', () => {
  const editors: Editor[] = [];

  afterEach(() => {
    while (editors.length > 0) {
      editors.pop()?.destroy();
    }
  });

  it('inserts clean 3x3 table without header row by default and inspects metadata', () => {
    const editor = createTableEditor();
    editors.push(editor);

    expect(editor.chain().setTextSelection(1).insertTable({ rows: 3, cols: 3 }).run()).toBe(true);
    const tablePos = findEnclosingTablePos(editor.state.doc, editor.state.selection.from);
    expect(tablePos).toBe(0);

    const meta = getTableMetadata(editor, 0)!;
    expect(meta).not.toBeNull();
    expect(meta.rowsCount).toBe(3);
    expect(meta.colsCount).toBe(3);
    expect(meta.headerRow).toBe(false);
    expect(meta.headerColumn).toBe(false);
    expect(meta.fullWidth).toBe(true);
    expect(editor.getHTML()).not.toContain('<th>');
  });

  it('toggles header row, header column, and full-width while preserving cell colors', () => {
    const editor = createTableEditor(
      '<table><tbody>' +
        '<tr><td><p>A1</p></td><td><p>B1</p></td></tr>' +
        '<tr><td><p>A2</p></td><td><p>B2</p></td></tr>' +
        '</tbody></table>'
    );
    editors.push(editor);

    expect(setTableRowColor(editor, 0, 0, { backgroundColor: 'blue', textColor: 'blue' })).toBe(
      true
    );
    expect(toggleTableHeaderRow(editor, 0)).toBe(true);

    let meta = getTableMetadata(editor, 0)!;
    expect(meta.headerRow).toBe(true);
    expect(meta.node.child(0).child(0).type.name).toBe('tableHeader');
    expect(meta.node.child(0).child(1).type.name).toBe('tableHeader');
    expect(meta.node.child(0).child(0).attrs.blockBackgroundColor).toBe('blue');

    expect(toggleTableHeaderColumn(editor, 0)).toBe(true);
    meta = getTableMetadata(editor, 0)!;
    expect(meta.headerColumn).toBe(true);
    expect(meta.node.child(1).child(0).type.name).toBe('tableHeader');
    expect(meta.node.child(1).child(1).type.name).toBe('tableCell');

    // Turning headerRow off keeps [0][0] as tableHeader because headerColumn is still active
    expect(toggleTableHeaderRow(editor, 0, false)).toBe(true);
    meta = getTableMetadata(editor, 0)!;
    expect(meta.headerRow).toBe(false);
    expect(meta.node.child(0).child(0).type.name).toBe('tableHeader');
    expect(meta.node.child(0).child(1).type.name).toBe('tableCell');

    // Toggle fullWidth off and back on, and also test resetting custom colwidth
    expect(toggleTableFullWidth(editor, 0)).toBe(true);
    expect(getTableMetadata(editor, 0)!.fullWidth).toBe(false);
    expect(toggleTableFullWidth(editor, 0)).toBe(true);
    expect(getTableMetadata(editor, 0)!.fullWidth).toBe(true);

    // Simulate resized colwidth on first cell, then Ajustar à largura clears colwidth cleanly
    const firstCellPos = getTableMetadata(editor, 0)!.cellPositions[0]![0]!;
    const firstCell = editor.state.doc.nodeAt(firstCellPos)!;
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(firstCellPos, undefined, {
        ...firstCell.attrs,
        colwidth: [180],
      })
    );
    expect(getTableMetadata(editor, 0)!.hasCustomColWidths).toBe(true);
    expect(toggleTableFullWidth(editor, 0)).toBe(true);
    expect(getTableMetadata(editor, 0)!.hasCustomColWidths).toBe(false);
    expect(getTableMetadata(editor, 0)!.fullWidth).toBe(true);
  });

  it('expands and shrinks rows and columns via setTableCountDimensions with 1x1 floor', () => {
    const editor = createTableEditor(
      '<table data-header-row="true"><tbody>' +
        '<tr><th><p>H1</p></th><th><p>H2</p></th></tr>' +
        '<tr><td><p>C1</p></td><td><p>C2</p></td></tr>' +
        '</tbody></table>'
    );
    editors.push(editor);

    expect(setTableCountDimensions(editor, 0, 4, 5)).toBe(true);
    let meta = getTableMetadata(editor, 0)!;
    expect(meta.rowsCount).toBe(4);
    expect(meta.colsCount).toBe(5);
    // Newly added columns in header row automatically receive tableHeader
    expect(meta.node.child(0).child(4).type.name).toBe('tableHeader');

    // Shrink below 1x1 clamps cleanly to 1x1
    expect(setTableCountDimensions(editor, 0, 0, -2)).toBe(true);
    meta = getTableMetadata(editor, 0)!;
    expect(meta.rowsCount).toBe(1);
    expect(meta.colsCount).toBe(1);
    expect(getRowTexts(editor)).toEqual([['H1']]);
  });

  it('supports insert, duplicate, clear, move, color, and delete for rows', () => {
    const editor = createTableEditor(
      '<table data-header-row="true"><tbody>' +
        '<tr><th><p>R0A</p></th><th><p>R0B</p></th></tr>' +
        '<tr><td><p>R1A</p></td><td><p>R1B</p></td></tr>' +
        '<tr><td><p>R2A</p></td><td><p>R2B</p></td></tr>' +
        '</tbody></table>'
    );
    editors.push(editor);

    expect(insertTableRowAt(editor, 0, 1, 'above')).toBe(true);
    expect(getRowTexts(editor)).toEqual([
      ['R0A', 'R0B'],
      ['', ''],
      ['R1A', 'R1B'],
      ['R2A', 'R2B'],
    ]);

    expect(deleteTableRowAt(editor, 0, 1)).toBe(true);
    expect(setTableRowColor(editor, 0, 1, { backgroundColor: 'green', textColor: 'green' })).toBe(
      true
    );
    expect(getTableRowColors(editor, 0, 1)).toEqual({ textColor: 'green', bgColor: 'green' });

    expect(duplicateTableRowAt(editor, 0, 1)).toBe(true);
    expect(getRowTexts(editor)).toEqual([
      ['R0A', 'R0B'],
      ['R1A', 'R1B'],
      ['R1A', 'R1B'],
      ['R2A', 'R2B'],
    ]);
    expect(getTableRowColors(editor, 0, 2)).toEqual({ textColor: 'green', bgColor: 'green' });

    expect(clearTableRowContentsAt(editor, 0, 2)).toBe(true);
    expect(getRowTexts(editor)).toEqual([
      ['R0A', 'R0B'],
      ['R1A', 'R1B'],
      ['', ''],
      ['R2A', 'R2B'],
    ]);
    // Color survives clearing contents
    expect(getTableRowColors(editor, 0, 2)).toEqual({ textColor: 'green', bgColor: 'green' });

    expect(moveTableRow(editor, 0, 3, 0)).toBe(true);
    expect(getRowTexts(editor)).toEqual([
      ['R2A', 'R2B'],
      ['R0A', 'R0B'],
      ['R1A', 'R1B'],
      ['', ''],
    ]);
    // Header row stays normalized on index 0
    const movedMeta = getTableMetadata(editor, 0)!;
    expect(movedMeta.node.child(0).child(0).type.name).toBe('tableHeader');
    expect(movedMeta.node.child(1).child(0).type.name).toBe('tableCell');

    // Deleting remaining rows until last one deletes table cleanly
    deleteTableRowAt(editor, 0, 3);
    deleteTableRowAt(editor, 0, 2);
    deleteTableRowAt(editor, 0, 1);
    expect(getTableMetadata(editor, 0)!.rowsCount).toBe(1);
    expect(deleteTableRowAt(editor, 0, 0)).toBe(true);
    expect(getTableMetadata(editor, 0)).toBeNull();
  });

  it('supports insert, duplicate, clear, move, color, and delete for columns & whole table', () => {
    const editor = createTableEditor(
      '<table data-header-column="true"><tbody>' +
        '<tr><th><p>C0</p></th><td><p>C1</p></td><td><p>C2</p></td></tr>' +
        '<tr><th><p>D0</p></th><td><p>D1</p></td><td><p>D2</p></td></tr>' +
        '</tbody></table>'
    );
    editors.push(editor);

    expect(insertTableColumnAt(editor, 0, 1, 'right')).toBe(true);
    expect(getRowTexts(editor)).toEqual([
      ['C0', 'C1', '', 'C2'],
      ['D0', 'D1', '', 'D2'],
    ]);
    expect(deleteTableColumnAt(editor, 0, 2)).toBe(true);

    expect(setTableColumnColor(editor, 0, 1, { backgroundColor: '#fff0f6', textColor: 'pink' })).toBe(
      true
    );
    expect(getTableColumnColors(editor, 0, 1)).toEqual({ textColor: 'pink', bgColor: '#fff0f6' });

    expect(duplicateTableColumnAt(editor, 0, 1)).toBe(true);
    expect(getRowTexts(editor)).toEqual([
      ['C0', 'C1', 'C1', 'C2'],
      ['D0', 'D1', 'D1', 'D2'],
    ]);
    expect(getTableColumnColors(editor, 0, 2)).toEqual({ textColor: 'pink', bgColor: '#fff0f6' });

    expect(clearTableColumnContentsAt(editor, 0, 2)).toBe(true);
    expect(getRowTexts(editor)).toEqual([
      ['C0', 'C1', '', 'C2'],
      ['D0', 'D1', '', 'D2'],
    ]);
    expect(getTableColumnColors(editor, 0, 2)).toEqual({ textColor: 'pink', bgColor: '#fff0f6' });

    expect(moveTableColumn(editor, 0, 3, 0)).toBe(true);
    expect(getRowTexts(editor)).toEqual([
      ['C2', 'C0', 'C1', ''],
      ['D2', 'D0', 'D1', ''],
    ]);
    // Header column stays normalized on col 0
    const meta = getTableMetadata(editor, 0)!;
    expect(meta.node.child(0).child(0).type.name).toBe('tableHeader');
    expect(meta.node.child(0).child(1).type.name).toBe('tableCell');

    expect(setTableAllCellsColor(editor, 0, { backgroundColor: 'yellow' })).toBe(true);
    expect(getTableAllCellsColors(editor, 0).bgColor).toBe('yellow');

    deleteTableColumnAt(editor, 0, 3);
    deleteTableColumnAt(editor, 0, 2);
    deleteTableColumnAt(editor, 0, 1);
    expect(getTableMetadata(editor, 0)!.colsCount).toBe(1);
    expect(deleteTableColumnAt(editor, 0, 0)).toBe(true);
    expect(getTableMetadata(editor, 0)).toBeNull();
  });
});
