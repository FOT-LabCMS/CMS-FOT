/**
 * Resolves an instrument image URL to a full accessible URL.
 * Handles absolute HTTP(S) links, blob preview URLs, and relative upload paths.
 */
export const getInstrumentImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  if (
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('blob:') ||
    imageUrl.startsWith('data:')
  ) {
    return imageUrl;
  }
  const API_SERVER_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  return `${API_SERVER_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
};