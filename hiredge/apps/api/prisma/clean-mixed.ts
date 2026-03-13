import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clean() {
  // Supprimer les offres avec locations mixtes (USA, Europe, etc.)
  const deleted = await prisma.job.deleteMany({
    where: {
      OR: [
        { location: { contains: 'Europe' } },
        { location: { contains: 'USA' } },
        { location: { contains: 'Philippines' } },
        { location: { contains: 'Jamaica' } },
        { location: { contains: 'South Africa' } },
      ]
    }
  });
  console.log('Supprimées:', deleted.count);
  
  const count = await prisma.job.count();
  console.log('Offres restantes:', count);
  
  const locations = await prisma.job.findMany({
    select: { location: true },
    distinct: ['location'],
  });
  console.log('\nLocalisations finales:');
  locations.forEach(l => console.log(`  - ${l.location}`));
}

clean().finally(() => prisma.$disconnect());
