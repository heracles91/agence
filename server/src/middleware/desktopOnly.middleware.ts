import { Request, Response, NextFunction } from 'express';

const MOBILE_PATTERNS = [
  /android/i,
  /iphone/i,
  /ipad/i,
  /ipod/i,
  /blackberry/i,
  /windows phone/i,
  /opera mini/i,
  /\bmobile\b/i,
];

export function desktopOnly(req: Request, res: Response, next: NextFunction) {
  const ua = req.headers['user-agent'] ?? '';
  const isMobile = MOBILE_PATTERNS.some((p) => p.test(ua));

  if (isMobile) {
    return res.status(403).json({
      error: 'mobile_restricted',
      message:
        'Pour jouer, connecte-toi depuis un ordinateur. Sur mobile, tu peux consulter les scores et l\'actualité.',
    });
  }

  next();
}
