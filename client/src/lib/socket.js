import { io } from 'socket.io-client';

let socket = null;

export function getSocket(token) {
  if (!socket || socket.disconnected) {
    socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
