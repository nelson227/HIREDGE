import { JSearchService } from '../src/services/jsearch.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const svc = new JSearchService();

const QUERIES = [
  // Dev / Software Engineering
  { query: 'software developer Montreal', numPages: 2 },
  { query: 'software engineer Toronto', numPages: 2 },
  { query: 'full stack developer Vancouver', numPages: 1 },
  { query: 'frontend developer Canada', numPages: 1 },
  { query: 'backend developer Canada', numPages: 1 },
  // Data / AI
  { query: 'data engineer Canada', numPages: 1 },
  { query: 'data scientist Canada', numPages: 1 },
  // DevOps / Cloud
  { query: 'devops engineer Canada', numPages: 1 },
];

async function run() {
  console.log('🔍 JSearch Import — LinkedIn, Indeed, Glassdoor aggregator');
  console.log('='.repeat(55));

  let grandTotal = { fetched: 0, imported: 0 };

  for (const q of QUERIES) {
    try {
      console.log(`\n📋 "${q.query}" (${q.numPages} page(s))...`);
      const result = await svc.importJobs({
        query: q.query,
        numPages: q.numPages,
        country: 'CA',
        datePosted: 'month',
      });
      console.log(`   ✅ ${result.imported}/${result.fetched} importées`);
      grandTotal.fetched += result.fetched;
      grandTotal.imported += result.imported;

      // Rate limit between queries (RapidAPI free tier)
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e: any) {
      console.error(`   ❌ Error: ${e.message}`);
    }
  }

  const total = await prisma.job.count();
  const bySrc = await prisma.job.groupBy({ by: ['source'], _count: true });

  console.log('\n' + '='.repeat(55));
  console.log(`📊 Résultat: ${grandTotal.imported}/${grandTotal.fetched} nouvelles offres`);
  console.log(`📊 Total en base: ${total}`);
  console.log('\nPar source:');
  for (const s of bySrc) {
    console.log(`   ${s.source}: ${s._count}`);
  }

  await prisma.$disconnect();
  process.exit(0);
}

run();
