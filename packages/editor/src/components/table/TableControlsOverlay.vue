<template>
  <div
    v-if="!readOnly && activeTableBox"
    ref="overlayRef"
    class="mind-table-controls-overlay"
    data-testid="mind-table-controls-overlay"
    @mouseenter="isHoveringOverlay = true"
    @mouseleave="isHoveringOverlay = false"
  >
    <!-- Soft Blue Block Tint when Table Gutter Menu is Open (Image 5) -->
    <div
      v-if="isTableMenuHighlighted"
      class="table-block-menu-tint"
      data-testid="table-block-menu-tint"
      :style="tableBlockTintStyle"
    />

    <!-- Active Row or Column Selection Highlight Box (Notion Blue #1971c2) -->
    <div
      v-if="selectionRectStyle"
      class="table-axis-selection-box"
      :data-axis="selectedAxis?.axis"
      data-testid="table-axis-selection-box"
      :style="selectionRectStyle"
    />

    <!-- Reorder Drop Target Line -->
    <div
      v-if="reorderDrag?.active && reorderDrag.moved && reorderDrag.dropLine"
      class="table-reorder-drop-line"
      data-testid="table-reorder-drop-line"
      :style="{
        top: `${reorderDrag.dropLine.top}px`,
        left: `${reorderDrag.dropLine.left}px`,
        width: `${reorderDrag.dropLine.width}px`,
        height: `${reorderDrag.dropLine.height}px`,
      }"
    />

    <!-- Top Column Drag / Menu Handle (:::) -->
    <button
      v-if="colHandleStyle"
      type="button"
      class="table-axis-handle table-col-handle"
      :class="{ 'is-selected': isColHandleSelected }"
      aria-label="Ações da coluna"
      data-testid="table-col-handle"
      :style="colHandleStyle"
      @mousedown.stop.prevent="startReorderMouseDown('col', $event)"
      @click.stop="handleAxisHandleClick('col')"
    >
      <GripHorizontal :size="13" :stroke-width="2.2" />
    </button>

    <!-- Left Row Drag / Menu Handle (⠿) -->
    <button
      v-if="rowHandleStyle"
      type="button"
      class="table-axis-handle table-row-handle"
      :class="{ 'is-selected': isRowHandleSelected }"
      aria-label="Ações da linha"
      data-testid="table-row-handle"
      :style="rowHandleStyle"
      @mousedown.stop.prevent="startReorderMouseDown('row', $event)"
      @click.stop="handleAxisHandleClick('row')"
    >
      <GripVertical :size="13" :stroke-width="2.2" />
    </button>

    <!-- Bottom Add/Resize Rows Bar (+) -->
    <div
      class="table-add-bar-anchor table-add-row-anchor"
      :style="addRowBarStyle"
      @mouseenter="hoveredAddBar = 'row'"
      @mouseleave="hoveredAddBar = hoveredAddBar === 'row' ? null : hoveredAddBar"
    >
      <button
        type="button"
        class="table-add-bar table-add-row-bar"
        aria-label="Adicionar ou arrastar linhas"
        data-testid="table-add-row-bar"
        @mousedown.stop.prevent="startDimensionDrag('row', $event)"
        @click.stop="handleAddBarClick('row')"
      >
        <Plus :size="13" :stroke-width="2.2" />
      </button>

      <div
        v-if="hoveredAddBar === 'row' || (dimDrag?.active && dimDrag.axis === 'row')"
        class="table-bar-tooltip table-bar-tooltip-bottom"
        role="tooltip"
        data-testid="table-add-row-tooltip"
      >
        <div><strong>Clique</strong> para adicionar uma nova linha</div>
        <div><strong>Arraste</strong> para adicionar ou remover linhas</div>
      </div>
    </div>

    <!-- Right Add/Resize Columns Bar (+) -->
    <div
      class="table-add-bar-anchor table-add-col-anchor"
      :style="addColBarStyle"
      @mouseenter="hoveredAddBar = 'col'"
      @mouseleave="hoveredAddBar = hoveredAddBar === 'col' ? null : hoveredAddBar"
    >
      <button
        type="button"
        class="table-add-bar table-add-col-bar"
        aria-label="Adicionar ou arrastar colunas"
        data-testid="table-add-col-bar"
        @mousedown.stop.prevent="startDimensionDrag('col', $event)"
        @click.stop="handleAddBarClick('col')"
      >
        <Plus :size="13" :stroke-width="2.2" />
      </button>

      <div
        v-if="hoveredAddBar === 'col' || (dimDrag?.active && dimDrag.axis === 'col')"
        class="table-bar-tooltip table-bar-tooltip-right"
        role="tooltip"
        data-testid="table-add-col-tooltip"
      >
        <div><strong>Clique</strong> para adicionar uma nova coluna</div>
        <div><strong>Arraste</strong> para adicionar ou remover colunas</div>
      </div>
    </div>

    <!-- Row / Column Context Menu -->
    <TableAxisContextMenu
      v-if="axisMenuOpen && selectedAxis && activeMeta"
      :axis="selectedAxis.axis"
      :axis-index="selectedAxis.index"
      :header-row="activeMeta.headerRow"
      :header-column="activeMeta.headerColumn"
      :active-text-color="activeAxisColors.textColor"
      :active-bg-color="activeAxisColors.bgColor"
      :last-used-text-color="lastUsedTextColor"
      :last-used-bg-color="lastUsedBgColor"
      :top="axisMenuPosition.top"
      :left="axisMenuPosition.left"
      @close="closeAxisMenu"
      @toggle-header-row="handleToggleHeaderRow"
      @toggle-header-column="handleToggleHeaderColumn"
      @set-color="handleSetAxisColor"
      @insert-before="handleInsertAxis('before')"
      @insert-after="handleInsertAxis('after')"
      @duplicate="handleDuplicateAxis"
      @clear-contents="handleClearAxis"
      @delete-axis="handleDeleteAxis"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Editor } from '@tiptap/core';
import { GripHorizontal, GripVertical, Plus } from 'lucide-vue-next';
import TableAxisContextMenu from './TableAxisContextMenu.vue';
import {
  clearTableColumnContentsAt,
  clearTableRowContentsAt,
  deleteTableColumnAt,
  deleteTableRowAt,
  duplicateTableColumnAt,
  duplicateTableRowAt,
  findEnclosingTablePos,
  getTableColumnColors,
  getTableMetadata,
  getTableRowColors,
  insertTableColumnAt,
  insertTableRowAt,
  moveTableColumn,
  moveTableRow,
  setTableColumnColor,
  setTableCountDimensions,
  setTableRowColor,
  toggleTableHeaderColumn,
  toggleTableHeaderRow,
} from '../../extensions/table-operations.js';
import { normalizeBlockColorValue } from '../../extensions/block-color.js';
import {
  LAST_BG_COLOR_STORAGE_KEY,
  LAST_TEXT_COLOR_STORAGE_KEY,
  readStoredColor,
  writeStoredColor,
} from '../gutter/gutter-helpers.js';
import type { BlockColorUpdate } from '../../types.js';

interface BoxRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const props = withDefaults(
  defineProps<{
    editor?: Editor;
    readOnly?: boolean;
    menuHighlightedTablePos?: number | null;
  }>(),
  {
    editor: undefined,
    readOnly: false,
    menuHighlightedTablePos: null,
  }
);

const emit = defineEmits<{
  (e: 'menuToggle', isOpen: boolean): void;
}>();

const overlayRef = ref<HTMLElement | null>(null);
const isHoveringOverlay = ref(false);
const hoveredTablePos = ref<number | null>(null);
const hoveredRowIndex = ref<number | null>(null);
const hoveredColIndex = ref<number | null>(null);
const hoveredAddBar = ref<'row' | 'col' | null>(null);

const selectedAxis = ref<{
  tablePos: number;
  axis: 'row' | 'col';
  index: number;
} | null>(null);
const axisMenuOpen = ref(false);
const axisMenuPosition = ref({ top: 0, left: 0 });

const activeTableBox = ref<BoxRect | null>(null);
const rowBoxes = ref<BoxRect[]>([]);
const colBoxes = ref<BoxRect[]>([]);
const tableStateRevision = ref(0);

const lastUsedTextColor = ref<string | null>(readStoredColor(LAST_TEXT_COLOR_STORAGE_KEY));
const lastUsedBgColor = ref<string | null>(readStoredColor(LAST_BG_COLOR_STORAGE_KEY));

const dimDrag = ref<{
  active: boolean;
  axis: 'row' | 'col';
  tablePos: number;
  startX: number;
  startY: number;
  startRows: number;
  startCols: number;
  stepSize: number;
  moved: boolean;
} | null>(null);

const reorderDrag = ref<{
  active: boolean;
  axis: 'row' | 'col';
  tablePos: number;
  fromIndex: number;
  targetIndex: number;
  startX: number;
  startY: number;
  moved: boolean;
  dropLine: BoxRect | null;
} | null>(null);

let suppressNextBarClick: 'row' | 'col' | null = null;
let suppressNextHandleClick: 'row' | 'col' | null = null;

const activeTablePos = computed<number | null>(
  () => props.menuHighlightedTablePos ?? selectedAxis.value?.tablePos ?? hoveredTablePos.value
);

const isTableMenuHighlighted = computed(
  () =>
    props.menuHighlightedTablePos !== null &&
    props.menuHighlightedTablePos !== undefined &&
    activeTableBox.value !== null
);

const tableBlockTintStyle = computed(() => {
  if (!activeTableBox.value) return {};
  return {
    top: `${activeTableBox.value.top}px`,
    left: `${activeTableBox.value.left}px`,
    width: `${activeTableBox.value.width}px`,
    height: `${activeTableBox.value.height}px`,
  };
});

const activeMeta = computed(() => {
  void tableStateRevision.value;
  if (!props.editor || activeTablePos.value === null) return null;
  return getTableMetadata(props.editor, activeTablePos.value);
});

const displayRowIndex = computed<number | null>(() => {
  if (selectedAxis.value?.axis === 'row') return selectedAxis.value.index;
  return hoveredRowIndex.value;
});

const displayColIndex = computed<number | null>(() => {
  if (selectedAxis.value?.axis === 'col') return selectedAxis.value.index;
  return hoveredColIndex.value;
});

const isRowHandleSelected = computed(
  () =>
    selectedAxis.value !== null &&
    selectedAxis.value.axis === 'row' &&
    selectedAxis.value.index === displayRowIndex.value
);

const isColHandleSelected = computed(
  () =>
    selectedAxis.value !== null &&
    selectedAxis.value.axis === 'col' &&
    selectedAxis.value.index === displayColIndex.value
);

const activeAxisColors = computed(() => {
  void tableStateRevision.value;
  if (!props.editor || !selectedAxis.value) {
    return { textColor: null, bgColor: null };
  }
  return selectedAxis.value.axis === 'row'
    ? getTableRowColors(props.editor, selectedAxis.value.tablePos, selectedAxis.value.index)
    : getTableColumnColors(props.editor, selectedAxis.value.tablePos, selectedAxis.value.index);
});

const selectionRectStyle = computed(() => {
  if (!selectedAxis.value || !activeTableBox.value) return null;
  if (selectedAxis.value.axis === 'row') {
    const row = rowBoxes.value[selectedAxis.value.index];
    if (!row) return null;
    return {
      top: `${row.top}px`,
      left: `${activeTableBox.value.left}px`,
      width: `${activeTableBox.value.width}px`,
      height: `${row.height}px`,
    };
  }
  const col = colBoxes.value[selectedAxis.value.index];
  if (!col) return null;
  return {
    top: `${activeTableBox.value.top}px`,
    left: `${col.left}px`,
    width: `${col.width}px`,
    height: `${activeTableBox.value.height}px`,
  };
});

const colHandleStyle = computed(() => {
  if (!activeTableBox.value || displayColIndex.value === null) return null;
  const col = colBoxes.value[displayColIndex.value];
  if (!col) return null;
  return {
    top: `${activeTableBox.value.top - 8}px`,
    left: `${col.left + col.width / 2 - 12}px`,
  };
});

const rowHandleStyle = computed(() => {
  if (!activeTableBox.value || displayRowIndex.value === null) return null;
  const row = rowBoxes.value[displayRowIndex.value];
  if (!row) return null;
  return {
    top: `${row.top + row.height / 2 - 12}px`,
    left: `${activeTableBox.value.left - 8}px`,
  };
});

const addRowBarStyle = computed(() => {
  if (!activeTableBox.value) return {};
  return {
    top: `${activeTableBox.value.top + activeTableBox.value.height + 5}px`,
    left: `${activeTableBox.value.left}px`,
    width: `${activeTableBox.value.width}px`,
  };
});

const addColBarStyle = computed(() => {
  if (!activeTableBox.value) return {};
  return {
    top: `${activeTableBox.value.top}px`,
    left: `${activeTableBox.value.left + activeTableBox.value.width + 6}px`,
    height: `${activeTableBox.value.height}px`,
  };
});

function getShellElement(): HTMLElement | null {
  if (overlayRef.value?.parentElement) {
    return overlayRef.value.parentElement;
  }
  const dom = props.editor?.view?.dom;
  if (!dom) return null;
  return (dom.closest('.mind-editor-canvas-container') || dom.parentElement) as HTMLElement | null;
}

function resolveTableDomForPos(tablePos: number): HTMLTableElement | null {
  const ed = props.editor;
  if (!ed) return null;
  const dom = ed.view.nodeDOM(tablePos);
  if (dom instanceof HTMLTableElement) return dom;
  if (dom instanceof Element) {
    const inner = dom.querySelector('table');
    if (inner instanceof HTMLTableElement) return inner;
  }
  return null;
}

function findTablePosForElement(tableEl: Element): number | null {
  const ed = props.editor;
  if (!ed) return null;

  const wrapper = tableEl.closest('.tableWrapper') || tableEl;
  let foundPos: number | null = null;

  ed.state.doc.descendants((node, pos) => {
    if (foundPos !== null) return false;
    if (node.type.name === 'table') {
      const nodeDom = ed.view.nodeDOM(pos);
      if (
        nodeDom === tableEl ||
        nodeDom === wrapper ||
        (nodeDom instanceof Element && nodeDom.contains(tableEl))
      ) {
        foundPos = pos;
        return false;
      }
    }
    return true;
  });

  if (foundPos !== null) return foundPos;

  try {
    const firstCell = tableEl.querySelector('th, td') || tableEl;
    const rawPos = ed.view.posAtDOM(firstCell, 0);
    return findEnclosingTablePos(ed.state.doc, rawPos);
  } catch {
    return null;
  }
}

function measureTableGeometry(tablePos: number | null): void {
  if (tablePos === null || !props.editor) {
    activeTableBox.value = null;
    rowBoxes.value = [];
    colBoxes.value = [];
    return;
  }

  const shellEl = getShellElement();
  const tableEl = resolveTableDomForPos(tablePos);
  if (!shellEl || !tableEl) {
    activeTableBox.value = null;
    rowBoxes.value = [];
    colBoxes.value = [];
    return;
  }

  const shellRect = shellEl.getBoundingClientRect();
  const tableRect = tableEl.getBoundingClientRect();
  const rows = Array.from(tableEl.querySelectorAll('tr'));
  if (rows.length === 0) {
    activeTableBox.value = null;
    rowBoxes.value = [];
    colBoxes.value = [];
    return;
  }

  const measuredRows: BoxRect[] = rows.map((tr) => {
    const r = tr.getBoundingClientRect();
    return {
      top: r.top - shellRect.top,
      left: tableRect.left - shellRect.left,
      width: tableRect.width,
      height: r.height,
    };
  });

  const firstRowCells = Array.from(rows[0]!.children).filter(
    (el) => el.tagName === 'TD' || el.tagName === 'TH'
  );
  const measuredCols: BoxRect[] = firstRowCells.map((cell) => {
    const c = cell.getBoundingClientRect();
    return {
      top: tableRect.top - shellRect.top,
      left: c.left - shellRect.left,
      width: c.width,
      height: tableRect.height,
    };
  });

  activeTableBox.value = {
    top: tableRect.top - shellRect.top,
    left: tableRect.left - shellRect.left,
    width: tableRect.width,
    height: tableRect.height,
  };
  rowBoxes.value = measuredRows;
  colBoxes.value = measuredCols;
}

function resolveHoveredIndicesFromPoint(
  tableEl: HTMLTableElement,
  clientX: number,
  clientY: number
): { rowIndex: number | null; colIndex: number | null } {
  const rows = Array.from(tableEl.querySelectorAll('tr'));
  if (rows.length === 0) return { rowIndex: null, colIndex: null };

  let rowIndex: number | null = null;
  let bestRowDist = Number.POSITIVE_INFINITY;
  rows.forEach((tr, idx) => {
    const r = tr.getBoundingClientRect();
    if (clientY >= r.top && clientY <= r.bottom) {
      rowIndex = idx;
      bestRowDist = 0;
    } else {
      const dist = Math.min(Math.abs(clientY - r.top), Math.abs(clientY - r.bottom));
      if (dist < bestRowDist && dist <= 24) {
        bestRowDist = dist;
        rowIndex = idx;
      }
    }
  });

  const firstRowCells = Array.from(rows[0]!.children).filter(
    (el) => el.tagName === 'TD' || el.tagName === 'TH'
  );
  let colIndex: number | null = null;
  let bestColDist = Number.POSITIVE_INFINITY;
  firstRowCells.forEach((cell, idx) => {
    const c = cell.getBoundingClientRect();
    if (clientX >= c.left && clientX <= c.right) {
      colIndex = idx;
      bestColDist = 0;
    } else {
      const dist = Math.min(Math.abs(clientX - c.left), Math.abs(clientX - c.right));
      if (dist < bestColDist && dist <= 24) {
        bestColDist = dist;
        colIndex = idx;
      }
    }
  });

  return { rowIndex, colIndex };
}

function syncFromEditorSelection(): void {
  const ed = props.editor;
  if (!ed || props.readOnly) return;

  if (selectedAxis.value) {
    const meta = getTableMetadata(ed, selectedAxis.value.tablePos);
    if (!meta) {
      clearAxisSelection();
    } else {
      measureTableGeometry(selectedAxis.value.tablePos);
    }
    return;
  }

  if (hoveredTablePos.value !== null) {
    measureTableGeometry(hoveredTablePos.value);
    return;
  }

  const enclosing = findEnclosingTablePos(ed.state.doc, ed.state.selection.from);
  if (enclosing !== null) {
    hoveredTablePos.value = enclosing;
    measureTableGeometry(enclosing);
  }
}

function updateAxisMenuAnchor(axis: 'row' | 'col', index: number): void {
  if (!activeTableBox.value) return;
  if (axis === 'col') {
    const col = colBoxes.value[index];
    if (!col) return;
    axisMenuPosition.value = {
      top: Math.round(activeTableBox.value.top + 12),
      left: Math.round(col.left + col.width / 2 - 20),
    };
  } else {
    const row = rowBoxes.value[index];
    if (!row) return;
    axisMenuPosition.value = {
      top: Math.round(row.top + row.height + 4),
      left: Math.round(activeTableBox.value.left + 8),
    };
  }
}

function clearAxisSelection(): void {
  selectedAxis.value = null;
  if (axisMenuOpen.value) {
    axisMenuOpen.value = false;
    emit('menuToggle', false);
  }
}

function closeAxisMenu(): void {
  if (axisMenuOpen.value) {
    axisMenuOpen.value = false;
    emit('menuToggle', false);
  }
}

function handleAxisHandleClick(axis: 'row' | 'col'): void {
  if (suppressNextHandleClick === axis) {
    suppressNextHandleClick = null;
    return;
  }
  const tablePos = activeTablePos.value;
  const index = axis === 'row' ? displayRowIndex.value : displayColIndex.value;
  if (tablePos === null || index === null) return;

  if (
    axisMenuOpen.value &&
    selectedAxis.value?.tablePos === tablePos &&
    selectedAxis.value.axis === axis &&
    selectedAxis.value.index === index
  ) {
    clearAxisSelection();
    return;
  }

  selectedAxis.value = { tablePos, axis, index };
  measureTableGeometry(tablePos);
  updateAxisMenuAnchor(axis, index);
  axisMenuOpen.value = true;
  emit('menuToggle', true);
}

function handleAddBarClick(axis: 'row' | 'col'): void {
  if (suppressNextBarClick === axis) {
    suppressNextBarClick = null;
    return;
  }
  const ed = props.editor;
  const tablePos = activeTablePos.value;
  if (!ed || tablePos === null) return;
  const meta = getTableMetadata(ed, tablePos);
  if (!meta) return;

  if (axis === 'row') {
    setTableCountDimensions(ed, tablePos, meta.rowsCount + 1, meta.colsCount);
  } else {
    setTableCountDimensions(ed, tablePos, meta.rowsCount, meta.colsCount + 1);
  }
  nextTick(() => measureTableGeometry(tablePos));
}

function startDimensionDrag(axis: 'row' | 'col', event: MouseEvent): void {
  const ed = props.editor;
  const tablePos = activeTablePos.value;
  if (!ed || tablePos === null || event.button !== 0) return;
  measureTableGeometry(tablePos);
  const meta = getTableMetadata(ed, tablePos);
  if (!meta) return;

  const nonZeroRowHeights = rowBoxes.value.map((r) => r.height).filter((h) => h > 0);
  const avgRowHeight =
    nonZeroRowHeights.length > 0
      ? nonZeroRowHeights.reduce((acc, h) => acc + h, 0) / nonZeroRowHeights.length
      : 36;
  const nonZeroColWidths = colBoxes.value.map((c) => c.width).filter((w) => w > 0);
  const avgColWidth =
    nonZeroColWidths.length > 0
      ? nonZeroColWidths.reduce((acc, w) => acc + w, 0) / nonZeroColWidths.length
      : 110;

  dimDrag.value = {
    active: true,
    axis,
    tablePos,
    startX: event.clientX,
    startY: event.clientY,
    startRows: meta.rowsCount,
    startCols: meta.colsCount,
    stepSize:
      axis === 'row'
        ? Math.max(28, avgRowHeight)
        : Math.max(70, Math.min(140, avgColWidth)),
    moved: false,
  };
}

function computeDropTargetForReorder(
  axis: 'row' | 'col',
  clientX: number,
  clientY: number
): { targetIndex: number; dropLine: BoxRect } | null {
  const shellEl = getShellElement();
  const tableBox = activeTableBox.value;
  if (!shellEl || !tableBox) return null;
  const shellRect = shellEl.getBoundingClientRect();

  if (axis === 'col') {
    if (colBoxes.value.length === 0) return null;
    const localX = clientX - shellRect.left;
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    colBoxes.value.forEach((col, idx) => {
      const center = col.left + col.width / 2;
      const dist = Math.abs(localX - center);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    const targetCol = colBoxes.value[bestIdx]!;
    const fromIdx = reorderDrag.value?.fromIndex ?? bestIdx;
    const lineLeft =
      bestIdx > fromIdx ? targetCol.left + targetCol.width - 1 : targetCol.left - 1;
    return {
      targetIndex: bestIdx,
      dropLine: {
        top: tableBox.top,
        left: lineLeft,
        width: 2,
        height: tableBox.height,
      },
    };
  }

  if (rowBoxes.value.length === 0) return null;
  const localY = clientY - shellRect.top;
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  rowBoxes.value.forEach((row, idx) => {
    const center = row.top + row.height / 2;
    const dist = Math.abs(localY - center);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = idx;
    }
  });
  const targetRow = rowBoxes.value[bestIdx]!;
  const fromIdx = reorderDrag.value?.fromIndex ?? bestIdx;
  const lineTop = bestIdx > fromIdx ? targetRow.top + targetRow.height - 1 : targetRow.top - 1;
  return {
    targetIndex: bestIdx,
    dropLine: {
      top: lineTop,
      left: tableBox.left,
      width: tableBox.width,
      height: 2,
    },
  };
}

function startReorderMouseDown(axis: 'row' | 'col', event: MouseEvent): void {
  const tablePos = activeTablePos.value;
  const index = axis === 'row' ? displayRowIndex.value : displayColIndex.value;
  if (tablePos === null || index === null || event.button !== 0) return;
  measureTableGeometry(tablePos);

  reorderDrag.value = {
    active: true,
    axis,
    tablePos,
    fromIndex: index,
    targetIndex: index,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    dropLine: null,
  };
}

function handleToggleHeaderRow(): void {
  if (!props.editor || !selectedAxis.value) return;
  toggleTableHeaderRow(props.editor, selectedAxis.value.tablePos);
  tableStateRevision.value += 1;
  nextTick(() => measureTableGeometry(selectedAxis.value?.tablePos ?? null));
}

function handleToggleHeaderColumn(): void {
  if (!props.editor || !selectedAxis.value) return;
  toggleTableHeaderColumn(props.editor, selectedAxis.value.tablePos);
  tableStateRevision.value += 1;
  nextTick(() => measureTableGeometry(selectedAxis.value?.tablePos ?? null));
}

function handleSetAxisColor(payload: BlockColorUpdate): void {
  if (!props.editor || !selectedAxis.value) return;
  const { tablePos, axis, index } = selectedAxis.value;

  if (payload.textColor !== undefined) {
    const normalized = normalizeBlockColorValue(payload.textColor);
    if (normalized) {
      lastUsedTextColor.value = normalized;
      writeStoredColor(LAST_TEXT_COLOR_STORAGE_KEY, normalized);
    }
  }
  if (payload.backgroundColor !== undefined) {
    const normalized = normalizeBlockColorValue(payload.backgroundColor);
    if (normalized) {
      lastUsedBgColor.value = normalized;
      writeStoredColor(LAST_BG_COLOR_STORAGE_KEY, normalized);
    }
  }

  if (axis === 'row') {
    setTableRowColor(props.editor, tablePos, index, payload);
  } else {
    setTableColumnColor(props.editor, tablePos, index, payload);
  }
  tableStateRevision.value += 1;
  closeAxisMenu();
  nextTick(() => measureTableGeometry(tablePos));
}

function handleInsertAxis(placement: 'before' | 'after'): void {
  if (!props.editor || !selectedAxis.value) return;
  const { tablePos, axis, index } = selectedAxis.value;
  if (axis === 'row') {
    insertTableRowAt(props.editor, tablePos, index, placement === 'before' ? 'above' : 'below');
  } else {
    insertTableColumnAt(props.editor, tablePos, index, placement === 'before' ? 'left' : 'right');
  }
  const nextIndex = placement === 'before' ? index + 1 : index;
  selectedAxis.value = { tablePos, axis, index: nextIndex };
  closeAxisMenu();
  nextTick(() => measureTableGeometry(tablePos));
}

function handleDuplicateAxis(): void {
  if (!props.editor || !selectedAxis.value) return;
  const { tablePos, axis, index } = selectedAxis.value;
  const ok =
    axis === 'row'
      ? duplicateTableRowAt(props.editor, tablePos, index)
      : duplicateTableColumnAt(props.editor, tablePos, index);
  if (ok) {
    selectedAxis.value = { tablePos, axis, index: index + 1 };
  }
  closeAxisMenu();
  nextTick(() => measureTableGeometry(tablePos));
}

function handleClearAxis(): void {
  if (!props.editor || !selectedAxis.value) return;
  const { tablePos, axis, index } = selectedAxis.value;
  if (axis === 'row') {
    clearTableRowContentsAt(props.editor, tablePos, index);
  } else {
    clearTableColumnContentsAt(props.editor, tablePos, index);
  }
  closeAxisMenu();
  nextTick(() => measureTableGeometry(tablePos));
}

function handleDeleteAxis(): void {
  if (!props.editor || !selectedAxis.value) return;
  const { tablePos, axis, index } = selectedAxis.value;
  if (axis === 'row') {
    deleteTableRowAt(props.editor, tablePos, index);
  } else {
    deleteTableColumnAt(props.editor, tablePos, index);
  }
  clearAxisSelection();
  hoveredTablePos.value = null;
  hoveredRowIndex.value = null;
  hoveredColIndex.value = null;
  nextTick(() => syncFromEditorSelection());
}

function onWindowMouseMove(event: MouseEvent): void {
  const ed = props.editor;
  if (!ed || props.readOnly || !ed.view.dom.isConnected) return;

  if (dimDrag.value?.active) {
    const drag = dimDrag.value;
    const dist =
      drag.axis === 'row' ? event.clientY - drag.startY : event.clientX - drag.startX;
    if (Math.abs(dist) >= 8) {
      drag.moved = true;
    }
    const meta = getTableMetadata(ed, drag.tablePos);
    if (meta && drag.moved) {
      const delta = Math.round(dist / drag.stepSize);
      if (drag.axis === 'row') {
        const nextRows = Math.max(1, drag.startRows + delta);
        if (nextRows !== meta.rowsCount) {
          setTableCountDimensions(ed, drag.tablePos, nextRows, meta.colsCount);
          nextTick(() => measureTableGeometry(drag.tablePos));
        }
      } else {
        const nextCols = Math.max(1, drag.startCols + delta);
        if (nextCols !== meta.colsCount) {
          setTableCountDimensions(ed, drag.tablePos, meta.rowsCount, nextCols);
          nextTick(() => measureTableGeometry(drag.tablePos));
        }
      }
    }
    return;
  }

  if (reorderDrag.value?.active) {
    const drag = reorderDrag.value;
    if (
      !drag.moved &&
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 5
    ) {
      drag.moved = true;
      if (axisMenuOpen.value) {
        closeAxisMenu();
      }
    }
    if (drag.moved) {
      const resolved = computeDropTargetForReorder(drag.axis, event.clientX, event.clientY);
      if (resolved) {
        drag.targetIndex = resolved.targetIndex;
        drag.dropLine = resolved.dropLine;
      }
    }
    return;
  }

  if (axisMenuOpen.value) {
    return;
  }

  const targetEl = event.target instanceof Element ? event.target : null;
  if (
    targetEl?.closest('.mind-table-controls-overlay') ||
    targetEl?.closest('.table-axis-popover')
  ) {
    return;
  }

  const directTable = targetEl?.closest('table');
  let hitTable: HTMLTableElement | null =
    directTable instanceof HTMLTableElement && ed.view.dom.contains(directTable)
      ? directTable
      : null;

  if (!hitTable) {
    const tables = Array.from(ed.view.dom.querySelectorAll('table'));
    for (const candidate of tables) {
      const rect = candidate.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (
        event.clientX >= rect.left - 20 &&
        event.clientX <= rect.right + 28 &&
        event.clientY >= rect.top - 16 &&
        event.clientY <= rect.bottom + 28
      ) {
        hitTable = candidate;
        break;
      }
    }
  }

  if (!hitTable) {
    const enclosing = findEnclosingTablePos(ed.state.doc, ed.state.selection.from);
    if (enclosing !== null) {
      hoveredTablePos.value = enclosing;
      hoveredRowIndex.value = null;
      hoveredColIndex.value = null;
      measureTableGeometry(enclosing);
    } else if (!selectedAxis.value && !isHoveringOverlay.value) {
      hoveredTablePos.value = null;
      hoveredRowIndex.value = null;
      hoveredColIndex.value = null;
      measureTableGeometry(null);
    }
    return;
  }

  const tablePos = findTablePosForElement(hitTable);
  if (tablePos === null) return;

  hoveredTablePos.value = tablePos;
  const indices = resolveHoveredIndicesFromPoint(hitTable, event.clientX, event.clientY);
  hoveredRowIndex.value = indices.rowIndex;
  hoveredColIndex.value = indices.colIndex;
  measureTableGeometry(tablePos);
}

function onWindowMouseUp(): void {
  if (dimDrag.value?.active) {
    const drag = dimDrag.value;
    dimDrag.value = null;
    if (!drag.moved) {
      suppressNextBarClick = drag.axis;
      const meta = props.editor ? getTableMetadata(props.editor, drag.tablePos) : null;
      if (props.editor && meta) {
        if (drag.axis === 'row') {
          setTableCountDimensions(props.editor, drag.tablePos, meta.rowsCount + 1, meta.colsCount);
        } else {
          setTableCountDimensions(props.editor, drag.tablePos, meta.rowsCount, meta.colsCount + 1);
        }
        nextTick(() => measureTableGeometry(drag.tablePos));
      }
    }
    return;
  }

  if (reorderDrag.value?.active) {
    const drag = reorderDrag.value;
    reorderDrag.value = null;
    if (drag.moved) {
      suppressNextHandleClick = drag.axis;
      if (props.editor && drag.targetIndex !== drag.fromIndex) {
        const moved =
          drag.axis === 'row'
            ? moveTableRow(props.editor, drag.tablePos, drag.fromIndex, drag.targetIndex)
            : moveTableColumn(props.editor, drag.tablePos, drag.fromIndex, drag.targetIndex);
        if (moved) {
          selectedAxis.value = {
            tablePos: drag.tablePos,
            axis: drag.axis,
            index: drag.targetIndex,
          };
          if (drag.axis === 'row') hoveredRowIndex.value = drag.targetIndex;
          else hoveredColIndex.value = drag.targetIndex;
        }
      }
      nextTick(() => measureTableGeometry(drag.tablePos));
    } else {
      suppressNextHandleClick = drag.axis;
      selectedAxis.value = {
        tablePos: drag.tablePos,
        axis: drag.axis,
        index: drag.fromIndex,
      };
      measureTableGeometry(drag.tablePos);
      updateAxisMenuAnchor(drag.axis, drag.fromIndex);
      axisMenuOpen.value = true;
      emit('menuToggle', true);
    }
  }
}

function onWindowMouseDown(event: MouseEvent): void {
  if (!selectedAxis.value && !axisMenuOpen.value) return;
  const target = event.target instanceof Element ? event.target : null;
  if (
    target?.closest('.table-axis-popover') ||
    target?.closest('.table-axis-handle') ||
    target?.closest('.block-actions-popover')
  ) {
    return;
  }
  clearAxisSelection();
}

function onWindowKeydown(event: KeyboardEvent): void {
  if (props.readOnly || !props.editor || !selectedAxis.value) return;

  const target = event.target instanceof HTMLElement ? event.target : null;
  if (target?.closest('input, textarea, select')) {
    if (event.key === 'Escape' && axisMenuOpen.value) {
      event.preventDefault();
      closeAxisMenu();
    }
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    if (axisMenuOpen.value) {
      closeAxisMenu();
    } else {
      clearAxisSelection();
    }
    return;
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    handleDeleteAxis();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    handleDuplicateAxis();
  }
}

function onEditorStateChange(): void {
  tableStateRevision.value += 1;
  nextTick(() => syncFromEditorSelection());
}

watch(
  () => props.editor,
  (nextEd, prevEd) => {
    if (prevEd) {
      prevEd.off('transaction', onEditorStateChange);
      prevEd.off('selectionUpdate', onEditorStateChange);
    }
    if (nextEd) {
      nextEd.on('transaction', onEditorStateChange);
      nextEd.on('selectionUpdate', onEditorStateChange);
      nextTick(() => syncFromEditorSelection());
    }
  },
  { immediate: true }
);

watch(
  () => props.menuHighlightedTablePos,
  (pos) => {
    if (pos !== null && pos !== undefined) {
      nextTick(() => measureTableGeometry(pos));
    }
  }
);

watch(
  () => props.readOnly,
  (isRo) => {
    if (isRo) {
      clearAxisSelection();
      hoveredTablePos.value = null;
      activeTableBox.value = null;
    }
  }
);

onMounted(() => {
  if (typeof window === 'undefined') return;
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup', onWindowMouseUp);
  window.addEventListener('mousedown', onWindowMouseDown);
  window.addEventListener('keydown', onWindowKeydown);
  window.addEventListener('resize', onEditorStateChange);
});

onBeforeUnmount(() => {
  if (props.editor) {
    props.editor.off('transaction', onEditorStateChange);
    props.editor.off('selectionUpdate', onEditorStateChange);
  }
  if (typeof window === 'undefined') return;
  window.removeEventListener('mousemove', onWindowMouseMove);
  window.removeEventListener('mouseup', onWindowMouseUp);
  window.removeEventListener('mousedown', onWindowMouseDown);
  window.removeEventListener('keydown', onWindowKeydown);
  window.removeEventListener('resize', onEditorStateChange);
});

defineExpose({
  clearAxisSelection,
  refreshGeometry: syncFromEditorSelection,
});
</script>

<style scoped>
.mind-table-controls-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 40;
}

.table-block-menu-tint {
  position: absolute;
  background-color: rgba(25, 113, 194, 0.13);
  border: 1px solid rgba(25, 113, 194, 0.2);
  border-radius: 3px;
  pointer-events: none;
  box-sizing: border-box;
  z-index: 41;
}

.table-axis-selection-box {
  position: absolute;
  border: 2px solid #1971c2;
  background-color: rgba(25, 113, 194, 0.04);
  border-radius: 2px;
  pointer-events: none;
  box-sizing: border-box;
  z-index: 42;
}

.table-reorder-drop-line {
  position: absolute;
  background-color: #1971c2;
  border-radius: 2px;
  pointer-events: none;
  z-index: 60;
}

.table-axis-handle {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid #dee2e6;
  background-color: #ffffff;
  color: #868e96;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  z-index: 48;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.table-col-handle {
  width: 24px;
  height: 15px;
}

.table-row-handle {
  width: 15px;
  height: 24px;
}

.table-axis-handle:hover {
  background-color: #f1f3f5;
  color: #212529;
  border-color: #adb5bd;
}

.table-axis-handle.is-selected {
  background-color: #1971c2;
  border-color: #1971c2;
  color: #ffffff;
}

.table-add-bar-anchor {
  position: absolute;
  pointer-events: auto;
  z-index: 44;
}

.table-add-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  background-color: #f1f3f5;
  color: #868e96;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.table-add-row-anchor {
  height: 18px;
}

.table-add-col-anchor {
  width: 18px;
}

.table-add-bar:hover {
  background-color: #e9ecef;
  color: #495057;
}

.table-bar-tooltip {
  position: absolute;
  background-color: #25262b;
  color: #ffffff;
  padding: 7px 11px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.45;
  white-space: nowrap;
  pointer-events: none;
  z-index: 160;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
  text-align: center;
}

.table-bar-tooltip strong {
  font-weight: 600;
  color: #ffffff;
}

.table-bar-tooltip-bottom {
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.table-bar-tooltip-right {
  top: calc(100% + 8px);
  right: 0;
}
</style>
