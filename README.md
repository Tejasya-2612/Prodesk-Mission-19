# RapidDispatch Live Ops

A real-time support-ticket dashboard for RapidDispatch Freight & Logistics. It prevents agents from overwriting one another by keeping active edit locks in the Node.js server and broadcasting every ticket or lock change through Socket.io.

## Stack

React, Vite, Express, Socket.io, MongoDB Atlas, Mongoose, and CSS.

## Deployment
Backend Link: https://prodesk-mission-19.onrender.com

Frontend Link: https://prodesk-mission-19.vercel.app/

## Project layout

```text
client/     React + Vite dashboard
server/     Express API, Socket.io server, Mongoose model and seed script
```

## Local setup

1. Create a MongoDB Atlas database and copy its connection string.
2. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`.
3. Install dependencies:

```bash
cd client && npm install
cd ../server && npm install
```

4. Seed the database and start the applications in separate terminals:

```bash
cd server
npm run seed
npm run dev
```

```bash
cd client
npm run dev
```

The client runs on `http://localhost:5173`; the API and Socket.io server run on `http://localhost:5000`.

## Environment variables

Server (`server/.env`):

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rapiddispatch
CLIENT_URL=http://localhost:5173
```

Client (optional `client/.env` for deployment):

```env
VITE_SOCKET_URL=https://your-render-service.onrender.com
```

`VITE_SOCKET_URL` is also used for REST requests. When omitted, the client uses the local backend.

## Socket architecture and locking

- MongoDB is the persistent source for tickets.
- The Node process keeps active locks in an in-memory `Map`, keyed by ticket id.
- Socket.io broadcasts `ticket_created`, `ticket_updated`, `ticket_locked`, and `ticket_unlocked` to every client.
- `lock_ticket` accepts only an unlocked ticket. The owner is identified by `socket.id` and agent name.
- `unlock_ticket` verifies ownership before release.
- On socket disconnect, every lock held by that socket is released and broadcast. This removes ghost locks after a tab or connection disappears.

The client maintains one module-level socket instance, subscribes with cleanup functions, and refetches tickets after reconnection. This avoids duplicate listeners under React Strict Mode.

## Dual-window test

1. Open `http://localhost:5173` in two windows.
2. Select **Agent A** in the first and **Agent B** in the second.
3. In Agent A's window, click **Edit** on ticket `#105`.
4. Agent B immediately sees it locked, grayed out, and cannot edit it.
5. Save a change from Agent A. Agent B immediately receives the updated ticket and an unlocked row.
6. Repeat and use **Close without saving**. The lock should release without changing the ticket.
7. Lock a ticket from Agent A and close that browser tab. Agent B should immediately see the ticket unlock.
8. Create a ticket from either window and confirm it appears in the other.

## Deployment

### Render backend

1. Create a new Render Web Service from this repository.
2. Set root directory to `server`.
3. Set build command to `npm install` and start command to `npm start`.
4. Add `MONGODB_URI`, `CLIENT_URL=https://your-project.vercel.app`, and optionally `PORT` (Render provides it automatically).
5. Deploy and copy the service URL.

### Vercel frontend

1. Import the repository into Vercel.
2. Set root directory to `client` and framework preset to Vite.
3. Add `VITE_SOCKET_URL=https://your-render-service.onrender.com`.
4. Deploy, then set the resulting Vercel URL as the Render `CLIENT_URL` value and redeploy Render.

Socket.io supports WebSocket upgrades through the shared HTTP server and uses the configured origin rather than an unrestricted CORS policy.

## GitHub

```bash
cd "C:\Prodesk Mission 19"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rapiddispatch-live-ops.git
git push -u origin main
```

