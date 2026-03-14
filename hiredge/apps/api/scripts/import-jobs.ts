import { AdzunaService } from '../src/services/adzuna.service';
import prisma from '../src/db/prisma';

const svc = new AdzunaService();

async function run() {
  try {
    console.log('🔍 Importing developer jobs from Montreal...');
    const r1 = await svc.importJobs({ keywords: 'developer', location: 'Montreal', country: 'canada', maxPages: 3 });
    console.log(`  ✅ Montreal: ${r1.imported}/${r1.fetched} importées`);
    
    console.log('🔍 Importing developer jobs from Toronto...');
    const r2 = await svc.importJobs({ keywords: 'developer', location: 'Toronto', country: 'canada', maxPages: 2 });
    console.log(`  ✅ Toronto: ${r2.imported}/${r2.fetched} importées`);
    
    console.log('🔍 Importing software engineer jobs from Vancouver...');
    const r3 = await svc.importJobs({ keywords: 'software engineer', location: 'Vancouver', country: 'canada', maxPages: 2 });
    console.log(`  ✅ Vancouver: ${r3.imported}/${r3.fetched} importées`);

    const total = await prisma.job.count();
    console.log(`\n🎉 Total offres en base: ${total}`);
  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }
  await prisma.$disconnect();
  process.exit(0);
}

run();
