import { describe, it, expect } from 'vitest';
import { MermaidNode, DEFAULT_MERMAID_CODE } from './mermaid-node.js';

describe('MermaidNode Extension', () => {
  it('instantiates Mermaid block node with correct name and group', () => {
    const node = MermaidNode.configure();
    expect(node.name).toBe('mermaid');
    expect(node.type).toBe('node');
  });

  it('exposes default code attribute', () => {
    expect(DEFAULT_MERMAID_CODE).toContain('flowchart');
  });
});
