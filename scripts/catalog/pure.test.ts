import { describe, expect, it } from 'vitest';
import type { CuratedSpecies, DangerRule } from '../../src/data/types';
import { compactPhoto, photoUrl, shardOf } from '../../src/data/shard';
import { buildCatalog, dangerFor, firstSentence, iucnFromStatuses, rarityByRank, slug, type Gathered } from './pure';

const g = (over: Partial<Gathered>): Gathered => ({ taxonId: 1, sci: 'X y', cat: 'bird', obs: 1, introduced: false, iucn: null, ...over });

const jaguar: CuratedSpecies = {
  id: 'jaguar', cat: 'mammal', sci: 'Panthera onca', maya: 'Balam', n: 2, nat: 1, iucn: 'LC', size: '1.8 m', col: ['yellow'], hab: ['jungle'], sex: ['Males are bigger.', 'Los machos son más grandes.'],
  en: ['Jaguar', 'Fact', 'Desc'], es: ['Jaguar', 'Dato', 'Desc es'],
};

describe('helpers', () => {
  it('reads the global IUCN status only', () => {
    expect(iucnFromStatuses([{ authority: 'NOM-059', iucn: 30, place: { id: 1 } }, { authority: 'IUCN Red List', iucn: 20, place: null }])).toBe('NT');
    expect(iucnFromStatuses([{ authority: 'IUCN Red List', iucn: 40, place: { id: 1 } }])).toBeNull();
  });
  it('slugs scientific names', () => {
    expect(slug('Quiscalus mexicanus')).toBe('quiscalus-mexicanus');
    expect(slug('Ceiba × pentandra')).toBe('ceiba-pentandra');
  });
  it('compacts and expands iNaturalist photo URLs', () => {
    const url = 'https://inaturalist-open-data.s3.amazonaws.com/photos/1766279/medium.jpg';
    expect(compactPhoto(url)).toBe('1766279.jpg');
    expect(photoUrl('1766279.jpg')).toBe(url);
    expect(photoUrl('1766279.jpg', 'large')).toBe('https://inaturalist-open-data.s3.amazonaws.com/photos/1766279/large.jpg');
    expect(compactPhoto('https://example.org/a.png')).toBe('https://example.org/a.png');
  });
  it('takes the first sentence', () => {
    expect(firstSentence('The jaguar is a large cat. It lives in forests.')).toBe('The jaguar is a large cat.');
    expect(firstSentence('')).toBe('');
  });
  it('ranks rarity within each category', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ cat: 'bird' as const, obs: 100 - i }));
    const r = rarityByRank(items);
    expect(items.map((i) => r.get(i))).toEqual([0, 0, 0, 0, 1, 1, 1, 2, 2, 3]);
  });
  it('breaks rarity ties deterministically', () => {
    const mk = () => ['c', 'a', 'd', 'b', 'e'].map((sci) => ({ cat: 'bird' as const, obs: 1, sci }));
    const x = mk();
    const y = mk().reverse();
    const rx = rarityByRank(x);
    const ry = rarityByRank(y);
    for (const sci of 'abcde') expect(rx.get(x.find((i) => i.sci === sci)!)).toBe(ry.get(y.find((i) => i.sci === sci)!));
  });
});

describe('buildCatalog', () => {
  const gathered: Gathered[] = [
    g({ taxonId: 41944, sci: 'Panthera onca', cat: 'mammal', obs: 12, iucn: 'NT', nameEn: 'Jaguar' }),
    g({ taxonId: 2, sci: 'Ceiba pentandra', cat: 'plant', obs: 50, nameEn: 'Kapok', wikiEn: { title: 'Ceiba pentandra', extract: 'Ceiba pentandra is a tropical tree. More.', url: 'https://en.wikipedia.org/wiki/Ceiba_pentandra' } }),
    g({ taxonId: 3, sci: 'Pterois volitans', cat: 'fish', obs: 5, introduced: true, wikiEs: { title: 'Pez león', extract: 'El pez león es venenoso. Más.', url: 'https://es.wikipedia.org/wiki/Pez_le%C3%B3n' } }),
    g({ taxonId: 4, sci: 'Aus bus', cat: 'bird', obs: 3, lineage: [{ t: 3, n: 'Aves', r: 'class', en: 'Birds' }, { t: 90, n: 'Ausidae', r: 'family', en: 'Aus birds' }] }),
    g({ taxonId: 5, sci: 'Aus cus', cat: 'bird', obs: 2, lineage: [{ t: 3, n: 'Aves', r: 'class', en: 'Birds' }, { t: 90, n: 'Ausidae', r: 'family', en: 'Aus birds' }] }),
  ];
  const out = buildCatalog({
    gathered, curated: [jaguar], generated: '',
    trees: { 'Ceiba pentandra': true },
    enrichment: { 'Aus bus': { fact: ['F', 'D'], about: ['A', 'B'], size: '10 cm', col: ['red'], hab: ['town'], model: 'm', date: 'd' } },
    speciesPerShard: 2,
  });
  const byId = Object.fromEntries(out.index.map((e) => [e.id, e]));
  const detail = (id: string) => out.details[shardOf(id, out.shards)][id];

  it('merges curated data over iNaturalist, keeping the curated id but taking the verified IUCN status', () => {
    expect(byId.jaguar).toMatchObject({ cur: 1, iucn: 'NT', n: 2, t: 41944, maya: 'Balam' });
    expect(detail('jaguar').src).toBe('curated');
    expect(detail('jaguar').sex).toEqual(['Males are bigger.', 'Los machos son más grandes.']);
  });
  it('splits trees from plants and orders by category', () => {
    expect(byId['ceiba-pentandra'].cat).toBe('tree');
    expect(out.index[0].id).toBe('ceiba-pentandra');
  });
  it('uses Wikipedia names, text and native status', () => {
    expect(byId['pterois-volitans']).toMatchObject({ nat: 0, es: 'Pez león', en: 'Pterois volitans' });
    expect(detail('pterois-volitans').fact).toEqual(['', 'El pez león es venenoso.']);
    expect(detail('ceiba-pentandra').wiki?.en).toContain('wikipedia');
  });
  it('uses Claude content when present', () => {
    expect(byId['aus-bus'].col).toEqual(['red']);
    expect(detail('aus-bus')).toMatchObject({ src: 'claude', fact: ['F', 'D'], desc: ['A', 'B'], size: '10 cm' });
  });
  it('builds one shared group table with parent links', () => {
    expect(out.groups).toEqual([
      { t: 3, n: 'Aves', r: 'class', en: 'Birds' },
      { t: 90, n: 'Ausidae', r: 'family', en: 'Aus birds', p: 0 },
    ]);
    expect(byId['aus-bus'].g).toBe(1);
    expect(byId['aus-cus'].g).toBe(1);
    expect(byId['jaguar'].g).toBeUndefined();
  });
  it('shards every detail exactly once', () => {
    expect(out.shards).toBe(3);
    expect(out.details.flatMap((d) => Object.keys(d)).sort()).toEqual(out.index.map((e) => e.id).sort());
  });
});

describe('danger rules', () => {
  const rules: DangerRule[] = [
    { match: ['Meliponini'], kind: 'sting', level: 0 },
    { match: ['Mobula'], none: true },
    { match: ['Apidae'], kind: 'sting', level: 1, guide: 'sting', risk: ['Allergic people', 'Alérgicos'] },
    { match: ['Viperidae'], kind: 'bite', level: 3, guide: 'snake' },
    { match: ['Myliobatiformes'], kind: 'sting', level: 2, guide: 'spines' },
  ];
  it('matches species, genus or a named ancestor, first rule wins', () => {
    expect(dangerFor('Bothrops asper', ['Serpentes', 'Viperidae'], rules)?.tag).toEqual({ k: 'bite', l: 3 });
    expect(dangerFor('Apis mellifera', ['Apidae'], rules)).toEqual({ tag: { k: 'sting', l: 1 }, detail: { guide: 'sting', risk: ['Allergic people', 'Alérgicos'] } });
    expect(dangerFor('Melipona beecheii', ['Apidae', 'Meliponini'], rules)?.tag.l).toBe(0); // exception above the broad rule
    expect(dangerFor('Mobula yarae', ['Myliobatiformes'], rules)).toBeNull(); // mantas have no sting
    expect(dangerFor('Panthera onca', ['Felidae'], rules)).toBeNull();
  });
  it('sets the tag on the index and the notes on the detail', () => {
    const out = buildCatalog({
      gathered: [g({ taxonId: 9, sci: 'Bothrops asper', cat: 'reptile', obs: 1, lineage: [{ t: 1, n: 'Viperidae', r: 'family', en: 'Vipers' }] })],
      curated: [], enrichment: {}, trees: {}, danger: rules, generated: '',
    });
    expect(out.index[0].d).toEqual({ k: 'bite', l: 3 });
    expect(out.details[0][out.index[0].id].danger).toEqual({ guide: 'snake' });
    expect(out.stats['danger.deadly']).toBe(1);
  });
  it('every rule in data/danger.json is complete and every guide exists', async () => {
    const { readFileSync } = await import('node:fs');
    const { GUIDES } = await import('../../src/firstAid');
    const file: { rules: DangerRule[] } = JSON.parse(readFileSync('data/danger.json', 'utf8'));
    for (const r of file.rules) {
      expect(r.match.length).toBeGreaterThan(0);
      if (r.none) continue;
      expect(['bite', 'sting', 'touch']).toContain(r.kind);
      expect([0, 1, 2, 3]).toContain(r.level);
      if (r.level! > 0) expect(r.guide, r.match.join()).toBeTruthy();
      if (r.guide) expect(GUIDES.en[r.guide] && GUIDES.es[r.guide]).toBeTruthy();
      for (const p of [r.speed, r.risk]) if (p) expect(p[0] && p[1]).toBeTruthy();
    }
  });
});
