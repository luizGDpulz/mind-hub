import { describe, it, expect } from 'vitest';
import {
  CalloutNode,
  normalizeCalloutType,
  calloutToMarkdown,
  parseMarkdownCallout,
} from './callout-node.js';

describe('callout-node.ts', () => {
  it('normalizes various aliases to canonical CalloutType', () => {
    expect(normalizeCalloutType('note')).toBe('note');
    expect(normalizeCalloutType('INFO')).toBe('note');
    expect(normalizeCalloutType('nota')).toBe('note');
    expect(normalizeCalloutType('tip')).toBe('tip');
    expect(normalizeCalloutType('dica')).toBe('tip');
    expect(normalizeCalloutType('success')).toBe('tip');
    expect(normalizeCalloutType('important')).toBe('important');
    expect(normalizeCalloutType('importante')).toBe('important');
    expect(normalizeCalloutType('warning')).toBe('warning');
    expect(normalizeCalloutType('aviso')).toBe('warning');
    expect(normalizeCalloutType('caution')).toBe('caution');
    expect(normalizeCalloutType('danger')).toBe('caution');
    expect(normalizeCalloutType('unknown_type')).toBe('note');
    expect(normalizeCalloutType(null)).toBe('note');
  });

  it('serializes callout to GitHub/Obsidian admonition markdown format', () => {
    const md = calloutToMarkdown('note', 'Primeira linha\nSegunda linha');
    expect(md).toBe('> [!NOTE]\n> Primeira linha\n> Segunda linha');

    const tipMd = calloutToMarkdown('tip', 'Dica de ouro');
    expect(tipMd).toBe('> [!TIP]\n> Dica de ouro');
  });

  it('parses GitHub/Obsidian admonition markdown format', () => {
    const input = '> [!WARNING]\n> Cuidado ao rodar comandos no banco de dados\n> Tenha backup';
    const parsed = parseMarkdownCallout(input);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('warning');
    expect(parsed?.content).toBe('Cuidado ao rodar comandos no banco de dados\nTenha backup');
  });

  it('parses fenced ::: markdown callout format', () => {
    const input = ':::important\nFique atento aos prazos da sprint\n:::';
    const parsed = parseMarkdownCallout(input);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('important');
    expect(parsed?.content).toBe('Fique atento aos prazos da sprint');
  });

  it('returns null for non-callout text', () => {
    expect(parseMarkdownCallout('# Apenas um cabeçalho normal')).toBeNull();
    expect(parseMarkdownCallout('> Citação comum sem admonition')).toBeNull();
  });

  it('creates CalloutNode with valid configuration', () => {
    expect(CalloutNode.name).toBe('callout');
    expect(CalloutNode.type).toBe('node');
  });
});
