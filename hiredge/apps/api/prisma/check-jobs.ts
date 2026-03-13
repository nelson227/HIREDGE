import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const jobs = await prisma.job.count();
  const locations = await prisma.job.findMany({
    select: { location: true },
    distinct: ['location'],
  });
  
  console.log(`\n📊 Offres: ${jobs}`);
  console.log('\n🗺️ Localisations:');
  locations.forEach(l => console.log(`  - ${l.location}`));
}

check().finally(() => prisma.$disconnect());
