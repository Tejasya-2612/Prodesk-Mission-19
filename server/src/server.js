import 'dotenv/config';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import ticketsRouter from './routes/tickets.js';
import { Ticket } from './models/Ticket.js';
import { ticketLocks, releaseSocketLocks } from './socket/ticketLocks.js';
import { configureMongoDns } from './config/database.js';

const port = process.env.PORT || 5000;
const configuredOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigin = new URL(configuredOrigin).origin;
const app = express();
app.use(cors({ origin: allowedOrigin, methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api/tickets', ticketsRouter);
app.use((error, _request, response, _next) => {
  if (error.name === 'ValidationError') return response.status(400).json({ message: error.message });
  if (error.code === 11000) return response.status(409).json({ message: 'Ticket number already exists.' });
  console.error(error);
  response.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: allowedOrigin, methods: ['GET', 'POST'] } });
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join_dashboard', ({ agentName } = {}, acknowledge) => {
    socket.data.agentName = String(agentName || 'Support agent').slice(0, 80);
    acknowledge?.({ ok: true, socketId: socket.id });
  });
  socket.on('lock_ticket', async ({ ticketId, agentName } = {}, acknowledge) => {
    if (!ticketId) return acknowledge?.({ ok: false, message: 'Ticket id is required.' });
    const ticketExists = await Ticket.exists({ _id: ticketId }).catch(() => null);
    if (!ticketExists) return acknowledge?.({ ok: false, message: 'Ticket not found.' });
    const currentLock = ticketLocks.get(ticketId);
    if (currentLock && currentLock.socketId !== socket.id) return acknowledge?.({ ok: false, message: `Ticket is currently locked by ${currentLock.agentName}.` });
    const lock = currentLock || { ticketId, socketId: socket.id, agentName: String(agentName || socket.data.agentName || 'Support agent').slice(0, 80) };
    ticketLocks.set(ticketId, lock);
    io.emit('ticket_locked', lock);
    acknowledge?.({ ok: true, lock });
  });
  socket.on('unlock_ticket', ({ ticketId } = {}, acknowledge) => {
    const lock = ticketLocks.get(ticketId);
    if (!lock) return acknowledge?.({ ok: true });
    if (lock.socketId !== socket.id) return acknowledge?.({ ok: false, message: `Only ${lock.agentName} can unlock this ticket.` });
    ticketLocks.delete(ticketId);
    io.emit('ticket_unlocked', { ticketId, releasedBy: lock.agentName });
    acknowledge?.({ ok: true });
  });
  socket.on('disconnect', () => releaseSocketLocks(io, socket.id));
});

async function start() {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured. Copy .env.example to .env and add your Atlas URI.');
    configureMongoDns();
    await mongoose.connect(process.env.MONGODB_URI);
    httpServer.listen(port, () => console.log(`RapidDispatch API listening on port ${port}`));
  } catch (error) { console.error(`Startup failed: ${error.message}`); process.exit(1); }
}
start();
