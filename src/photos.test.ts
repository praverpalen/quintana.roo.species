import { describe, expect, it } from 'vitest';
import { photoFromInat } from './photos';

describe('photoFromInat', () => {
  const photo = { medium_url: 'https://x/medium.jpg', attribution: '(c) Ana, some rights reserved (CC BY)', license_code: 'cc-by' };
  it('uses the exact-name match with an open licence', () => {
    const p = photoFromInat('Panthera onca', [
      { name: 'Panthera', rank: 'genus', default_photo: { ...photo, medium_url: 'https://wrong' } },
      { name: 'Panthera onca', rank: 'species', default_photo: photo },
    ]);
    expect(p).toEqual({ url: 'https://x/medium.jpg', attribution: photo.attribution, license: 'CC-BY', source: 'iNaturalist' });
  });
  it('falls back to an openly licensed taxon photo', () => {
    const p = photoFromInat('Sphyraena barracuda', [
      { name: 'Sphyraena barracuda', rank: 'species', default_photo: { ...photo, license_code: null }, taxon_photos: [{ photo: { url: 'https://x/2/square.jpg', attribution: 'b', license_code: 'cc-by-nc' } }] },
    ]);
    expect(p).toMatchObject({ url: 'https://x/2/medium.jpg', license: 'CC-BY-NC' });
  });
  it('rejects all-rights-reserved photos and non-matches', () => {
    expect(photoFromInat('Panthera onca', [{ name: 'Panthera onca', rank: 'species', default_photo: { ...photo, license_code: null } }])).toBeNull();
    expect(photoFromInat('Panthera onca', [{ name: 'Panthera leo', rank: 'species', default_photo: photo }])).toBeNull();
  });
});
