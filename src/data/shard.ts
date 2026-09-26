/** Which detail shard a species lives in. Shared by the catalog pipeline and the app. */
export function shardOf(id: string, shards: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % Math.max(1, shards);
}
