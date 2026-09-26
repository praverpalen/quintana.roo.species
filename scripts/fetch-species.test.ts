import { describe, expect, it } from 'vitest';
import { iucnFromStatuses, renderReport, suggestRarity } from './fetch-species';

describe('fetch-species helpers', () => {
  it('reads the global IUCN status and ignores regional lists', () => {
    expect(iucnFromStatuses([{ authority: 'NOM-059', iucn: 30, place: { id: 6793 } }, { authority: 'IUCN Red List', iucn: 20, place: null }])).toBe('NT');
    expect(iucnFromStatuses([{ authority: 'IUCN Red List', iucn: 40, place: { id: 1 } }])).toBeNull();
    expect(iucnFromStatuses(undefined)).toBeNull();
  });
  it('maps observation counts to a rarity hint', () => {
    expect(suggestRarity(5000)).toBe(0);
    expect(suggestRarity(300)).toBe(1);
    expect(suggestRarity(50)).toBe(2);
    expect(suggestRarity(3)).toBe(3);
    expect(suggestRarity(undefined)).toBeNull();
  });
  it('lists only flagged species in the report', () => {
    const md = renderReport([{ id: 'a', sci: 'A a', notes: ['x'] }, { id: 'b', sci: 'B b', notes: [] }], '2026-09-26');
    expect(md).toContain('1 of 2 species need a look');
    expect(md).toContain('## a');
    expect(md).not.toContain('## b');
  });
});
