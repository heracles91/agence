import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import path from 'path';

export function uploadFile(req: AuthRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier reçu' });
  }
  const url = `/uploads/${path.basename(req.file.path)}`;
  res.json({ data: { url }, message: 'Fichier uploadé' });
}
