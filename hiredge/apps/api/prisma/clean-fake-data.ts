import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanFakeData() {
  console.log('🧹 Nettoyage des données fictives...\n');

  // 1. Supprimer toutes les candidatures fictives
  const deletedApplications = await prisma.application.deleteMany({});
  console.log(`✅ ${deletedApplications.count} candidatures supprimées`);

  // 2. Supprimer les offres fictives (source = 'internal' ou pas de source Adzuna)
  const deletedFakeJobs = await prisma.job.deleteMany({
    where: {
      OR: [
        { source: 'internal' },
        { source: null },
        { externalId: { startsWith: 'job-demo' } },
      ],
    },
  });
  console.log(`✅ ${deletedFakeJobs.count} offres fictives supprimées`);

  // 3. Supprimer les entreprises fictives (celles créées pour les démos)
  const deletedFakeCompanies = await prisma.company.deleteMany({
    where: {
      id: { in: ['comp-1', 'comp-2', 'comp-3'] },
    },
  });
  console.log(`✅ ${deletedFakeCompanies.count} entreprises fictives supprimées`);

  // 4. Supprimer les entreprises orphelines (sans offres)
  const companiesWithJobs = await prisma.job.findMany({
    select: { companyId: true },
    distinct: ['companyId'],
  });
  const companyIdsWithJobs = companiesWithJobs.map(j => j.companyId);
  
  const deletedOrphanCompanies = await prisma.company.deleteMany({
    where: {
      id: { notIn: companyIdsWithJobs },
    },
  });
  console.log(`✅ ${deletedOrphanCompanies.count} entreprises orphelines supprimées`);

  // Statistiques finales
  const jobCount = await prisma.job.count();
  const companyCount = await prisma.company.count();
  const applicationCount = await prisma.application.count();

  console.log('\n📊 État de la base de données :');
  console.log(`   - ${jobCount} offres d'emploi (vraies, depuis Adzuna)`);
  console.log(`   - ${companyCount} entreprises`);
  console.log(`   - ${applicationCount} candidatures`);

  console.log('\n🎉 Nettoyage terminé !');
}

cleanFakeData()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
