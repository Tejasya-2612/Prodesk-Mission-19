import axios from 'axios';

export const backendUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
export const api = axios.create({ baseURL: `${backendUrl}/api`, timeout: 10000 });

