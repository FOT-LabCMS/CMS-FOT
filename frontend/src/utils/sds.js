const API_SERVER_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/$/, '');

export const getSdsFilename = (storageKey) => {
  if (!storageKey) {
    return null;
  }

  const normalizedKey = String(storageKey).replace(/\\/g, '/');
  const filename = normalizedKey.split('/').filter(Boolean).pop();

  return filename || null;
};

export const getSdsUrl = (storageKey) => {
  const filename = getSdsFilename(storageKey);

  if (!filename) {
    return null;
  }

  return `${API_SERVER_URL}/uploads/sds/${encodeURIComponent(filename)}`;
};
