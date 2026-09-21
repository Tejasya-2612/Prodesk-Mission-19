export const ticketLocks = new Map();

export function releaseSocketLocks(io, socketId) {
  for (const [ticketId, lock] of ticketLocks.entries()) {
    if (lock.socketId === socketId) {
      ticketLocks.delete(ticketId);
      io.emit('ticket_unlocked', { ticketId, releasedBy: lock.agentName, reason: 'disconnect' });
    }
  }
}

