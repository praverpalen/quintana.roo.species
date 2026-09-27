import { describe, expect, it } from 'vitest';
import curated from '../data/curated.json';
import type { CuratedSpecies } from './data/types';
import { buildCatalog } from '../scripts/catalog/pure';
import { anyFilter, buildCards, EMPTY_FILTERS, familyOf, filterCards, panelFilterCount, setGroups, sortCards } from './model';

const SPECIES = buildCatalog({ gathered: [], curated: curated as CuratedSpecies[], enrichment: {}, trees: {}, generated: '' }).index;
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

describe('curated data', () => {
  it('has unique ids and valid enums', () => {
    const ids = (curated as CuratedSpecies[]).map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of curated as CuratedSpecies[]) {
      expect(['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'NE', 'DD']).toContain(s.iucn);
      expect(s.en).toHaveLength(3);
      expect(s.es).toHaveLength(3);
    }
  });
});

describe('group search', () => {
  // Decapoda > Brachyura (crabs) > Gecarcinidae (land crabs); Carcharhinidae (requiem sharks); Delphinidae (ocean dolphins)
  const groups = [
    { t: 1, n: 'Decapoda', r: 'order', en: 'Decapods', es: 'Decápodos' },
    { t: 2, n: 'Brachyura', r: 'infraorder', en: 'True Crabs', es: 'Cangrejos', p: 0 },
    { t: 3, n: 'Gecarcinidae', r: 'family', en: 'Land Crabs', es: 'Cangrejos terrestres', p: 1 },
    { t: 4, n: 'Carcharhinidae', r: 'family', en: 'Requiem Sharks', es: 'Tiburones réquiem' },
    { t: 5, n: 'Delphinidae', r: 'family', en: 'Ocean Dolphins', es: 'Delfines oceánicos' },
    { t: 6, n: 'Coleoptera', r: 'order', en: 'Beetles', es: 'Escarabajos' },
  ];
  const e = (id: string, en: string, g?: number) => ({ id, cat: 'marine' as const, sci: id, en, es: en, n: 0 as const, nat: 1 as const, iucn: 'LC' as const, col: [], ...(g != null ? { g } : {}) });
  const entries = [e('cardisoma', 'Blue Land Crab', 2), e('bull', 'Bull Shark', 3), e('tursiops', 'Common Bottlenose', 4), e('megasoma', 'Elephas', 5), e('none', 'Something')];
  const find = (q: string) => filterCards(buildCards(entries, {}, 'en'), { ...EMPTY_FILTERS, q }).map((c) => c.id);

  it('finds species through their group names, in English and Spanish, with plurals', () => {
    setGroups(groups);
    expect(find('dolphin')).toEqual(['tursiops']);
    expect(find('delfin')).toEqual(['tursiops']);
    expect(find('crab')).toEqual(['cardisoma']);
    expect(find('cangrejo')).toEqual(['cardisoma']);
    expect(find('sharks')).toEqual(['bull']);
    expect(find('tiburon')).toEqual(['bull']);
    expect(find('decapod')).toEqual(['cardisoma']); // parent groups count too
  });
  it('does not let short words match longer ones ("bee" is not "beetles")', () => {
    setGroups(groups);
    expect(find('bee')).toEqual([]);
    expect(find('beetle')).toEqual(['megasoma']);
  });
  it('shows the family', () => {
    setGroups(groups);
    expect(familyOf(entries[0], 'es')).toEqual({ name: 'Cangrejos terrestres', sci: 'Gecarcinidae' });
    expect(familyOf(entries[4], 'en')).toBeNull();
    setGroups(undefined);
  });
});
