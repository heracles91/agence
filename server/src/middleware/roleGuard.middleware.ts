import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Accès réservé à l\'administrateur' });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Accès non autorisé pour ce rôle' });
    }
    next();
  };
}

export function requireSelf(req: AuthRequest, res: Response, next: NextFunction) {
  const targetUserId = req.params.userId;
  if (req.userId !== targetUserId && !req.isAdmin) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }
  next();
}
