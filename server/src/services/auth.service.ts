import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { config } from '../config';

const USER_SAFE_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  isAdmin: true,
  createdAt: true,
} as const;

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Délai constant pour éviter le timing attack
  const dummyHash = '$2a$12$invalide';
  const valid = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, dummyHash).then(() => false);

  if (!user || !valid) {
    throw new Error('Identifiants incorrects');
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, isAdmin: user.isAdmin },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

export async function createUser(data: {
  username: string;
  email: string;
  password: string;
  isAdmin?: boolean;
}) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { username: data.username }] },
  });

  if (existing) {
    throw new Error('Un compte avec cet email ou ce nom d\'utilisateur existe déjà');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  return prisma.user.create({
    data: {
      username: data.username,
      email: data.email,
      passwordHash,
      isAdmin: data.isAdmin ?? false,
    },
    select: USER_SAFE_SELECT,
  });
}

export async function getMe(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: USER_SAFE_SELECT,
  });
}

export async function updatePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Utilisateur introuvable');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error('Mot de passe actuel incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
