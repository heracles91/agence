import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // GameConfig singleton
  await prisma.gameConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      phase: 'prelaunch',
      currentDay: 0,
      dailyUpdateHour: 20,
    },
  });
  console.log('GameConfig initialisé.');

  // Admin par défaut
  const existing = await prisma.user.findUnique({ where: { email: 'admin@agence.local' } });
  if (!existing) {
    const password = 'Admin1234!';
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@agence.local',
        passwordHash: hash,
        role: 'admin',
        isAdmin: true,
      },
    });
    console.log('\n=== COMPTE ADMIN CRÉÉ ===');
    console.log('Email    : admin@agence.local');
    console.log('Mot de passe : Admin1234!');
    console.log('CHANGE CE MOT DE PASSE IMMÉDIATEMENT APRÈS LA PREMIÈRE CONNEXION.\n');
  } else {
    console.log('Admin déjà existant — aucun changement.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
