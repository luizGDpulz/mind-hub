import { computed, nextTick, ref, watch } from 'vue';
import type FrontmatterHeader from '../components/FrontmatterHeader.vue';
import type { EditorFrontmatter } from '../types.js';

export interface UseEditorFrontmatterOptions {
  enableFrontmatterHeader: () => boolean;
  readOnly: () => boolean;
  showProperties: () => boolean | undefined;
  frontmatter: () => EditorFrontmatter | undefined;
  emitUpdateShowProperties: (value: boolean) => void;
  emitUpdateFrontmatter: (value: EditorFrontmatter) => void;
}

/** Determine whether metadata contains at least one user-visible frontmatter property. */
export function hasFrontmatterProperties(meta?: EditorFrontmatter): boolean {
  if (!meta) return false;
  for (const [key, val] of Object.entries(meta)) {
    if (key === 'title' || val === undefined) continue;
    if (key === 'tags' && Array.isArray(val) && val.length === 0) continue;
    return true;
  }
  return false;
}

/** Coordinate FrontmatterHeader visibility, initial expansion, and programmatic opening. */
export function useEditorFrontmatter(options: UseEditorFrontmatterOptions) {
  const frontmatterHeaderRef = ref<InstanceType<typeof FrontmatterHeader> | null>(null);
  const localShowProperties = ref(false);
  const frontmatterInitialCollapsed = ref(true);

  const isFrontmatterVisible = computed<boolean>(() => {
    if (!options.enableFrontmatterHeader()) return false;
    const controlled = options.showProperties();
    if (controlled !== undefined) {
      return controlled || hasFrontmatterProperties(options.frontmatter());
    }
    return localShowProperties.value || hasFrontmatterProperties(options.frontmatter());
  });

  async function openProperties(focusAdd = true): Promise<void> {
    if (!options.enableFrontmatterHeader() || options.readOnly()) return;
    frontmatterInitialCollapsed.value = false;
    localShowProperties.value = true;
    options.emitUpdateShowProperties(true);
    await nextTick();
    if (focusAdd) {
      await frontmatterHeaderRef.value?.startAddingProperty();
    } else {
      frontmatterHeaderRef.value?.expand();
    }
  }

  function handleRemoveProperties(): void {
    localShowProperties.value = false;
    frontmatterInitialCollapsed.value = true;
    options.emitUpdateShowProperties(false);
    options.emitUpdateFrontmatter({});
  }

  watch(
    () => options.enableFrontmatterHeader(),
    (enabled) => {
      if (!enabled) {
        localShowProperties.value = false;
        frontmatterInitialCollapsed.value = true;
      }
    }
  );

  watch(
    () => options.showProperties(),
    async (nextVal, prevVal) => {
      if (nextVal && !prevVal) {
        frontmatterInitialCollapsed.value = false;
        await nextTick();
        frontmatterHeaderRef.value?.expand();
      } else if (nextVal === false) {
        localShowProperties.value = false;
        frontmatterInitialCollapsed.value = true;
      }
    }
  );

  return {
    frontmatterHeaderRef,
    frontmatterInitialCollapsed,
    isFrontmatterVisible,
    openProperties,
    handleRemoveProperties,
  };
}
