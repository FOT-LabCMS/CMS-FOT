import api from '../api/axiosInstance';

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

/**
 * Perform an authenticated download of an SDS document using the authenticated axios instance.
 *
 * @param {string} chemicalId - UUID of the chemical
 * @param {string} [fallbackFilename='sds-document.pdf'] - Preferred or fallback filename for download
 */
export const downloadSdsFile = async (chemicalId, fallbackFilename = 'sds-document.pdf') => {
  if (!chemicalId) {
    throw new Error('Chemical ID is required for downloading SDS.');
  }

  try {
    const response = await api.get(`/chemicals/${chemicalId}/sds/download`, {
      responseType: 'blob',
    });

    let filename = fallbackFilename;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].trim());
      }
    }

    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream',
    });

    const objectUrl = window.URL.createObjectURL(blob);
    const tempLink = document.createElement('a');
    tempLink.href = objectUrl;
    tempLink.setAttribute('download', filename);
    document.body.appendChild(tempLink);
    tempLink.click();
    tempLink.parentNode.removeChild(tempLink);

    // Revoke object URL after a brief delay
    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 100);

    return true;
  } catch (error) {
    console.error('Failed to download SDS document:', error);
    throw error;
  }
};
