import { onBeforeUnmount, ref, type Ref } from 'vue';

export interface UseSidebarResizerOptions {
  isOpen: Ref<boolean>;
  minWidth?: number;
  maxWidth?: number;
  collapseThreshold?: number;
  defaultWidth?: number;
  storageKey?: string;
}

/**
 * Manages persisted drag resizing and edge auto-collapse for the collapsible left sidebar.
 */
export function useSidebarResizer(options: UseSidebarResizerOptions) {
  const minWidth = options.minWidth ?? 270;
  const maxWidth = options.maxWidth ?? 600;
  const collapseThreshold = options.collapseThreshold ?? 200;
  const defaultWidth = options.defaultWidth ?? 280;
  const storageKey = options.storageKey ?? 'mind_sidebar_width';

  function readInitialWidth(): number {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (Number.isFinite(saved) && saved >= minWidth && saved <= maxWidth) {
        return saved;
      }
    } catch {
      // Ignore storage access failures in headless/restricted environments
    }
    return defaultWidth;
  }

  const sidebarWidth = ref<number>(readInitialWidth());
  const isResizing = ref<boolean>(false);

  function stopListening(): void {
    window.removeEventListener('mousemove', onResizerMouseMove);
    window.removeEventListener('mouseup', onResizerMouseUp);
  }

  function onResizerMouseMove(e: MouseEvent): void {
    if (!isResizing.value) return;
    const clientX = e.clientX;
    if (clientX < collapseThreshold) {
      options.isOpen.value = false;
      isResizing.value = false;
      stopListening();
      return;
    }
    sidebarWidth.value = Math.max(minWidth, Math.min(maxWidth, clientX));
  }

  function onResizerMouseUp(): void {
    if (isResizing.value) {
      isResizing.value = false;
      try {
        localStorage.setItem(storageKey, String(sidebarWidth.value));
      } catch {
        // Ignore storage quota errors
      }
    }
    stopListening();
  }

  function onResizerMouseDown(e: MouseEvent): void {
    e.preventDefault();
    isResizing.value = true;
    window.addEventListener('mousemove', onResizerMouseMove);
    window.addEventListener('mouseup', onResizerMouseUp);
  }

  onBeforeUnmount(() => {
    stopListening();
  });

  return {
    sidebarWidth,
    isResizing,
    onResizerMouseDown,
  };
}
