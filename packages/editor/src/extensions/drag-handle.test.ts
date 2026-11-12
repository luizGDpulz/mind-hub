import { describe, it, expect } from 'vitest';
import { GlobalDragHandle, calculateHandlePosition } from './drag-handle.js';

describe('GlobalDragHandle Extension', () => {
  it('instantiates the extension with default options', () => {
    const ext = GlobalDragHandle.configure({
      dragHandleWidth: 20,
    });
    expect(ext.name).toBe('globalDragHandle');
    expect(ext.options.dragHandleWidth).toBe(20);
  });

  it('calculates handle position correctly relative to mock DOM element', () => {
    const mockElem = document.createElement('div');
    mockElem.style.lineHeight = '24px';
    mockElem.style.paddingTop = '4px';
    document.body.appendChild(mockElem);

    // Mock getBoundingClientRect
    mockElem.getBoundingClientRect = () => ({
      top: 100,
      left: 50,
      bottom: 124,
      right: 250,
      width: 200,
      height: 24,
      x: 50,
      y: 100,
      toJSON: () => {},
    });

    const pos = calculateHandlePosition(mockElem);
    expect(pos.left).toBe(50);
    expect(pos.top).toBeGreaterThanOrEqual(100);
    expect(pos.height).toBe(24);

    document.body.removeChild(mockElem);
  });
});
