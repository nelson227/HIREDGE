import { AdzunaService } from '../src/services/adzuna.service';
import { JSearchService } from '../src/services/jsearch.service';
import prisma from '../src/db/prisma';

const adzuna = new AdzunaService();
const jsearch = new JSearchService();

async function run() {
  try {
    console.log('═══════════════════════════════════════════');
    console.log('  HIREDGE — Import d\'offres Canada 🇨🇦');
    console.log('═══════════════════════════════════════════\n');

    // ─── Adzuna ───────────────────────────────
    console.log('📡 Source: Adzuna');
    const r1 = await adzuna.importJobs({ keywords: 'developer', location: 'Montreal', country: 'canada', maxPages: 3 });
    console.log(`  ✅ Montreal: ${r1.imported}/${r1.fetched}`);
    
    const r2 = await adzuna.importJobs({ keywords: 'developer', location: 'Toronto', country: 'canada', maxPages: 2 });
    console.log(`  ✅ Toronto: ${r2.imported}/${r2.fetched}`);
    
    const r3 = await adzuna.importJobs({ keywords: 'software engineer', location: 'Vancouver', country: 'canada', maxPages: 2 });
    console.log(`  ✅ Vancouver: ${r3.imported}/${r3.fetched}`);

    // ─── JSearch (LinkedIn, Indeed, Glassdoor) ─
    const jsearchKey = process.env.JSEARCH_API_KEY;
    if (jsearchKey) {
      console.log('\n📡 Source: JSearch (LinkedIn, Indeed, Glassdoor)');
      const queries = [
        { query: 'software developer Montreal', numPages: 2 },
        { query: 'software engineer Toronto', numPages: 2 },
        { query: 'full stack developer Vancouver', numPages: 1 },
      ];
      for (const q of queries) {
        const result = await jsearch.importJobs({ query: q.query, numPages: q.numPages, country: 'CA', datePosted: 'month' });
        console.log(`  ✅ "${q.query}": ${result.imported}/${result.fetched}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      console.log('\n⚠️  JSEARCH_API_KEY non configurée — skip LinkedIn/Indeed/Glassdoor');
      console.log('   → Obtenir une clé: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch');
    }

    // ─── Stats ────────────────────────────────
    const total = await prisma.job.count();
    const bySrc = await prisma.job.groupBy({ by: ['source'], _count: true });
    console.log(`\n══════════════════════════════`);
    console.log(`📊 Total offres en base: ${total}`);
    for (const s of bySrc) {
      console.log(`   ${s.source}: ${s._count}`);
    }
  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }
  await prisma.$disconnect();
  process.exit(0);
}

run();
