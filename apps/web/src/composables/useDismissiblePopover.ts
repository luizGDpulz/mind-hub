import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue';

export interface DismissiblePopoverOptions {
  /** Reactive open state or getter returning whether the popover is currently open */
  isOpen: Ref<boolean> | (() => boolean);
  /** Callback invoked when dismissed via Escape or outside pointer interaction */
  onClose: () => void;
  /** Optional container element ref when using document outside-interaction detection */
  containerRef?: Ref<HTMLElement | null>;
  /** Enable document mousedown outside listener (default false) */
  closeOnOutsideMousedown?: boolean;
  /** Enable document click outside listener (default false) */
  closeOnOutsideClick?: boolean;
  /** Defer attaching outside listener to avoid closing on the opening click */
  deferOutsideAttachMs?: number;
  /** Enable Escape key dismissal (default true) */
  closeOnEscape?: boolean;
}

/**
 * Shared dismissal lifecycle for floating popovers and context menus.
 * Registers keyboard Escape and optional outside pointer handlers while active.
 */
export function useDismissiblePopover(options: DismissiblePopoverOptions): void {
  const getIsOpen = () =>
    typeof options.isOpen === 'function' ? options.isOpen() : options.isOpen.value;

  let attachTimer: ReturnType<typeof setTimeout> | null = null;
  let listenersAttached = false;

  function handleKeydown(event: KeyboardEvent): void {
    if (!getIsOpen()) return;
    if ((options.closeOnEscape ?? true) && event.key === 'Escape') {
      event.preventDefault();
      options.onClose();
    }
  }

  function handleOutsidePointer(event: MouseEvent): void {
    if (!getIsOpen()) return;
    const container = options.containerRef?.value;
    if (container && !container.contains(event.target as Node)) {
      options.onClose();
    }
  }

  function attachOutsideListeners(): void {
    if (listenersAttached) return;
    listenersAttached = true;
    if (options.closeOnOutsideMousedown) {
      window.addEventListener('mousedown', handleOutsidePointer);
    }
    if (options.closeOnOutsideClick) {
      document.addEventListener('click', handleOutsidePointer);
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
    if (options.closeOnOutsideMousedown || options.closeOnOutsideClick) {
      const delay = options.deferOutsideAttachMs ?? 0;
      if (delay > 0) {
        attachTimer = setTimeout(attachOutsideListeners, delay);
      } else {
        attachOutsideListeners();
      }
    }
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
    if (attachTimer !== null) {
      clearTimeout(attachTimer);
      attachTimer = null;
    }
    if (listenersAttached) {
      window.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('click', handleOutsidePointer);
      listenersAttached = false;
    }
  });

  if (typeof options.isOpen !== 'function') {
    watch(options.isOpen, () => {
      // Keeps open-state subscription lightweight when reactive ref is provided
    });
  }
}
