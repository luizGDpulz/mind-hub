import Table from '@tiptap/extension-table';
import { TableView } from '@tiptap/extension-table';
import { Fragment, type Node as PmNode, type Schema } from '@tiptap/pm/model';
import { EditorState, Selection, TextSelection, type Transaction } from '@tiptap/pm/state';
import {
  TableMap,
  addColumn,
  addRow,
  removeColumn,
  removeRow,
  tableNodeTypes,
} from '@tiptap/pm/tables';
import type { Editor } from '@tiptap/core';
import type { ViewMutationRecord } from '@tiptap/pm/view';
import type { BlockColorUpdate } from '../types.js';
import { normalizeBlockColorValue } from './block-color.js';

export interface TableMetadata {
  tablePos: number;
  tableStart: number;
  node: PmNode;
  rowsCount: number;
  colsCount: number;
  headerRow: boolean;
  headerColumn: boolean;
  fullWidth: boolean;
  hasCustomColWidths: boolean;
  cellPositions: number[][];
}

function isRowAllHeaders(table: PmNode, rowIndex: number): boolean {
  if (rowIndex < 0 || rowIndex >= table.childCount) return false;
  const row = table.child(rowIndex);
  if (row.childCount === 0) return false;
  for (let c = 0; c < row.childCount; c += 1) {
    if (row.child(c).type.name !== 'tableHeader') {
      return false;
    }
  }
  return true;
}

function isColAllHeaders(table: PmNode, colIndex: number): boolean {
  const map = TableMap.get(table);
  if (colIndex < 0 || colIndex >= map.width || map.height === 0) return false;
  for (let r = 0; r < map.height; r += 1) {
    const relPos = map.map[r * map.width + colIndex];
    if (relPos === undefined) return false;
    const cell = table.nodeAt(relPos);
    if (!cell || cell.type.name !== 'tableHeader') {
      return false;
    }
  }
  return true;
}

function resolveEffectiveHeaderFlags(table: PmNode): {
  headerRow: boolean;
  headerColumn: boolean;
} {
  const explicitRow = Boolean(table.attrs?.headerRow);
  const explicitCol = Boolean(table.attrs?.headerColumn);
  return {
    headerRow: explicitRow || isRowAllHeaders(table, 0),
    headerColumn: explicitCol || (table.childCount > 1 && isColAllHeaders(table, 0)),
  };
}

function syncTableDomAttributes(
  dom: HTMLElement,
  tableEl: HTMLTableElement,
  node: PmNode
): void {
  const { headerRow, headerColumn } = resolveEffectiveHeaderFlags(node);
  const fullWidth = node.attrs?.fullWidth !== false;

  for (const el of [dom, tableEl]) {
    if (headerRow) {
      el.setAttribute('data-header-row', 'true');
    } else {
      el.removeAttribute('data-header-row');
    }

    if (headerColumn) {
      el.setAttribute('data-header-column', 'true');
    } else {
      el.removeAttribute('data-header-column');
    }

    el.setAttribute('data-full-width', fullWidth ? 'true' : 'false');
  }
}

export class MindTableView extends TableView {
  constructor(node: PmNode, cellMinWidth: number) {
    super(node, cellMinWidth);
    syncTableDomAttributes(this.dom, this.table, node);
  }

  override update(node: PmNode): boolean {
    const updated = super.update(node);
    if (updated) {
      syncTableDomAttributes(this.dom, this.table, node);
    }
    return updated;
  }

  override ignoreMutation(mutation: ViewMutationRecord): boolean {
    if (super.ignoreMutation(mutation)) {
      return true;
    }
    if (
      mutation.type === 'attributes' &&
      (mutation.target === this.dom || mutation.target === this.table) &&
      typeof mutation.attributeName === 'string' &&
      (mutation.attributeName.startsWith('data-header-') ||
        mutation.attributeName === 'data-full-width' ||
        mutation.attributeName === 'data-block-selected' ||
        mutation.attributeName === 'data-block-dragging' ||
        mutation.attributeName === 'data-drop-placement' ||
        mutation.attributeName === 'class')
    ) {
      return true;
    }
    return false;
  }
}

function createEmptyTableNode(
  schema: Schema,
  rowsCount: number,
  colsCount: number,
  withHeaderRow: boolean
): PmNode {
  const types = tableNodeTypes(schema);
  const rows: PmNode[] = [];
  for (let r = 0; r < rowsCount; r += 1) {
    const cells: PmNode[] = [];
    const cellType = withHeaderRow && r === 0 ? types.header_cell : types.cell;
    for (let c = 0; c < colsCount; c += 1) {
      const created = cellType.createAndFill();
      if (created) {
        cells.push(created);
      }
    }
    rows.push(types.row.createChecked(null, cells));
  }
  return types.table.createChecked(
    {
      headerRow: withHeaderRow,
      headerColumn: false,
      fullWidth: true,
    },
    rows
  );
}

export const MindTable = Table.extend({
  addAttributes() {
    return {
      headerRow: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-header-row') === 'true',
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.headerRow ? { 'data-header-row': 'true' } : {},
      },
      headerColumn: {
        default: false,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-header-column') === 'true',
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.headerColumn ? { 'data-header-column': 'true' } : {},
      },
      fullWidth: {
        default: true,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-full-width') !== 'false',
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.fullWidth === false
            ? { 'data-full-width': 'false' }
            : { 'data-full-width': 'true' },
      },
    };
  },

  addCommands() {
    const parentCommands = this.parent?.();
    return {
      ...parentCommands,
      insertTable:
        ({ rows = 3, cols = 3, withHeaderRow = false } = {}) =>
        ({ tr, dispatch, editor }) => {
          const node = createEmptyTableNode(editor.schema, rows, cols, withHeaderRow);
          if (dispatch) {
            const offset = tr.selection.from + 1;
            tr.replaceSelectionWith(node)
              .scrollIntoView()
              .setSelection(TextSelection.near(tr.doc.resolve(offset)));
          }
          return true;
        },
    };
  },
}).configure({
  resizable: true,
  renderWrapper: true,
  cellMinWidth: 80,
  handleWidth: 5,
  View: MindTableView,
});

function resolveEditorDoc(docOrEditor: Editor | PmNode): PmNode {
  return 'state' in docOrEditor ? docOrEditor.state.doc : docOrEditor;
}

/**
 * Resolves geometry, cell positions, header flags, and width state for the table at `tablePos`.
 */
export function getTableMetadata(
  docOrEditor: Editor | PmNode,
  tablePos: number
): TableMetadata | null {
  const doc = resolveEditorDoc(docOrEditor);
  if (tablePos < 0 || tablePos >= doc.content.size) {
    return null;
  }

  const node = doc.nodeAt(tablePos);
  if (!node || node.type.name !== 'table') {
    return null;
  }

  const map = TableMap.get(node);
  const tableStart = tablePos + 1;
  const cellPositions: number[][] = [];
  let hasCustomColWidths = false;

  for (let r = 0; r < map.height; r += 1) {
    const rowCells: number[] = [];
    for (let c = 0; c < map.width; c += 1) {
      const rel = map.map[r * map.width + c] ?? 0;
      const cell = node.nodeAt(rel);
      if (cell?.attrs?.colwidth) {
        hasCustomColWidths = true;
      }
      rowCells.push(tableStart + rel);
    }
    cellPositions.push(rowCells);
  }

  const { headerRow, headerColumn } = resolveEffectiveHeaderFlags(node);

  return {
    tablePos,
    tableStart,
    node,
    rowsCount: map.height,
    colsCount: map.width,
    headerRow,
    headerColumn,
    fullWidth: node.attrs?.fullWidth !== false,
    hasCustomColWidths,
    cellPositions,
  };
}

/**
 * Finds the ProseMirror document position of the closest enclosing `table` node around `pos`.
 */
export function findEnclosingTablePos(doc: PmNode, pos: number): number | null {
  if (pos < 0 || pos > doc.content.size) return null;
  const direct = doc.nodeAt(pos);
  if (direct?.type.name === 'table') {
    return pos;
  }
  const $pos = doc.resolve(pos);
  for (let d = $pos.depth; d >= 1; d -= 1) {
    if ($pos.node(d).type.name === 'table') {
      return $pos.before(d);
    }
  }
  return null;
}

function normalizeTableCellsInTransaction(
  tr: Transaction,
  tablePos: number,
  schema: Schema,
  headerRow: boolean,
  headerColumn: boolean
): void {
  const table = tr.doc.nodeAt(tablePos);
  if (!table || table.type.name !== 'table') return;

  const types = tableNodeTypes(schema);
  const map = TableMap.get(table);
  const tableStart = tablePos + 1;
  const visited = new Set<number>();

  for (let r = 0; r < map.height; r += 1) {
    for (let c = 0; c < map.width; c += 1) {
      const rel = map.map[r * map.width + c];
      if (rel === undefined || visited.has(rel)) continue;
      visited.add(rel);

      const cellPos = tableStart + rel;
      const cell = tr.doc.nodeAt(cellPos);
      if (!cell) continue;

      const shouldBeHeader = (headerRow && r === 0) || (headerColumn && c === 0);
      const targetType = shouldBeHeader ? types.header_cell : types.cell;
      if (cell.type !== targetType) {
        tr.setNodeMarkup(cellPos, targetType, cell.attrs);
      }
    }
  }
}

function getUniqueCellPositionsForRow(table: PmNode, tableStart: number, rowIndex: number): number[] {
  const map = TableMap.get(table);
  if (rowIndex < 0 || rowIndex >= map.height) return [];
  const seen = new Set<number>();
  const positions: number[] = [];
  for (let c = 0; c < map.width; c += 1) {
    const rel = map.map[rowIndex * map.width + c];
    if (rel === undefined || seen.has(rel)) continue;
    seen.add(rel);
    positions.push(tableStart + rel);
  }
  return positions;
}

function getUniqueCellPositionsForColumn(
  table: PmNode,
  tableStart: number,
  colIndex: number
): number[] {
  const map = TableMap.get(table);
  if (colIndex < 0 || colIndex >= map.width) return [];
  const seen = new Set<number>();
  const positions: number[] = [];
  for (let r = 0; r < map.height; r += 1) {
    const rel = map.map[r * map.width + colIndex];
    if (rel === undefined || seen.has(rel)) continue;
    seen.add(rel);
    positions.push(tableStart + rel);
  }
  return positions;
}

function getAllUniqueCellPositions(table: PmNode, tableStart: number): number[] {
  const map = TableMap.get(table);
  const seen = new Set<number>();
  const positions: number[] = [];
  for (const rel of map.map) {
    if (seen.has(rel)) continue;
    seen.add(rel);
    positions.push(tableStart + rel);
  }
  return positions;
}

function deleteEntireTable(editor: Editor, tablePos: number): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta) return false;
  const { state, view } = editor;
  const tr = state.tr;
  tr.delete(tablePos, tablePos + meta.node.nodeSize);
  if (tr.doc.childCount === 0 && state.schema.nodes.paragraph) {
    tr.insert(0, state.schema.nodes.paragraph.create());
  }
  const safePos = Math.min(Math.max(1, tablePos), Math.max(1, tr.doc.content.size - 1));
  if (tr.doc.content.size >= 2) {
    tr.setSelection(Selection.near(tr.doc.resolve(safePos)));
  }
  view.dispatch(tr);
  return true;
}

function applyColorToCellPositions(
  editor: Editor,
  cellPositions: number[],
  update: BlockColorUpdate
): boolean {
  if (cellPositions.length === 0) return false;
  const { state, view } = editor;
  const tr = state.tr;
  let modified = false;

  for (const pos of cellPositions) {
    const cell = tr.doc.nodeAt(pos);
    if (!cell) continue;
    const nextAttrs: Record<string, unknown> = { ...cell.attrs };
    if (update.textColor !== undefined) {
      nextAttrs.blockTextColor = normalizeBlockColorValue(update.textColor);
    }
    if (update.backgroundColor !== undefined) {
      nextAttrs.blockBackgroundColor = normalizeBlockColorValue(update.backgroundColor);
    }
    tr.setNodeMarkup(pos, undefined, nextAttrs);
    modified = true;
  }

  if (!modified) return false;
  view.dispatch(tr);
  return true;
}

function summarizeCellColors(
  doc: PmNode,
  cellPositions: number[]
): { textColor: string | null; bgColor: string | null } {
  let textColor: string | null = null;
  let bgColor: string | null = null;

  for (const pos of cellPositions) {
    const cell = doc.nodeAt(pos);
    if (!cell) continue;
    if (!textColor && cell.attrs?.blockTextColor) {
      textColor = normalizeBlockColorValue(cell.attrs.blockTextColor);
    }
    if (!bgColor && cell.attrs?.blockBackgroundColor) {
      bgColor = normalizeBlockColorValue(cell.attrs.blockBackgroundColor);
    }
    if (textColor && bgColor) break;
  }

  return { textColor, bgColor };
}

/**
 * Toggles the table's Header Row (`Linha do cabeçalho`) and converts row 0 cells cleanly.
 */
export function toggleTableHeaderRow(editor: Editor, tablePos: number, force?: boolean): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta) return false;

  const nextHeaderRow = force !== undefined ? force : !meta.headerRow;
  const { state, view } = editor;
  const tr = state.tr;

  tr.setNodeMarkup(tablePos, undefined, {
    ...meta.node.attrs,
    headerRow: nextHeaderRow,
  });

  normalizeTableCellsInTransaction(
    tr,
    tablePos,
    state.schema,
    nextHeaderRow,
    meta.headerColumn
  );

  view.dispatch(tr);
  return true;
}

/**
 * Toggles the table's Header Column (`Coluna do cabeçalho`) and converts col 0 cells cleanly.
 */
export function toggleTableHeaderColumn(
  editor: Editor,
  tablePos: number,
  force?: boolean
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta) return false;

  const nextHeaderCol = force !== undefined ? force : !meta.headerColumn;
  const { state, view } = editor;
  const tr = state.tr;

  tr.setNodeMarkup(tablePos, undefined, {
    ...meta.node.attrs,
    headerColumn: nextHeaderCol,
  });

  normalizeTableCellsInTransaction(
    tr,
    tablePos,
    state.schema,
    meta.headerRow,
    nextHeaderCol
  );

  view.dispatch(tr);
  return true;
}

/**
 * Fits the table to canvas width (clearing manual column widths first if present,
 * or toggling between full-width and compact auto-width).
 */
export function toggleTableFullWidth(editor: Editor, tablePos: number, force?: boolean): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta) return false;

  const { state, view } = editor;
  const tr = state.tr;

  const shouldResetResizedColumns = force === undefined && meta.hasCustomColWidths;
  const nextFullWidth =
    force !== undefined ? force : shouldResetResizedColumns ? true : !meta.fullWidth;

  if (nextFullWidth && meta.hasCustomColWidths) {
    for (const cellPos of getAllUniqueCellPositions(meta.node, meta.tableStart)) {
      const cell = tr.doc.nodeAt(cellPos);
      if (cell && cell.attrs?.colwidth) {
        tr.setNodeMarkup(cellPos, undefined, {
          ...cell.attrs,
          colwidth: null,
        });
      }
    }
  }

  tr.setNodeMarkup(tablePos, undefined, {
    ...meta.node.attrs,
    fullWidth: nextFullWidth,
  });

  view.dispatch(tr);
  return true;
}

/**
 * Expands or shrinks the table to `(targetRows, targetCols)` in a single transaction,
 * supporting both single-click (+1) and continuous drag resize of rows/columns.
 */
export function setTableCountDimensions(
  editor: Editor,
  tablePos: number,
  targetRows: number,
  targetCols: number
): boolean {
  const initialMeta = getTableMetadata(editor, tablePos);
  if (!initialMeta) return false;

  const desiredRows = Math.max(1, Math.round(targetRows));
  const desiredCols = Math.max(1, Math.round(targetCols));
  if (desiredRows === initialMeta.rowsCount && desiredCols === initialMeta.colsCount) {
    return false;
  }

  const { state, view } = editor;
  let workingState = EditorState.create({
    doc: state.schema.topNodeType.create(null, initialMeta.node),
    schema: state.schema,
  });

  const runStep = (
    fn: (stepTr: Transaction, table: PmNode, map: TableMap) => void
  ): void => {
    const curTable = workingState.doc.child(0);
    const curMap = TableMap.get(curTable);
    const stepTr = workingState.tr;
    fn(stepTr, curTable, curMap);
    workingState = workingState.apply(stepTr);
  };

  while (TableMap.get(workingState.doc.child(0)).height < desiredRows) {
    runStep((stepTr, curTable, curMap) => {
      addRow(
        stepTr,
        {
          left: 0,
          top: curMap.height - 1,
          right: curMap.width,
          bottom: curMap.height,
          tableStart: 1,
          map: curMap,
          table: curTable,
        },
        curMap.height
      );
    });
  }

  while (TableMap.get(workingState.doc.child(0)).height > desiredRows) {
    const h = TableMap.get(workingState.doc.child(0)).height;
    if (h <= 1) break;
    runStep((stepTr, curTable, curMap) => {
      removeRow(
        stepTr,
        {
          left: 0,
          top: curMap.height - 1,
          right: curMap.width,
          bottom: curMap.height,
          tableStart: 1,
          map: curMap,
          table: curTable,
        },
        curMap.height - 1
      );
    });
  }

  while (TableMap.get(workingState.doc.child(0)).width < desiredCols) {
    runStep((stepTr, curTable, curMap) => {
      addColumn(
        stepTr,
        {
          left: curMap.width - 1,
          top: 0,
          right: curMap.width,
          bottom: curMap.height,
          tableStart: 1,
          map: curMap,
          table: curTable,
        },
        curMap.width
      );
    });
  }

  while (TableMap.get(workingState.doc.child(0)).width > desiredCols) {
    const w = TableMap.get(workingState.doc.child(0)).width;
    if (w <= 1) break;
    runStep((stepTr, curTable, curMap) => {
      removeColumn(
        stepTr,
        {
          left: curMap.width - 1,
          top: 0,
          right: curMap.width,
          bottom: curMap.height,
          tableStart: 1,
          map: curMap,
          table: curTable,
        },
        curMap.width - 1
      );
    });
  }

  const nextTable = workingState.doc.child(0);
  const tr = state.tr.replaceWith(tablePos, tablePos + initialMeta.node.nodeSize, nextTable);

  normalizeTableCellsInTransaction(
    tr,
    tablePos,
    state.schema,
    initialMeta.headerRow,
    initialMeta.headerColumn
  );

  if (!tr.docChanged) return false;
  view.dispatch(tr);
  return true;
}

/**
 * Inserts a blank row above or below `rowIndex`.
 */
export function insertTableRowAt(
  editor: Editor,
  tablePos: number,
  rowIndex: number,
  placement: 'above' | 'below'
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta || rowIndex < 0 || rowIndex >= meta.rowsCount) return false;

  const { state, view } = editor;
  const tr = state.tr;
  const map = TableMap.get(meta.node);
  const insertIndex = placement === 'above' ? rowIndex : rowIndex + 1;

  addRow(
    tr,
    {
      left: 0,
      top: rowIndex,
      right: map.width,
      bottom: rowIndex + 1,
      tableStart: meta.tableStart,
      map,
      table: meta.node,
    },
    insertIndex
  );

  normalizeTableCellsInTransaction(
    tr,
    tablePos,
    state.schema,
    meta.headerRow,
    meta.headerColumn
  );

  view.dispatch(tr);
  return true;
}

/**
 * Duplicates `rowIndex` (preserving cell contents & styling) directly beneath it.
 */
export function duplicateTableRowAt(
  editor: Editor,
  tablePos: number,
  rowIndex: number
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta || rowIndex < 0 || rowIndex >= meta.rowsCount) return false;
  if (rowIndex >= meta.node.childCount) return false;

  const { state, view } = editor;
  const types = tableNodeTypes(state.schema);
  const sourceRow = meta.node.child(rowIndex);

  let insertOffset = meta.tableStart;
  for (let i = 0; i <= rowIndex; i += 1) {
    insertOffset += meta.node.child(i).nodeSize;
  }

  const clonedCells: PmNode[] = [];
  for (let c = 0; c < sourceRow.childCount; c += 1) {
    const cell = sourceRow.child(c);
    const shouldBeHeader = meta.headerColumn && c === 0;
    const cellType = shouldBeHeader ? types.header_cell : types.cell;
    clonedCells.push(cellType.create(cell.attrs, cell.content, cell.marks));
  }

  const newRow = types.row.create(sourceRow.attrs, Fragment.fromArray(clonedCells));
  const tr = state.tr.insert(insertOffset, newRow);
  normalizeTableCellsInTransaction(
    tr,
    tablePos,
    state.schema,
    meta.headerRow,
    meta.headerColumn
  );

  view.dispatch(tr);
  return true;
}

/**
 * Empties all cell contents in `rowIndex` while preserving row cells and colors.
 */
export function clearTableRowContentsAt(
  editor: Editor,
  tablePos: number,
  rowIndex: number
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta || rowIndex < 0 || rowIndex >= meta.rowsCount) return false;

  const cellPositions = getUniqueCellPositionsForRow(meta.node, meta.tableStart, rowIndex);
  if (cellPositions.length === 0) return false;

  const { state, view } = editor;
  const paragraphType = state.schema.nodes.paragraph;
  if (!paragraphType) return false;

  const tr = state.tr;
  for (let i = cellPositions.length - 1; i >= 0; i -= 1) {
    const pos = cellPositions[i]!;
    const cell = tr.doc.nodeAt(pos);
    if (!cell) continue;
    const emptyPara = paragraphType.create();
    tr.replaceWith(pos + 1, pos + cell.nodeSize - 1, emptyPara);
  }

  view.dispatch(tr);
  return true;
}

/**
 * Deletes `rowIndex`, or deletes the entire table if it was the last remaining row.
 */
export function deleteTableRowAt(
  editor: Editor,
  tablePos: number,
  rowIndex: number
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta || rowIndex < 0 || rowIndex >= meta.rowsCount) return false;

  if (meta.rowsCount <= 1) {
    return deleteEntireTable(editor, tablePos);
  }

  const { state, view } = editor;
  const tr = state.tr;
  const map = TableMap.get(meta.node);

  removeRow(
    tr,
    {
      left: 0,
      top: rowIndex,
      right: map.width,
      bottom: rowIndex + 1,
      tableStart: meta.tableStart,
      map,
      table: meta.node,
    },
    rowIndex
  );

  normalizeTableCellsInTransaction(
    tr,
    tablePos,
    state.schema,
    meta.headerRow,
    meta.headerColumn
  );

  view.dispatch(tr);
  return true;
}

/**
 * Moves a table row from `fromRowIndex` to `toRowIndex` while maintaining header semantics.
 */
export function moveTableRow(
  editor: Editor,
  tablePos: number,
  fromRowIndex: number,
  toRowIndex: number
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (
    !meta ||
    fromRowIndex < 0 ||
    fromRowIndex >= meta.rowsCount ||
    toRowIndex < 0 ||
    toRowIndex >= meta.rowsCount ||
    fromRowIndex === toRowIndex
  ) {
    return false;
  }

  const rows: PmNode[] = [];
  for (let i = 0; i < meta.node.childCount; i += 1) {
    rows.push(meta.node.child(i));
  }
  if (rows.length !== meta.rowsCount) {
    return false;
  }

  const [movedRow] = rows.splice(fromRowIndex, 1);
  if (!movedRow) return false;
  rows.splice(toRowIndex, 0, movedRow);

  const { state, view } = editor;
  const updatedTable = meta.node.type.create(meta.node.attrs, Fragment.fromArray(rows));
  const tr = state.tr.replaceWith(tablePos, tablePos + meta.node.nodeSize, updatedTable);

  normalizeTableCellsInTransaction(
    tr,
    tablePos,
    state.schema,
    meta.headerRow,
    meta.headerColumn
  );

  view.dispatch(tr);
  return true;
}

/**
 * Inserts a blank column to the left or right of `colIndex`.
 */
export function insertTableColumnAt(
  editor: Editor,
  tablePos: number,
  colIndex: number,
  placement: 'left' | 'right'
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta || colIndex < 0 || colIndex >= meta.colsCount) return false;

  const { state, view } = editor;
  const tr = state.tr;
  const map = TableMap.get(meta.node);
  const insertIndex = placement === 'left' ? colIndex : colIndex + 1;

  addColumn(
    tr,
    {
      left: colIndex,
      top: 0,
      right: colIndex + 1,
      bottom: map.height,
      tableStart: meta.tableStart,
      map,
      table: meta.node,
    },
    insertIndex
  );

  normalizeTableCellsInTransaction(
    tr,
    tablePos,
    state.schema,
    meta.headerRow,
    meta.headerColumn
  );

  view.dispatch(tr);
  return true;
}

/**
 * Duplicates `colIndex` (preserving cell contents & styling) immediately to its right.
 */
export function duplicateTableColumnAt(
  editor: Editor,
  tablePos: number,
  colIndex: number
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta || colIndex < 0 || colIndex >= meta.colsCount) return false;

  const { state, view } = editor;
  const types = tableNodeTypes(state.schema);
  const map = TableMap.get(meta.node);

  const newRows: PmNode[] = [];
  for (let r = 0; r < meta.node.childCount; r += 1) {
    const row = meta.node.child(r);
    const cells: PmNode[] = [];
    const sourceRel = map.map[r * map.width + colIndex];
    const sourceCell = sourceRel !== undefined ? meta.node.nodeAt(sourceRel) : null;

    let inserted = false;
    for (let c = 0; c < row.childCount; c += 1) {
      const cell = row.child(c);
      cells.push(cell);
      if (c === colIndex && sourceCell) {
        const shouldBeHeader = meta.headerRow && r === 0;
        const cellType = shouldBeHeader ? types.header_cell : types.cell;
        cells.push(cellType.create(sourceCell.attrs, sourceCell.content, sourceCell.marks));
        inserted = true;
      }
    }

    if (!inserted && sourceCell) {
      const shouldBeHeader = meta.headerRow && r === 0;
      const cellType = shouldBeHeader ? types.header_cell : types.cell;
      cells.push(cellType.create(sourceCell.attrs, sourceCell.content, sourceCell.marks));
    }

    newRows.push(row.type.create(row.attrs, Fragment.fromArray(cells)));
  }

  const updatedTable = meta.node.type.create(meta.node.attrs, Fragment.fromArray(newRows));
  const tr = state.tr.replaceWith(tablePos, tablePos + meta.node.nodeSize, updatedTable);

  normalizeTableCellsInTransaction(
    tr,
    tablePos,
    state.schema,
    meta.headerRow,
    meta.headerColumn
  );

  view.dispatch(tr);
  return true;
}

/**
 * Empties all cell contents in `colIndex` while preserving column cells and colors.
 */
export function clearTableColumnContentsAt(
  editor: Editor,
  tablePos: number,
  colIndex: number
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta || colIndex < 0 || colIndex >= meta.colsCount) return false;

  const cellPositions = getUniqueCellPositionsForColumn(meta.node, meta.tableStart, colIndex);
  if (cellPositions.length === 0) return false;

  const { state, view } = editor;
  const paragraphType = state.schema.nodes.paragraph;
  if (!paragraphType) return false;

  const tr = state.tr;
  for (let i = cellPositions.length - 1; i >= 0; i -= 1) {
    const pos = cellPositions[i]!;
    const cell = tr.doc.nodeAt(pos);
    if (!cell) continue;
    const emptyPara = paragraphType.create();
    tr.replaceWith(pos + 1, pos + cell.nodeSize - 1, emptyPara);
  }

  view.dispatch(tr);
  return true;
}

/**
 * Deletes `colIndex`, or deletes the entire table if it was the last remaining column.
 */
export function deleteTableColumnAt(
  editor: Editor,
  tablePos: number,
  colIndex: number
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta || colIndex < 0 || colIndex >= meta.colsCount) return false;

  if (meta.colsCount <= 1) {
    return deleteEntireTable(editor, tablePos);
  }

  const { state, view } = editor;
  const tr = state.tr;
  const map = TableMap.get(meta.node);

  removeColumn(
    tr,
    {
      left: colIndex,
      top: 0,
      right: colIndex + 1,
      bottom: map.height,
      tableStart: meta.tableStart,
      map,
      table: meta.node,
    },
    colIndex
  );

  normalizeTableCellsInTransaction(
    tr,
    tablePos,
    state.schema,
    meta.headerRow,
    meta.headerColumn
  );

  view.dispatch(tr);
  return true;
}

/**
 * Moves a table column from `fromColIndex` to `toColIndex` while maintaining header semantics.
 */
export function moveTableColumn(
  editor: Editor,
  tablePos: number,
  fromColIndex: number,
  toColIndex: number
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (
    !meta ||
    fromColIndex < 0 ||
    fromColIndex >= meta.colsCount ||
    toColIndex < 0 ||
    toColIndex >= meta.colsCount ||
    fromColIndex === toColIndex
  ) {
    return false;
  }

  const newRows: PmNode[] = [];
  for (let r = 0; r < meta.node.childCount; r += 1) {
    const row = meta.node.child(r);
    if (row.childCount !== meta.colsCount) {
      return false;
    }
    const cells: PmNode[] = [];
    for (let c = 0; c < row.childCount; c += 1) {
      cells.push(row.child(c));
    }
    const [movedCell] = cells.splice(fromColIndex, 1);
    if (!movedCell) return false;
    cells.splice(toColIndex, 0, movedCell);
    newRows.push(row.type.create(row.attrs, Fragment.fromArray(cells)));
  }

  const { state, view } = editor;
  const updatedTable = meta.node.type.create(meta.node.attrs, Fragment.fromArray(newRows));
  const tr = state.tr.replaceWith(tablePos, tablePos + meta.node.nodeSize, updatedTable);

  normalizeTableCellsInTransaction(
    tr,
    tablePos,
    state.schema,
    meta.headerRow,
    meta.headerColumn
  );

  view.dispatch(tr);
  return true;
}

/**
 * Applies text and/or pastel background colors across every cell in `rowIndex`.
 */
export function setTableRowColor(
  editor: Editor,
  tablePos: number,
  rowIndex: number,
  update: BlockColorUpdate
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta) return false;
  const positions = getUniqueCellPositionsForRow(meta.node, meta.tableStart, rowIndex);
  return applyColorToCellPositions(editor, positions, update);
}

/**
 * Reads active text and background colors from cells in `rowIndex`.
 */
export function getTableRowColors(
  editor: Editor,
  tablePos: number,
  rowIndex: number
): { textColor: string | null; bgColor: string | null } {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta) return { textColor: null, bgColor: null };
  const positions = getUniqueCellPositionsForRow(meta.node, meta.tableStart, rowIndex);
  return summarizeCellColors(editor.state.doc, positions);
}

/**
 * Applies text and/or pastel background colors across every cell in `colIndex`.
 */
export function setTableColumnColor(
  editor: Editor,
  tablePos: number,
  colIndex: number,
  update: BlockColorUpdate
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta) return false;
  const positions = getUniqueCellPositionsForColumn(meta.node, meta.tableStart, colIndex);
  return applyColorToCellPositions(editor, positions, update);
}

/**
 * Reads active text and background colors from cells in `colIndex`.
 */
export function getTableColumnColors(
  editor: Editor,
  tablePos: number,
  colIndex: number
): { textColor: string | null; bgColor: string | null } {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta) return { textColor: null, bgColor: null };
  const positions = getUniqueCellPositionsForColumn(meta.node, meta.tableStart, colIndex);
  return summarizeCellColors(editor.state.doc, positions);
}

/**
 * Applies text and/or pastel background colors across every cell in the table.
 */
export function setTableAllCellsColor(
  editor: Editor,
  tablePos: number,
  update: BlockColorUpdate
): boolean {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta) return false;
  const positions = getAllUniqueCellPositions(meta.node, meta.tableStart);
  return applyColorToCellPositions(editor, positions, update);
}

/**
 * Reads active text and background colors across the whole table.
 */
export function getTableAllCellsColors(
  editor: Editor,
  tablePos: number
): { textColor: string | null; bgColor: string | null } {
  const meta = getTableMetadata(editor, tablePos);
  if (!meta) return { textColor: null, bgColor: null };
  const positions = getAllUniqueCellPositions(meta.node, meta.tableStart);
  return summarizeCellColors(editor.state.doc, positions);
}
