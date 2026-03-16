/**
 * Script de promotion admin — à exécuter une seule fois.
 * Usage: npx tsx scripts/promote-admin.ts <email>
 * 
 * Ce script est destiné à être exécuté sur Railway via:
 *   railway run npx tsx scripts/promote-admin.ts nelson@email.com
 * ou directement si DATABASE_URL est défini.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    // Si pas d'email fourni, lister les utilisateurs et promouvoir le premier
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
    
    console.log('Utilisateurs existants:');
    users.forEach(u => console.log(`  ${u.email} (${u.role})`));
    
    if (users.length === 0) {
      console.log('Aucun utilisateur trouvé.');
      return;
    }
    
    // Promouvoir le premier utilisateur
    const first = users[0]!;
    if (first.role === 'ADMIN') {
      console.log(`\n${first.email} est déjà ADMIN.`);
      return;
    }
    
    const updated = await prisma.user.update({
      where: { id: first.id },
      data: { role: 'ADMIN' },
      select: { email: true, role: true },
    });
    console.log(`\n✅ ${updated.email} promu ADMIN avec succès !`);
    return;
  }
  
  // Promouvoir par email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌ Utilisateur ${email} introuvable.`);
    process.exit(1);
  }
  
  if (user.role === 'ADMIN') {
    console.log(`${email} est déjà ADMIN.`);
    return;
  }
  
  await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' },
  });
  
  console.log(`✅ ${email} promu ADMIN avec succès !`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
