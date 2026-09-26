/** Which detail shard a species lives in. Shared by the catalog pipeline and the app. */
export function shardOf(id: string, shards: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % Math.max(1, shards);
}

const INAT_OPEN = /^https:\/\/inaturalist-open-data\.s3\.amazonaws\.com\/photos\/(\d+)\/[a-z]+\.(\w+)$/;

/** Shortens an iNaturalist open-data photo URL to "<id>.<ext>" for the index. */
export function compactPhoto(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const m = url.match(INAT_OPEN);
  return m ? `${m[1]}.${m[2]}` : url;
}

/** Expands an index photo reference at the given iNaturalist size (medium ≈ 500 px, large ≈ 1024 px). */
export function photoUrl(p: string, size: 'medium' | 'large' = 'medium'): string {
  if (p.startsWith('http')) return p.replace(/\/(medium|large|small|square)\.(\w+)$/, `/${size}.$2`);
  const [id, ext] = p.split('.');
  return `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/${size}.${ext}`;
}
