import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Villes canadiennes connues
const CANADIAN_CITIES = [
  'montreal', 'montréal', 'toronto', 'vancouver', 'calgary', 'edmonton', 
  'ottawa', 'winnipeg', 'quebec', 'québec', 'hamilton', 'kitchener',
  'london', 'victoria', 'halifax', 'oshawa', 'windsor', 'saskatoon',
  'regina', 'sherbrooke', 'barrie', 'kelowna', 'abbotsford', 'kingston',
  'trois-rivières', 'guelph', 'moncton', 'brantford', 'thunder bay',
  'saint john', 'peterborough', 'laval', 'longueuil', 'gatineau', 'burnaby',
  'surrey', 'markham', 'mississauga', 'brampton', 'scarborough', 'richmond',
  'waterloo', 'cambridge', 'st. catharines', 'niagara', 'fredericton',
  'charlottetown', "st. john's", 'whitehorse', 'yellowknife', 'iqaluit',
  // Provinces
  'ontario', 'quebec', 'british columbia', 'alberta', 'manitoba',
  'saskatchewan', 'nova scotia', 'new brunswick', 'newfoundland',
  'prince edward island', 'northwest territories', 'yukon', 'nunavut',
  // Canada général
  'canada', 'remote canada', 'remote - canada'
];

function isCanadianLocation(location: string | null): boolean {
  if (!location) return false;
  const lower = location.toLowerCase();
  
  // Vérifier si c'est au Canada
  if (lower.includes('canada')) return true;
  
  // Vérifier les provinces/villes canadiennes
  for (const city of CANADIAN_CITIES) {
    if (lower.includes(city)) return true;
  }
  
  // Exclure explicitement certains pays/villes non-canadiens
  const nonCanadian = ['germany', 'berlin', 'france', 'paris', 'uk', 'london, uk', 
                       'usa', 'united states', 'australia', 'india', 'china',
                       'spain', 'italy', 'netherlands', 'belgium', 'switzerland'];
  for (const place of nonCanadian) {
    if (lower.includes(place)) return false;
  }
  
  return false;
}

async function cleanNonCanadianJobs() {
  console.log('🇨🇦 Nettoyage des offres hors Canada...\n');

  // Récupérer toutes les offres
  const allJobs = await prisma.job.findMany({
    select: { id: true, location: true, title: true },
  });

  const toDelete: string[] = [];
  const kept: string[] = [];

  for (const job of allJobs) {
    if (!isCanadianLocation(job.location)) {
      toDelete.push(job.id);
      console.log(`❌ Suppression: "${job.title}" - ${job.location}`);
    } else {
      kept.push(job.id);
    }
  }

  if (toDelete.length > 0) {
    await prisma.job.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  // Nettoyer les entreprises orphelines
  const companiesWithJobs = await prisma.job.findMany({
    select: { companyId: true },
    distinct: ['companyId'],
  });
  const companyIdsWithJobs = companiesWithJobs.map((j: { companyId: string }) => j.companyId);
  
  const deletedOrphanCompanies = await prisma.company.deleteMany({
    where: {
      id: { notIn: companyIdsWithJobs },
    },
  });

  console.log(`\n📊 Résultat:`);
  console.log(`   - ${toDelete.length} offres hors Canada supprimées`);
  console.log(`   - ${kept.length} offres Canada conservées`);
  console.log(`   - ${deletedOrphanCompanies.count} entreprises orphelines supprimées`);
  
  // Afficher les localisations restantes
  const remainingLocations = await prisma.job.findMany({
    select: { location: true },
    distinct: ['location'],
  });
  console.log(`\n🗺️ Localisations restantes:`);
  remainingLocations.forEach((l: { location: string | null }) => console.log(`   - ${l.location}`));
}

cleanNonCanadianJobs()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
