import { describe, expect, it } from 'vitest';
import raw from './data/species.json';
import type { Species } from './data/types';
import { anyFilter, buildCards, EMPTY_FILTERS, filterCards, orderSpecies, panelFilterCount, sortCards } from './model';

const SPECIES = orderSpecies(raw as Species[]);
const cards = (spotted = {}) => buildCards(SPECIES, spotted, 'en');

describe('ordering and numbering', () => {
  it('groups by category in the design order and numbers from #001', () => {
    const c = cards();
    expect(c[0].no).toBe('#001');
    expect(c[0].catKey).toBe('tree');
    expect(c.at(-1)!.catKey).toBe('insect');
    const order = ['tree', 'plant', 'bird', 'mammal', 'reptile', 'fish', 'marine', 'insect'];
    const idx = c.map((x) => order.indexOf(x.catKey));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });
});

describe('search', () => {
  it('ignores accents and case and matches EN, ES, scientific and Maya names', () => {
    const find = (q: string) => filterCards(cards(), { ...EMPTY_FILTERS, q }).map((c) => c.id);
    expect(find('MANATI')).toEqual(['manatee']); // Spanish "Manatí"
    expect(find('panthera')).toEqual(['jaguar']);
    expect(find('balam')).toEqual(['jaguar']);
    expect(find('zanate')).toEqual(['grackle']);
    expect(find('  jaguar ')).toEqual(['jaguar']);
  });
});

describe('filters', () => {
  it('combines category, origin, colour and status', () => {
    const c = cards({ lionfish: '2026-08-03' });
    const intro = filterCards(c, { ...EMPTY_FILTERS, origin: 'introduced' }).map((x) => x.id);
    expect(intro.sort()).toEqual(['coconut', 'flamboyan', 'lionfish']);
    expect(filterCards(c, { ...EMPTY_FILTERS, cat: 'fish', color: 'red' }).map((x) => x.id)).toEqual(['lionfish']);
    expect(filterCards(c, { ...EMPTY_FILTERS, status: 'spotted' }).map((x) => x.id)).toEqual(['lionfish']);
    expect(filterCards(c, { ...EMPTY_FILTERS, status: 'unspotted' })).toHaveLength(c.length - 1);
  });

  it('counts only panel filters on the Filters button', () => {
    expect(panelFilterCount({ ...EMPTY_FILTERS, cat: 'bird', q: 'x' })).toBe(0);
    expect(panelFilterCount({ ...EMPTY_FILTERS, origin: 'native', color: 'red', sort: 'name' })).toBe(3);
    expect(anyFilter(EMPTY_FILTERS)).toBe(false);
    expect(anyFilter({ ...EMPTY_FILTERS, q: '  ' })).toBe(false);
    expect(anyFilter({ ...EMPTY_FILTERS, status: 'spotted' })).toBe(true);
  });
});

describe('sorting', () => {
  it('sorts by rarity, name and most recent', () => {
    const c = cards({ jaguar: '2026-09-18', coati: '2026-07-19', ceiba: '2026-09-20' });
    expect(sortCards(c, 'rarity')[0].n).toBe(3);
    const names = sortCards(c, 'name').map((x) => x.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(sortCards(c.filter((x) => x.unlocked), 'recent').map((x) => x.id)).toEqual(['ceiba', 'jaguar', 'coati']);
  });
});

describe('localisation', () => {
  it('switches names, labels and dates but keeps numbers and scientific names', () => {
    const en = buildCards(SPECIES, { jaguar: '2026-09-18' }, 'en').find((c) => c.id === 'jaguar')!;
    const es = buildCards(SPECIES, { jaguar: '2026-09-18' }, 'es').find((c) => c.id === 'jaguar')!;
    expect(es.no).toBe(en.no);
    expect(es.sci).toBe(en.sci);
    expect(en.iucnLabel).toBe('Near threatened');
    expect(es.iucnLabel).toBe('Casi amenazada');
    expect(en.spottedOn).toMatch(/Sep/);
    expect(es.spottedOn).toMatch(/^18 sep/i);
  });
});

describe('seed data', () => {
  it('has unique ids and valid enums', () => {
    const ids = SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SPECIES) {
      expect(['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'NE', 'DD']).toContain(s.iucn);
      expect(s.en).toHaveLength(3);
      expect(s.es).toHaveLength(3);
    }
  });
});
