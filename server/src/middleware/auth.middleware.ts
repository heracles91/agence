import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  isAdmin?: boolean;
}

interface JwtPayload {
  userId: string;
  role: string;
  isAdmin: boolean;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.userId = payload.userId;
    req.userRole = payload.role;
    req.isAdmin = payload.isAdmin;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expirée, reconnecte-toi' });
  }
}
