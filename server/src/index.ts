import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket/handlers';
import { authRouter, userFromCookie } from './auth';
import { initDb } from './db';

const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.set('trust proxy', 1); // correct client IP behind Render's proxy
app.use(express.json({ limit: '10kb' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);

// Serve the built client in production (client/dist)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || '*' } });

// Attach the logged-in user (if any) to every socket. Guests have no user.
io.use((socket, next) => {
  socket.data.user = userFromCookie(socket.handshake.headers.cookie);
  next();
});

registerSocketHandlers(io);

initDb()
  .catch((e) => console.error('Database init failed (continuing without accounts):', e))
  .finally(() => {
    server.listen(PORT, () => console.log(`Typing Tug of War server on http://localhost:${PORT}`));
  });