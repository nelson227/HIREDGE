import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Demo User ──────────────────────────────
  let demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword) {
    demoPassword = randomBytes(12).toString('base64url');
    console.log(`⚠️  No SEED_DEMO_PASSWORD env var set. Generated password: ${demoPassword}`);
  }
  const passwordHash = await bcrypt.hash(demoPassword, 12);

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
          city: 'Montreal',
          country: 'CA',
          salaryMin: 70000,
          salaryMax: 90000,
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
                company: 'Shopify',
                location: 'Montreal',
                startDate: new Date('2022-03-01'),
                current: true,
                description: 'Développement d\'applications web et mobile avec React, Node.js et PostgreSQL.',
              },
              {
                title: 'Développeur Frontend',
                company: 'Lightspeed Commerce',
                location: 'Montreal',
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
                institution: 'Université de Montréal',
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
        name: 'Shopify',
        industry: 'Technology',
        sizeRange: '5000+',
        location: 'Toronto',
        website: 'https://shopify.com',
      },
    }),
    prisma.company.upsert({
      where: { id: 'comp-2' },
      update: {},
      create: {
        id: 'comp-2',
        name: 'Element AI',
        industry: 'Data & AI',
        sizeRange: '200-500',
        location: 'Montreal',
        website: 'https://elementai.com',
      },
    }),
    prisma.company.upsert({
      where: { id: 'comp-3' },
      update: {},
      create: {
        id: 'comp-3',
        name: 'Wealthsimple',
        industry: 'Fintech',
        sizeRange: '500-1000',
        location: 'Toronto',
        website: 'https://wealthsimple.com',
      },
    }),
  ]);

  console.log(`✅ ${companies.length} entreprises créées`);

  // ─── Demo Jobs ──────────────────────────────
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        title: 'Senior React Developer',
        description: 'We are looking for an experienced React developer to join our product team. You will work on our e-commerce platform serving millions of merchants worldwide.',
        location: 'Toronto, ON',
        locationCity: 'Toronto',
        locationCountry: 'CA',
        contractType: 'CDI',
        salaryMin: 90000,
        salaryMax: 120000,
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
        description: 'Design and maintain our data pipelines. Stack: Python, Spark, Airflow, BigQuery. International and stimulating environment in the heart of Montreal\'s AI hub.',
        location: 'Montreal, QC',
        locationCity: 'Montreal',
        locationCountry: 'CA',
        contractType: 'CDI',
        salaryMin: 80000,
        salaryMax: 105000,
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
        title: 'Digital Project Manager',
        description: 'Lead the development of our mobile investment platform. Manage a team of 5 developers in a fast-paced fintech environment.',
        location: 'Toronto, ON',
        locationCity: 'Toronto',
        locationCountry: 'CA',
        contractType: 'CDI',
        salaryMin: 85000,
        salaryMax: 110000,
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
      description: 'Escouade de devs au Canada qui veulent décrocher un emploi tech !',
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
