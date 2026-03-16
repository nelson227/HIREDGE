import { PrismaClient } from '@prisma/client';

const p = new PrismaClient({ log: [] });

async function main() {
  const total = await p.job.count();
  const bySrc = await p.job.groupBy({ by: ['source'], _count: true });
  const companies = await p.company.count();
  
  console.log(`\n📊 Total offres: ${total}`);
  for (const s of bySrc) console.log(`   ${s.source}: ${s._count}`);
  console.log(`🏢 Total entreprises: ${companies}`);
  
  await p.$disconnect();
}

main();
