import { computed, reactive, ref, watch, type Ref } from 'vue';
import type { MindPage } from '@mind-hub/shared';
import type { EditorFrontmatter } from '@mind-hub/editor';

const STORAGE_PAGE_PROPS_KEY = 'mind_hub_page_properties';

function loadStoredPageProperties(): Record<string, EditorFrontmatter> {
  try {
    const raw = localStorage.getItem(STORAGE_PAGE_PROPS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, EditorFrontmatter>;
    }
  } catch {
    // Ignore storage read errors in restricted environments
  }
  return {};
}

export interface UsePageFrontmatterOptions {
  activePage: Ref<MindPage | null>;
  activePageId: Ref<string>;
  editorReadMode: Ref<boolean>;
  updatePageMeta: (id: string, patch: { tags: string[] }) => Promise<unknown> | void;
}

/**
 * Coordinates per-page YAML Frontmatter persistence in localStorage while keeping page tags synchronized with the backend.
 */
export function usePageFrontmatter(options: UsePageFrontmatterOptions) {
  const showPropertiesOverride = ref<boolean>(false);
  const pagePropertiesById = reactive<Record<string, EditorFrontmatter>>(loadStoredPageProperties());

  function persistPageProperties(): void {
    try {
      localStorage.setItem(STORAGE_PAGE_PROPS_KEY, JSON.stringify(pagePropertiesById));
    } catch {
      // Ignore storage quota errors
    }
  }

  watch(options.activePageId, () => {
    showPropertiesOverride.value = false;
  });

  const activePageFrontmatter = computed<EditorFrontmatter>(() => {
    const current = options.activePage.value;
    if (!current) return {};
    const extra = pagePropertiesById[current.id] ?? {};
    const next: EditorFrontmatter = { ...extra };
    if (current.tags && current.tags.length > 0) {
      next.tags = [...current.tags];
    }
    return next;
  });

  const isActivePagePropertiesVisible = computed<boolean>(() => {
    if (showPropertiesOverride.value) return true;
    for (const [key, val] of Object.entries(activePageFrontmatter.value)) {
      if (key === 'title' || val === undefined) continue;
      if (key === 'tags' && Array.isArray(val) && val.length === 0) continue;
      return true;
    }
    return false;
  });

  function handleFrontmatterUpdate(meta: EditorFrontmatter): void {
    const current = options.activePage.value;
    if (!current) return;

    const nextTags = Array.isArray(meta.tags)
      ? meta.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [];

    const nextExtra: EditorFrontmatter = {};
    for (const [key, val] of Object.entries(meta)) {
      if (key === 'title' || key === 'tags' || val === undefined) continue;
      nextExtra[key] = val;
    }

    if (Object.keys(nextExtra).length > 0) {
      pagePropertiesById[current.id] = nextExtra;
    } else {
      delete pagePropertiesById[current.id];
    }
    persistPageProperties();

    const prevTagsJson = JSON.stringify(current.tags ?? []);
    const nextTagsJson = JSON.stringify(nextTags);
    if (prevTagsJson !== nextTagsJson) {
      void options.updatePageMeta(current.id, { tags: nextTags });
    }
  }

  function requestOpenProperties(editorHandle?: { openProperties: (focus?: boolean) => void } | null): void {
    if (options.editorReadMode.value) return;
    showPropertiesOverride.value = true;
    editorHandle?.openProperties(true);
  }

  return {
    showPropertiesOverride,
    activePageFrontmatter,
    isActivePagePropertiesVisible,
    handleFrontmatterUpdate,
    requestOpenProperties,
  };
}
