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
      firstName: 'Amadou',
      lastName: 'Diallo',
      role: 'CANDIDATE',
      subscriptionTier: 'FREE',
      candidateProfile: {
        create: {
          title: 'Développeur Full-Stack JavaScript',
          bio: 'Passionné par le développement web et mobile. 4 ans d\'expérience avec React, Node.js et TypeScript.',
          preferredLocations: ['Paris', 'Lyon', 'Remote'],
          preferredContractTypes: ['CDI', 'FREELANCE'],
          salaryExpectation: 45000,
          remotePreference: 'HYBRID',
          completionScore: 80,
          skills: {
            create: [
              { name: 'JavaScript', level: 5, category: 'TECHNICAL' },
              { name: 'TypeScript', level: 4, category: 'TECHNICAL' },
              { name: 'React', level: 5, category: 'TECHNICAL' },
              { name: 'Node.js', level: 4, category: 'TECHNICAL' },
              { name: 'PostgreSQL', level: 3, category: 'TECHNICAL' },
              { name: 'Docker', level: 3, category: 'TOOL' },
              { name: 'Communication', level: 4, category: 'SOFT' },
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
                school: 'Université Paris-Saclay',
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
        description: 'Leader du développement logiciel en Afrique francophone.',
        industry: 'Technology',
        size: 'MEDIUM',
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
        description: 'Startup spécialisée en data science et IA.',
        industry: 'Data & AI',
        size: 'STARTUP',
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
        description: 'Solutions de paiement mobile pour l\'Afrique centrale.',
        industry: 'Fintech',
        size: 'MEDIUM',
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
        contractType: 'CDI',
        salaryMin: 50000,
        salaryMax: 65000,
        remote: true,
        status: 'ACTIVE',
        companyId: 'comp-1',
        requiredSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
        experienceLevel: 'SENIOR',
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
        contractType: 'CDI',
        salaryMin: 35000,
        salaryMax: 50000,
        remote: false,
        status: 'ACTIVE',
        companyId: 'comp-2',
        requiredSkills: ['Python', 'SQL', 'Spark', 'Airflow'],
        experienceLevel: 'CONFIRMED',
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
        contractType: 'CDI',
        salaryMin: 30000,
        salaryMax: 45000,
        remote: false,
        status: 'ACTIVE',
        companyId: 'comp-3',
        requiredSkills: ['Management', 'Agile', 'Mobile', 'Fintech'],
        experienceLevel: 'SENIOR',
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
      objective: 'CDI Tech en 2024',
      status: 'ACTIVE',
      members: {
        create: {
          userId: user.id,
          role: 'LEADER',
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
