import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth.middleware';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    const { token, user } = await authService.login(String(email), String(password));
    res.cookie('token', token, COOKIE_OPTIONS);
    return res.json({ data: user });
  } catch (err) {
    return res.status(401).json({ error: (err as Error).message });
  }
}

export function logout(_req: Request, res: Response) {
  res.clearCookie('token', { path: '/' });
  return res.json({ data: { message: 'Déconnecté' } });
}

export async function me(req: AuthRequest, res: Response) {
  try {
    const user = await authService.getMe(req.userId!);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    return res.json({ data: user });
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères' });
  }

  try {
    await authService.updatePassword(req.userId!, String(currentPassword), String(newPassword));
    return res.json({ data: { message: 'Mot de passe modifié' } });
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
}
