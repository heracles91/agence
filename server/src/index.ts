import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import routes from './routes';
import { setupSocket } from './socket';
import type { ServerToClientEvents, ClientToServerEvents } from 'agence-shared';

const app = express();
const httpServer = createServer(app);

export const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: config.CORS_ORIGIN,
    credentials: true,
  },
});

app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Fichiers uploadés (Designer) — servis uniquement en production ou si nécessaire
// L'accès est contrôlé par auth middleware dans les routes upload
app.use('/uploads', express.static(path.join(__dirname, '..', config.UPLOAD_DIR)));

app.use('/api', routes);

if (config.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

setupSocket(io);

httpServer.listen(config.PORT, () => {
  console.log(`Serveur AGENCE démarré — http://localhost:${config.PORT}`);
  console.log(`Environnement : ${config.NODE_ENV}`);
});
