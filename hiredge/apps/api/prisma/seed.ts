import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Demo User ──────────────────────────────
  const passwordHash = await bcrypt.hash('demo123456', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@hiredge.app' },
    update: {},
    create: {
      email: 'demo@hiredge.app',
      passwordHash,
      role: 'CANDIDATE',
      subscriptionTier: 'FREE',
      candidateProfile: {
        create: {
          firstName: 'Amadou',
          lastName: 'Diallo',
          title: 'Développeur Full-Stack JavaScript',
          bio: 'Passionné par le développement web et mobile. 4 ans d\'expérience avec React, Node.js et TypeScript.',
          city: 'Paris',
          country: 'FR',
          salaryMin: 40000,
          salaryMax: 50000,
          remotePreference: 'HYBRID',
          yearsExperience: 4,
          completionScore: 80,
          skills: {
            create: [
              { name: 'JavaScript', level: 'EXPERT' },
              { name: 'TypeScript', level: 'ADVANCED' },
              { name: 'React', level: 'EXPERT' },
              { name: 'Node.js', level: 'ADVANCED' },
              { name: 'PostgreSQL', level: 'INTERMEDIATE' },
              { name: 'Docker', level: 'INTERMEDIATE' },
            ],
          },
          experiences: {
            create: [
              {
                title: 'Développeur Full-Stack',
                company: 'TechStart Africa',
                location: 'Paris',
                startDate: new Date('2022-03-01'),
                current: true,
                description: 'Développement d\'applications web et mobile avec React, Node.js et PostgreSQL.',
              },
              {
                title: 'Développeur Frontend',
                company: 'DigiAgence',
                location: 'Lyon',
                startDate: new Date('2020-06-01'),
                endDate: new Date('2022-02-28'),
                current: false,
                description: 'Intégration de maquettes et développement de SPAs avec React.',
              },
            ],
          },
          educations: {
            create: [
              {
                institution: 'Université Paris-Saclay',
                degree: 'Master',
                field: 'Informatique',
                startDate: new Date('2018-09-01'),
                endDate: new Date('2020-06-30'),
              },
            ],
          },
        },
      },
    },
  });

  console.log(`✅ User créé: ${user.email}`);

  // ─── Demo Companies ─────────────────────────
  const companies = await Promise.all([
    prisma.company.upsert({
      where: { id: 'comp-1' },
      update: {},
      create: {
        id: 'comp-1',
        name: 'TechAfrica',
        industry: 'Technology',
        sizeRange: '50-200',
        location: 'Paris',
        website: 'https://techafrica.io',
      },
    }),
    prisma.company.upsert({
      where: { id: 'comp-2' },
      update: {},
      create: {
        id: 'comp-2',
        name: 'DataSenegal',
        industry: 'Data & AI',
        sizeRange: '10-50',
        location: 'Dakar',
        website: 'https://datasenegal.sn',
      },
    }),
    prisma.company.upsert({
      where: { id: 'comp-3' },
      update: {},
      create: {
        id: 'comp-3',
        name: 'FintechCongo',
        industry: 'Fintech',
        sizeRange: '50-200',
        location: 'Kinshasa',
        website: 'https://fintechcongo.cd',
      },
    }),
  ]);

  console.log(`✅ ${companies.length} entreprises créées`);

  // ─── Demo Jobs ──────────────────────────────
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        title: 'Développeur React Senior',
        description: 'Nous recherchons un développeur React expérimenté pour rejoindre notre équipe produit. Vous travaillerez sur notre plateforme SaaS B2B destinée aux entreprises africaines.',
        location: 'Paris',
        locationCity: 'Paris',
        locationCountry: 'FR',
        contractType: 'CDI',
        salaryMin: 50000,
        salaryMax: 65000,
        remote: true,
        status: 'ACTIVE',
        companyId: 'comp-1',
        requiredSkills: JSON.stringify(['React', 'TypeScript', 'Node.js', 'PostgreSQL']),
        experienceMin: 5,
        postedAt: new Date(),
        source: 'internal',
        externalId: 'job-demo-1',
      },
    }),
    prisma.job.create({
      data: {
        title: 'Data Engineer',
        description: 'Mission : concevoir et maintenir nos pipelines de données. Stack : Python, Spark, Airflow, BigQuery. Environnement international et stimulant.',
        location: 'Dakar',
        locationCity: 'Dakar',
        locationCountry: 'SN',
        contractType: 'CDI',
        salaryMin: 35000,
        salaryMax: 50000,
        remote: false,
        status: 'ACTIVE',
        companyId: 'comp-2',
        requiredSkills: JSON.stringify(['Python', 'SQL', 'Spark', 'Airflow']),
        experienceMin: 3,
        postedAt: new Date(),
        source: 'internal',
        externalId: 'job-demo-2',
      },
    }),
    prisma.job.create({
      data: {
        title: 'Chef de Projet Digital',
        description: 'Pilotez le développement de notre application mobile de paiement. Gestion d\'une équipe de 5 développeurs.',
        location: 'Kinshasa',
        locationCity: 'Kinshasa',
        locationCountry: 'CD',
        contractType: 'CDI',
        salaryMin: 30000,
        salaryMax: 45000,
        remote: false,
        status: 'ACTIVE',
        companyId: 'comp-3',
        requiredSkills: JSON.stringify(['Management', 'Agile', 'Mobile', 'Fintech']),
        experienceMin: 5,
        postedAt: new Date(),
        source: 'internal',
        externalId: 'job-demo-3',
      },
    }),
  ]);

  console.log(`✅ ${jobs.length} offres d'emploi créées`);

  // ─── Demo Squad ─────────────────────────────
  const squad = await prisma.squad.create({
    data: {
      name: 'Les Conquérants Tech',
      description: 'Escouade de devs qui veulent décrocher un CDI avant fin 2024 !',
      status: 'FORMING',
      members: {
        create: {
          userId: user.id,
          role: 'MEMBER',
        },
      },
    },
  });

  console.log(`✅ Escouade créée: ${squad.name}`);

  console.log('\n🎉 Seed terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
