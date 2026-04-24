/**
 * Reset the game between sessions.
 * Keeps user accounts but wipes all game data and resets roles.
 * Usage: npx tsx prisma/reset.ts
 */
import { PrismaClient, GamePhase } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Réinitialisation de la session AGENCE...\n');

  // Delete all game data in dependency order
  await prisma.minigameSubmission.deleteMany();
  console.log('  ✓ Soumissions supprimées');

  await prisma.minigame.deleteMany();
  console.log('  ✓ Mini-jeux supprimés');

  await prisma.notification.deleteMany();
  console.log('  ✓ Notifications supprimées');

  await prisma.privateContent.deleteMany();
  console.log('  ✓ Contenus privés supprimés');

  await prisma.dailyNews.deleteMany();
  console.log('  ✓ Actualités supprimées');

  await prisma.crisisVote.deleteMany();
  await prisma.crisis.deleteMany();
  console.log('  ✓ Crises supprimées');

  await prisma.satisfactionScore.deleteMany();
  console.log('  ✓ Scores supprimés');

  await prisma.roleVote.deleteMany();
  console.log('  ✓ Votes de rôle supprimés');

  await prisma.auditLog.deleteMany();
  console.log('  ✓ Logs supprimés');

  // Reset roles for non-admin users
  await prisma.user.updateMany({
    where: { isAdmin: false },
    data: { role: null },
  });
  console.log('  ✓ Rôles joueurs réinitialisés');

  // Reset GameConfig to prelaunch
  await prisma.gameConfig.update({
    where: { id: 1 },
    data: {
      phase: GamePhase.prelaunch,
      currentDay: 0,
      launchDate: null,
    },
  });
  console.log('  ✓ GameConfig réinitialisé (PRELAUNCH, Jour 0)');

  console.log('\nRéinitialisation terminée. Les comptes joueurs sont conservés.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
