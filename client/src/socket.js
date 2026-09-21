import { io } from 'socket.io-client';
import { backendUrl } from './api';

export const socket = io(backendUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 800,
  reconnectionDelayMax: 5000
});

