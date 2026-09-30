import axios from 'axios';

const configuredUrl = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000').replace(/\/+$/, '');
export const backendUrl = typeof window !== 'undefined' && window.location.protocol === 'https:'
  ? configuredUrl.replace(/^http:\/\//i, 'https://')
  : configuredUrl;
export const api = axios.create({ baseURL: `${backendUrl}/api`, timeout: 10000 });

