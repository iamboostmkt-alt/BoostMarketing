// Returns true only for URLs that are likely a direct image (not a viewer page).
// This prevents next/image from throwing on Google Drive viewer links, Notion embeds, etc.
const VIEWER_PATTERNS = [
  /drive\.google\.com\/file\/.+\/view/i,
  /drive\.google\.com\/open/i,
  /docs\.google\.com/i,
  /notion\.so/i,
  /figma\.com/i,
];

export function isImageSrc(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  return !VIEWER_PATTERNS.some((p) => p.test(url));
}
