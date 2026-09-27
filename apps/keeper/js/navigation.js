// Author: Alex Picon <alexnpc@me.com>
// Stable collection links, independent of the host serving Keeper.
export const COLLECTION_SLUGS = ['bread', 'port', 'care'];
export function collectionSlug(book) {
  if (COLLECTION_SLUGS.includes(book?.collection_slug)) return book.collection_slug;
  if (book?.id?.startsWith('lima-') && COLLECTION_SLUGS.includes(book.id.slice(5))) return book.id.slice(5);
  if (book?.provenance?.kind === 'woven-recollections') return 'bread';
  if (book?.title === 'Las manos que se cuidaban') return 'port';
  if (book?.title === 'La familia que seguía volviendo') return 'care';
  return null;
}
export function publicStorySlug(book) {
  return !book?.private_changes && (book?.curated || book?.public_story_slug) ? (book.public_story_slug || collectionSlug(book)) : null;
}
export function storyLink(book, language = 'Original', origin = location.origin) {
  const slug = publicStorySlug(book);
  if (!slug) return null;
  const url = new URL('/keeper/', origin);
  url.searchParams.set('story', slug);
  if (language === 'Spanish') url.searchParams.set('lang', 'Spanish');
  return url.href;
}
export function newBookId() {
  // randomUUID and the Clipboard API are unavailable on ordinary HTTP hosts.
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
