import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { attachGame } from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server, { perMessageDeflate: false });
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
const game = attachGame(io);
app.get('/health', (_q, res) => res.json({ ok: true, players: game.players.size }));

server.listen(PORT, () => console.log(`🍻 Quán Anh Ken – Nhậu Online: http://localhost:${PORT}`));
