import axios from 'axios';

// The base URL for your backend API.
// It's good practice to use an environment variable for the server's root URL.
const API_SERVER_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: `${API_SERVER_URL}/api`,
});

export const INVENTORY_REFRESH_EVENT = 'flcms:inventory-refresh';

const INVENTORY_MUTATION_PATHS = [
  '/batches',
  '/chemicals',
  '/dispose',
  '/locations',
];

// Add a request interceptor to include the token in headers
api.interceptors.request.use(
  (config) => {
    // Get the token from local storage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toUpperCase();
    const url = response.config?.url || '';
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const touchesInventory = INVENTORY_MUTATION_PATHS.some((path) => url.startsWith(path));

    if (isMutation && touchesInventory && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(INVENTORY_REFRESH_EVENT));
    }

    return response;
  },
  (error) => Promise.reject(error)
);

export default api;
