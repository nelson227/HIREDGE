const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const companies = [
    { id:'c-google', name:'Google', industry:'Technology', sizeRange:'10000+', location:'Montreal, QC', website:'https://google.com' },
    { id:'c-amazon', name:'Amazon', industry:'E-commerce & Cloud', sizeRange:'10000+', location:'Vancouver, BC', website:'https://amazon.ca' },
    { id:'c-desjardins', name:'Desjardins', industry:'Finance', sizeRange:'5000+', location:'Montreal, QC', website:'https://desjardins.com' },
    { id:'c-ubisoft', name:'Ubisoft Montreal', industry:'Gaming', sizeRange:'1000-5000', location:'Montreal, QC', website:'https://ubisoft.com' },
    { id:'c-cae', name:'CAE', industry:'Aerospace & Simulation', sizeRange:'1000-5000', location:'Montreal, QC', website:'https://cae.com' },
    { id:'c-lightspeed', name:'Lightspeed Commerce', industry:'Fintech', sizeRange:'1000-5000', location:'Montreal, QC', website:'https://lightspeedhq.com' },
    { id:'c-bell', name:'Bell Canada', industry:'Telecommunications', sizeRange:'10000+', location:'Montreal, QC', website:'https://bell.ca' },
    { id:'c-morgan', name:'Morgan Stanley', industry:'Finance', sizeRange:'10000+', location:'Montreal, QC', website:'https://morganstanley.com' },
    { id:'c-cgi', name:'CGI Group', industry:'IT Services', sizeRange:'10000+', location:'Montreal, QC', website:'https://cgi.com' },
    { id:'c-coveo', name:'Coveo', industry:'AI & Search', sizeRange:'500-1000', location:'Quebec City, QC', website:'https://coveo.com' },
  ];

  for (const c of companies) {
    await prisma.company.upsert({ where: { id: c.id }, update: {}, create: c });
  }
  console.log(companies.length + ' companies created');

  const jobs = [
    { title:'Full Stack Developer',companyId:'c-google',description:'Build and maintain scalable web applications using React and Node.js. Collaborate with UX designers and backend teams on Google Search features. Strong focus on performance optimization and code quality.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:95000,salaryMax:140000,remote:true,requiredSkills:JSON.stringify(['React','Node.js','TypeScript','Python','GCP']),experienceMin:3 },
    { title:'Machine Learning Engineer',companyId:'c-google',description:'Design and deploy ML models for natural language understanding. Work on cutting-edge NLP research applied to production.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:110000,salaryMax:160000,remote:false,requiredSkills:JSON.stringify(['Python','TensorFlow','PyTorch','NLP','Kubernetes']),experienceMin:4 },
    { title:'Cloud Solutions Architect',companyId:'c-amazon',description:'Design cloud-native architectures for enterprise clients in Canada. Lead technical discussions with C-level stakeholders. Drive AWS adoption.',location:'Vancouver, BC',locationCity:'Vancouver',locationCountry:'CA',contractType:'CDI',salaryMin:120000,salaryMax:170000,remote:true,requiredSkills:JSON.stringify(['AWS','Terraform','Docker','Kubernetes','Python']),experienceMin:5 },
    { title:'Backend Developer Java',companyId:'c-amazon',description:'Develop high-performance microservices processing millions of transactions daily. Implement distributed systems patterns.',location:'Toronto, ON',locationCity:'Toronto',locationCountry:'CA',contractType:'CDI',salaryMin:100000,salaryMax:145000,remote:false,requiredSkills:JSON.stringify(['Java','Spring Boot','AWS','DynamoDB','Microservices']),experienceMin:3 },
    { title:'Analyste Cybersecurity',companyId:'c-desjardins',description:'Proteger les systemes informatiques de Desjardins. Analyser les menaces et vulnerabilites. Implementer des solutions de securite avancees.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:75000,salaryMax:100000,remote:false,requiredSkills:JSON.stringify(['Cybersecurity','SIEM','Network Security','Python','ISO 27001']),experienceMin:2 },
    { title:'Data Analyst',companyId:'c-desjardins',description:'Analyser les donnees clients pour optimiser les services financiers. Creer des dashboards et rapports. Supporter les equipes marketing.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:65000,salaryMax:85000,remote:true,requiredSkills:JSON.stringify(['SQL','Python','Power BI','Excel','Statistics']),experienceMin:1 },
    { title:'Game Programmer C++',companyId:'c-ubisoft',description:'Work on AAA game titles using proprietary game engines. Optimize rendering pipelines and gameplay systems. Creative environment.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:80000,salaryMax:120000,remote:false,requiredSkills:JSON.stringify(['C++','Game Engines','OpenGL','Physics','Multithreading']),experienceMin:3 },
    { title:'AI/ML Research Engineer',companyId:'c-ubisoft',description:'Apply AI techniques to game development including procedural content generation, NPC behavior, and player experience optimization.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:90000,salaryMax:130000,remote:false,requiredSkills:JSON.stringify(['Python','PyTorch','Reinforcement Learning','C++','Research']),experienceMin:2 },
    { title:'DevOps Engineer',companyId:'c-cae',description:'Automate deployment pipelines for flight simulation software. Manage hybrid cloud infrastructure. Ensure high availability.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:85000,salaryMax:115000,remote:true,requiredSkills:JSON.stringify(['Docker','Kubernetes','Jenkins','Terraform','Linux']),experienceMin:3 },
    { title:'React Native Developer',companyId:'c-lightspeed',description:'Build mobile payment solutions used by millions of merchants. Cross-platform features with React Native.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:80000,salaryMax:110000,remote:true,requiredSkills:JSON.stringify(['React Native','TypeScript','Redux','REST API','Mobile']),experienceMin:2 },
    { title:'Product Manager',companyId:'c-lightspeed',description:'Define product roadmap for merchant analytics platform. Work with engineering, design, and data teams.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:90000,salaryMax:130000,remote:true,requiredSkills:JSON.stringify(['Product Strategy','Agile','Analytics','SQL','User Research']),experienceMin:4 },
    { title:'Network Engineer',companyId:'c-bell',description:'Design and implement next-generation 5G network infrastructure. Troubleshoot complex network issues.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:75000,salaryMax:100000,remote:false,requiredSkills:JSON.stringify(['Networking','Cisco','5G','BGP','Linux']),experienceMin:3 },
    { title:'Quantitative Developer',companyId:'c-morgan',description:'Develop pricing models and risk analytics systems for derivatives trading. High-performance computing with C++ and Python.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:110000,salaryMax:160000,remote:false,requiredSkills:JSON.stringify(['C++','Python','Quantitative Finance','SQL','Linux']),experienceMin:3 },
    { title:'Consultant SAP',companyId:'c-cgi',description:'Implementer et configurer des solutions SAP pour des clients enterprise. Transformation digitale de grandes organisations.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:70000,salaryMax:95000,remote:true,requiredSkills:JSON.stringify(['SAP','ABAP','S/4HANA','Business Process','SQL']),experienceMin:2 },
    { title:'Frontend Developer Vue.js',companyId:'c-coveo',description:'Build search experiences powered by AI. Develop UI components for enterprise search platforms.',location:'Quebec City, QC',locationCity:'Quebec City',locationCountry:'CA',contractType:'CDI',salaryMin:75000,salaryMax:105000,remote:true,requiredSkills:JSON.stringify(['Vue.js','TypeScript','CSS','Web Components','A11y']),experienceMin:2 },
    { title:'Junior Python Developer',companyId:'c-coveo',description:'Join our AI team to build data pipelines and internal tools. Mentorship-driven environment.',location:'Quebec City, QC',locationCity:'Quebec City',locationCountry:'CA',contractType:'CDI',salaryMin:55000,salaryMax:70000,remote:true,requiredSkills:JSON.stringify(['Python','SQL','Git','REST API','Linux']),experienceMin:0 },
    { title:'UX Designer',companyId:'c-lightspeed',description:'Create intuitive interfaces for merchant-facing tools. Conduct user research and usability testing.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:70000,salaryMax:95000,remote:true,requiredSkills:JSON.stringify(['Figma','User Research','Prototyping','Design Systems','A/B Testing']),experienceMin:2 },
    { title:'Site Reliability Engineer',companyId:'c-google',description:'Maintain and improve the reliability of Google services. Develop automation tools, respond to incidents.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:105000,salaryMax:150000,remote:false,requiredSkills:JSON.stringify(['Linux','Python','Kubernetes','Monitoring','Incident Response']),experienceMin:4 },
    { title:'Stagiaire Developpement Web',companyId:'c-desjardins',description:'Stage de 4 mois dans equipe de developpement web. Participer au developpement avec React et .NET.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'STAGE',salaryMin:22000,salaryMax:28000,remote:false,requiredSkills:JSON.stringify(['React','C#','.NET','SQL','Git']),experienceMin:0 },
    { title:'Mobile Developer iOS',companyId:'c-bell',description:'Develop and maintain Bell flagship mobile applications for iOS. Swift and SwiftUI.',location:'Montreal, QC',locationCity:'Montreal',locationCountry:'CA',contractType:'CDI',salaryMin:80000,salaryMax:110000,remote:true,requiredSkills:JSON.stringify(['Swift','SwiftUI','iOS','Xcode','REST API']),experienceMin:2 },
  ];

  for (const j of jobs) {
    await prisma.job.create({
      data: {
        ...j,
        status: 'ACTIVE',
        postedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        source: 'internal',
        externalId: 'job-' + Math.random().toString(36).slice(2, 10),
        salaryCurrency: 'CAD',
      },
    });
  }
  console.log(jobs.length + ' jobs created');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
