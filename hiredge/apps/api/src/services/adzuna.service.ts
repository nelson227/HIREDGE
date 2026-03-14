import { config } from '../config/env';
import { prisma } from '../db/prisma';

const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs';

interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  contract_time?: string;
  redirect_url: string;
  created: string;
  category: { label: string; tag: string };
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
  mean: number;
}

// Country codes pour Adzuna
const COUNTRY_CODES: Record<string, string> = {
  canada: 'ca',
  france: 'fr',
  usa: 'us',
  uk: 'gb',
  germany: 'de',
};

export class AdzunaService {
  private appId: string;
  private appKey: string;

  constructor() {
    this.appId = config.adzuna.appId;
    this.appKey = config.adzuna.appKey;
  }

  /**
   * Recherche des offres d'emploi via Adzuna API
   */
  async searchJobs(params: {
    keywords: string;
    location: string;
    country?: string;
    page?: number;
    resultsPerPage?: number;
  }): Promise<AdzunaJob[]> {
    const {
      keywords,
      location,
      country = 'canada',
      page = 1,
      resultsPerPage = 20,
    } = params;

    const countryCode = COUNTRY_CODES[country.toLowerCase()] || 'ca';

    const url = new URL(`${ADZUNA_BASE_URL}/${countryCode}/search/${page}`);
    url.searchParams.set('app_id', this.appId);
    url.searchParams.set('app_key', this.appKey);
    url.searchParams.set('results_per_page', resultsPerPage.toString());
    url.searchParams.set('what', keywords);
    url.searchParams.set('where', location);
    url.searchParams.set('content-type', 'application/json');

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Adzuna] Erreur API: ${response.status}`, errorText);
        throw new Error(`Adzuna API error: ${response.status}`);
      }

      const data = (await response.json()) as AdzunaResponse;

      return data.results;
    } catch (error: any) {
      console.error('[Adzuna] Erreur:', error.message);
      throw error;
    }
  }

  /**
   * Importe les offres Adzuna dans la base de données
   */
  async importJobs(params: {
    keywords: string;
    location: string;
    country?: string;
    maxPages?: number;
  }): Promise<{ fetched: number; imported: number }> {
    const { keywords, location, country = 'canada', maxPages = 3 } = params;

    let totalFetched = 0;
    let totalImported = 0;

    for (let page = 1; page <= maxPages; page++) {
      const jobs = await this.searchJobs({
        keywords,
        location,
        country,
        page,
        resultsPerPage: 20,
      });

      if (jobs.length === 0) break;

      totalFetched += jobs.length;

      for (const adzunaJob of jobs) {
        try {
          // Vérifier si l'offre existe déjà
          const existing = await prisma.job.findFirst({
            where: {
              externalId: adzunaJob.id,
              source: 'adzuna',
            },
          });

          if (existing) continue;

          // Trouver ou créer la company
          let company = await prisma.company.findFirst({
            where: { name: adzunaJob.company.display_name },
          });

          if (!company) {
            company = await prisma.company.create({
              data: {
                name: adzunaJob.company.display_name,
                industry: adzunaJob.category?.label || 'General',
                location: adzunaJob.location.display_name,
                sizeRange: 'Unknown',
              },
            });
          }

          // Extraire la ville depuis les données Adzuna
          const locationCity = adzunaJob.location.area?.[adzunaJob.location.area.length - 1] || location;
          const countryCode = COUNTRY_CODES[country.toLowerCase()] || 'ca';
          const salaryCurrency = countryCode === 'ca' ? 'CAD' : countryCode === 'us' ? 'USD' : 'EUR';

          // Extract structured data from title + description
          const extractedSkills = this.extractSkills(adzunaJob.title, adzunaJob.description || '');
          const expRange = this.extractExperienceRange(adzunaJob.title, adzunaJob.description || '');

          // Créer l'offre
          await prisma.job.create({
            data: {
              title: adzunaJob.title,
              description: adzunaJob.description || 'No description available',
              location: adzunaJob.location.display_name,
              locationCity,
              locationCountry: countryCode.toUpperCase(),
              companyId: company.id,
              source: 'adzuna',
              externalId: adzunaJob.id,
              sourceUrl: adzunaJob.redirect_url,
              salaryMin: adzunaJob.salary_min ? Math.round(adzunaJob.salary_min) : null,
              salaryMax: adzunaJob.salary_max ? Math.round(adzunaJob.salary_max) : null,
              salaryCurrency,
              contractType: this.mapContractType(adzunaJob.contract_type, adzunaJob.contract_time),
              remote: this.detectRemote(adzunaJob.title, adzunaJob.description || ''),
              experienceMin: expRange.min,
              experienceMax: expRange.max,
              status: 'ACTIVE',
              requiredSkills: JSON.stringify(extractedSkills),
              postedAt: new Date(adzunaJob.created),
            },
          });

          totalImported++;
        } catch (error: any) {
          console.error(`[Adzuna] Erreur import job ${adzunaJob.id}:`, error.message);
        }
      }

      // Petit délai entre les pages pour respecter les rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }


    return { fetched: totalFetched, imported: totalImported };
  }

  private mapContractType(contractType?: string, contractTime?: string): string {
    if (contractType?.toLowerCase().includes('permanent')) return 'CDI';
    if (contractType?.toLowerCase().includes('contract')) return 'CDD';
    if (contractTime?.toLowerCase().includes('part_time')) return 'TEMPS_PARTIEL';
    return 'CDI';
  }

  private detectRemote(title: string, description: string): boolean {
    const text = `${title} ${description}`.toLowerCase();
    return /\b(remote|télétravail|work from home|wfh|hybrid|hybride)\b/.test(text);
  }

  private detectExperienceLevel(title: string): string {
    const lower = title.toLowerCase();
    if (/\b(senior|sr\.?|lead|principal|staff)\b/.test(lower)) return 'SENIOR';
    if (/\b(junior|jr\.?|entry|débutant)\b/.test(lower)) return 'JUNIOR';
    if (/\b(intern|stage|stagiaire)\b/.test(lower)) return 'INTERN';
    return 'MID';
  }

  extractSkills(title: string, description: string): string[] {
    const text = `${title} ${description}`;
    const skills: string[] = [];

    const skillPatterns = [
      // Languages
      /\b(JavaScript|TypeScript|Python|Java(?!Script)|C\+\+|C#|Ruby|Golang|Go(?=\s+(?:lang|developer|engineer))|Rust|PHP|Swift|Kotlin|Scala|Perl|R(?=\s+(?:programming|language))|Dart|Elixir|Clojure|Haskell|Lua|Objective-C|COBOL|Fortran|Assembly|SQL|NoSQL|PL\/SQL|T-SQL|Bash|Shell|PowerShell)\b/gi,
      // Frontend frameworks
      /\b(React(?:\.js|\s?Native)?|Vue(?:\.js)?|Angular(?:\.js)?|Next\.?js|Nuxt\.?js|Svelte|SvelteKit|Gatsby|Remix|Ember\.?js|Backbone\.?js|jQuery|Storybook|Webpack|Vite|Rollup|Babel|ESLint)\b/gi,
      // CSS / Design
      /\b(Tailwind(?:\s?CSS)?|Bootstrap|Material[- ]UI|MUI|Ant Design|Chakra UI|Styled[- ]Components|SASS|SCSS|LESS|Figma|Sketch|Adobe XD|CSS3|HTML5|Responsive Design|Accessibility|WCAG|a11y)\b/gi,
      // Backend frameworks
      /\b(Node\.?js|Express(?:\.js)?|Fastify|NestJS|Koa|Hapi|Django|Flask|FastAPI|Spring(?:\s?Boot)?|Quarkus|Micronaut|ASP\.?NET|\bRails\b|Laravel|Symfony|CodeIgniter|Gin|Fiber|Echo|Phoenix|Actix|Rocket)\b/gi,
      // Cloud & DevOps
      /\b(AWS|Amazon Web Services|Azure|GCP|Google Cloud|Docker|Kubernetes|K8s|Terraform|Ansible|Puppet|Chef|Jenkins|GitHub Actions|GitLab CI|CircleCI|ArgoCD|Helm|Istio|Prometheus|Grafana|Datadog|New Relic|Splunk|ELK|CloudFormation|Pulumi|Vagrant|Nomad)\b/gi,
      // Databases
      /\b(PostgreSQL|Postgres|MySQL|MariaDB|MongoDB|Redis|Elasticsearch|DynamoDB|Cassandra|CouchDB|Neo4j|InfluxDB|TimescaleDB|Supabase|Firebase|Firestore|SQLite|Oracle|SQL Server|MSSQL|Snowflake|BigQuery|Redshift|Clickhouse)\b/gi,
      // API & Protocols
      /\b(GraphQL|REST(?:\s?API)?|gRPC|WebSocket|SOAP|OpenAPI|Swagger|Postman|tRPC|Protocol Buffers|Protobuf|RabbitMQ|Kafka|NATS|MQTT|ZeroMQ|SQS|SNS|Pub\/Sub)\b/gi,
      // Data & ML
      /\b(Machine Learning|Deep Learning|Data Science|Data Engineering|TensorFlow|PyTorch|Keras|Scikit-learn|Pandas|NumPy|Jupyter|Spark|Hadoop|Airflow|dbt|ETL|NLP|Computer Vision|LLM|GPT|Transformers|Hugging Face|MLflow|Kubeflow|SageMaker|Databricks)\b/gi,
      // Mobile
      /\b(React Native|Flutter|SwiftUI|UIKit|Jetpack Compose|Android SDK|iOS SDK|Xcode|Expo|Ionic|Capacitor|Cordova)\b/gi,
      // Testing
      /\b(Jest|Mocha|Chai|Vitest|Cypress|Playwright|Selenium|Puppeteer|Testing Library|JUnit|pytest|RSpec|Postman|k6|Gatling|TDD|BDD|Unit Testing|E2E|Integration Testing)\b/gi,
      // Methodology & tools
      /\b(Agile|Scrum|Kanban|SAFe|DevOps|SRE|GitOps|Git|GitHub|GitLab|Bitbucket|Jira|Confluence|Notion|Linear|Trello|Asana|CI\/CD|CICD)\b/gi,
      // Security
      /\b(OAuth|JWT|SAML|SSO|OWASP|Penetration Testing|SOC2|HIPAA|PCI[- ]DSS|IAM|RBAC|Vault|KMS|Encryption|SSL|TLS|mTLS|Cybersecurity|InfoSec|SIEM|Zero Trust)\b/gi,
      // Architecture & concepts
      /\b(Microservices|Serverless|Event[- ]Driven|CQRS|Event Sourcing|Domain[- ]Driven Design|DDD|Clean Architecture|Hexagonal|SOA|Monorepo|API Gateway|Load Balancing|CDN|Edge Computing|WebAssembly|WASM)\b/gi,
      // OS
      /\b(Linux|Ubuntu|Debian|CentOS|RHEL|Windows Server|macOS|Unix|FreeBSD)\b/gi,
    ];

    for (const pattern of skillPatterns) {
      const matches = text.match(pattern) || [];
      skills.push(...matches.map(s => s.trim()));
    }

    // Normalize common variants
    const normalized = skills.map(s => {
      const lower = s.toLowerCase();
      if (lower === 'nodejs' || lower === 'node') return 'Node.js';
      if (lower === 'reactjs') return 'React';
      if (lower === 'vuejs') return 'Vue';
      if (lower === 'nextjs') return 'Next.js';
      if (lower === 'nuxtjs') return 'Nuxt.js';
      if (lower === 'expressjs') return 'Express';
      if (lower === 'golang') return 'Go';
      if (lower === 'k8s') return 'Kubernetes';
      if (lower === 'postgres') return 'PostgreSQL';
      if (lower === 'amazon web services') return 'AWS';
      if (lower === 'google cloud' || lower === 'google cloud platform') return 'GCP';
      if (lower === 'microsoft azure') return 'Azure';
      if (lower === 'tailwind css' || lower === 'tailwindcss') return 'Tailwind';
      return s;
    });

    // Deduplicate case-insensitively, keep first occurrence, limit to 15
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const s of normalized) {
      const key = s.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }
    return unique.slice(0, 15);
  }

  /**
   * Extract experience level from title/description
   */
  extractExperienceRange(title: string, description: string): { min: number | null; max: number | null } {
    const text = `${title} ${description}`;

    // Direct year mentions: "3-5 years", "5+ years", "minimum 3 ans"
    const rangeMatch = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:years?|ans?|yr)/i);
    if (rangeMatch) return { min: parseInt(rangeMatch[1]!), max: parseInt(rangeMatch[2]!) };

    const plusMatch = text.match(/(\d{1,2})\+?\s*(?:years?|ans?|yr)\s*(?:of\s+)?(?:experience|expérience)/i);
    if (plusMatch) return { min: parseInt(plusMatch[1]!), max: null };

    const minMatch = text.match(/(?:minimum|min\.?|at least|au moins)\s*(\d{1,2})\s*(?:years?|ans?|yr)/i);
    if (minMatch) return { min: parseInt(minMatch[1]!), max: null };

    // Infer from level keywords in title
    const lower = title.toLowerCase();
    if (/\b(principal|staff|distinguished)\b/.test(lower)) return { min: 10, max: null };
    if (/\b(senior|sr\.?|lead)\b/.test(lower)) return { min: 5, max: null };
    if (/\b(junior|jr\.?|entry|débutant)\b/.test(lower)) return { min: 0, max: 2 };
    if (/\b(intern|stage|stagiaire)\b/.test(lower)) return { min: 0, max: 1 };

    return { min: null, max: null };
  }
}

export const adzunaService = new AdzunaService();
