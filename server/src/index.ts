import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket/handlers';

const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true }));

// Serve the built client in production (client/dist)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
registerSocketHandlers(io);

server.listen(PORT, () => console.log(`Typing Tug of War server on http://localhost:${PORT}`));