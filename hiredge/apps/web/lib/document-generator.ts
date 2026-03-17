/**
 * Document Generator — Generates downloadable PDF and Word (.docx) files
 * from structured CV data. Uses dynamic imports for Next.js compatibility.
 */

// ─── Structured CV Data ───────────────────────────────────────────────
export interface CVData {
  targetCountry?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    title: string;
    email?: string;
    phone?: string;
    address?: string;
    linkedin?: string;
    portfolio?: string;
    dateOfBirth?: string;
    nationality?: string;
    maritalStatus?: string;
    drivingLicense?: string;
    visaStatus?: string;
    photo?: string;
  };
  summary?: string;
  experiences: {
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    highlights: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
    details?: string;
  }[];
  skills: string[];
  languages?: { name: string; level: string }[];
  certifications?: string[];
  interests?: string[];
  references?: string | { name: string; title: string; company: string; contact: string }[];
  declaration?: string;
}

// ─── Country Configuration ────────────────────────────────────────────
interface CountryConfig {
  pageFormat: 'a4' | 'letter';
  showPhoto: boolean;
  showPersonalDetails: boolean;
  showReferences: boolean;
  signatureLine: boolean;
  sections: {
    profile: string;
    experience: string;
    education: string;
    skills: string;
    languages: string;
    certifications: string;
    interests: string;
    references: string;
  };
}

const DEFAULT_SECTIONS = {
  profile: 'Profil', experience: 'Expérience Professionnelle', education: 'Formation',
  skills: 'Compétences', languages: 'Langues', certifications: 'Certifications',
  interests: 'Centres d\'intérêt', references: 'Références',
};

const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  FR: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false, sections: DEFAULT_SECTIONS },
  US: { pageFormat: 'letter', showPhoto: false, showPersonalDetails: false, showReferences: true, signatureLine: false, sections: { profile: 'Summary', experience: 'Professional Experience', education: 'Education', skills: 'Skills', languages: 'Languages', certifications: 'Certifications', interests: 'Interests', references: 'References' } },
  CA: { pageFormat: 'letter', showPhoto: false, showPersonalDetails: false, showReferences: true, signatureLine: false, sections: { profile: 'Summary', experience: 'Work Experience', education: 'Education', skills: 'Skills', languages: 'Languages', certifications: 'Certifications', interests: 'Interests', references: 'References' } },
  UK: { pageFormat: 'a4', showPhoto: false, showPersonalDetails: false, showReferences: true, signatureLine: false, sections: { profile: 'Personal Statement', experience: 'Employment History', education: 'Education', skills: 'Key Skills', languages: 'Languages', certifications: 'Certifications', interests: 'Interests', references: 'References' } },
  DE: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: true, sections: { profile: 'Profil', experience: 'Berufserfahrung', education: 'Ausbildung', skills: 'Kenntnisse', languages: 'Sprachen', certifications: 'Zertifikate', interests: 'Interessen', references: 'Referenzen' } },
  CH: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: true, signatureLine: false, sections: DEFAULT_SECTIONS },
  BE: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false, sections: DEFAULT_SECTIONS },
  JP: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: true, sections: { profile: '概要', experience: '職歴', education: '学歴', skills: 'スキル', languages: '語学', certifications: '資格', interests: '趣味', references: '参照' } },
  AU: { pageFormat: 'a4', showPhoto: false, showPersonalDetails: false, showReferences: true, signatureLine: false, sections: { profile: 'Career Objective', experience: 'Employment History', education: 'Education', skills: 'Skills', languages: 'Languages', certifications: 'Certifications', interests: 'Interests', references: 'References' } },
  NL: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false, sections: { profile: 'Profiel', experience: 'Werkervaring', education: 'Opleiding', skills: 'Vaardigheden', languages: 'Talen', certifications: 'Certificaten', interests: 'Interesses', references: 'Referenties' } },
  ES: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false, sections: { profile: 'Perfil', experience: 'Experiencia Profesional', education: 'Formación', skills: 'Habilidades', languages: 'Idiomas', certifications: 'Certificaciones', interests: 'Intereses', references: 'Referencias' } },
  IT: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: true, sections: { profile: 'Profilo', experience: 'Esperienza Lavorativa', education: 'Formazione', skills: 'Competenze', languages: 'Lingue', certifications: 'Certificazioni', interests: 'Interessi', references: 'Referenze' } },
  BR: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false, sections: { profile: 'Resumo', experience: 'Experiência Profissional', education: 'Formação', skills: 'Habilidades', languages: 'Idiomas', certifications: 'Certificações', interests: 'Interesses', references: 'Referências' } },
  IN: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: true, signatureLine: true, sections: { profile: 'Career Objective', experience: 'Professional Experience', education: 'Education', skills: 'Technical Skills', languages: 'Languages', certifications: 'Certifications', interests: 'Hobbies', references: 'References' } },
  AE: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: true, signatureLine: false, sections: { profile: 'Objective', experience: 'Work Experience', education: 'Education', skills: 'Skills', languages: 'Languages', certifications: 'Certifications', interests: 'Interests', references: 'References' } },
  MA: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false, sections: DEFAULT_SECTIONS },
  SN: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: true, signatureLine: false, sections: DEFAULT_SECTIONS },
  QC: { pageFormat: 'letter', showPhoto: false, showPersonalDetails: false, showReferences: true, signatureLine: false, sections: DEFAULT_SECTIONS },
  CN: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false, sections: { profile: '个人简介', experience: '工作经历', education: '教育背景', skills: '技能', languages: '语言', certifications: '证书', interests: '兴趣爱好', references: '推荐人' } },
  KR: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: true, sections: { profile: '자기소개', experience: '경력사항', education: '학력', skills: '기술', languages: '언어', certifications: '자격증', interests: '취미', references: '추천인' } },
  RU: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false, sections: { profile: 'О себе', experience: 'Опыт работы', education: 'Образование', skills: 'Навыки', languages: 'Языки', certifications: 'Сертификаты', interests: 'Интересы', references: 'Рекомендации' } },
  SE: { pageFormat: 'a4', showPhoto: false, showPersonalDetails: false, showReferences: true, signatureLine: false, sections: { profile: 'Profil', experience: 'Arbetslivserfarenhet', education: 'Utbildning', skills: 'Kompetenser', languages: 'Språk', certifications: 'Certifieringar', interests: 'Intressen', references: 'Referenser' } },
  PL: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false, sections: { profile: 'Profil zawodowy', experience: 'Doświadczenie zawodowe', education: 'Wykształcenie', skills: 'Umiejętności', languages: 'Języki', certifications: 'Certyfikaty', interests: 'Zainteresowania', references: 'Referencje' } },
};

function getCountryConfig(code?: string): CountryConfig {
  return COUNTRY_CONFIGS[(code ?? 'FR').toUpperCase()] ?? COUNTRY_CONFIGS.FR;
}

// ─── PDF Generation ───────────────────────────────────────────────────
export async function generatePDF(cv: CVData): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const cc = getCountryConfig(cv.targetCountry);
  const doc = new jsPDF({ format: cc.pageFormat });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 20) { doc.addPage(); y = 20; }
  };

  const sectionTitle = (title: string) => {
    checkPageBreak(14);
    y += 6;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 52, 54);
    doc.text(title.toUpperCase(), margin, y);
    y += 1.5;
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // ── Header ──
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const fullName = `${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`;
  doc.text(fullName, margin, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(cv.personalInfo.title, margin, y);
  y += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── Contact ──
  const contactParts: string[] = [];
  if (cv.personalInfo.email) contactParts.push(cv.personalInfo.email);
  if (cv.personalInfo.phone) contactParts.push(cv.personalInfo.phone);
  if (cv.personalInfo.address) contactParts.push(cv.personalInfo.address);
  if (cv.personalInfo.linkedin) contactParts.push(cv.personalInfo.linkedin);
  if (cv.personalInfo.portfolio) contactParts.push(cv.personalInfo.portfolio);
  if (contactParts.length) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(contactParts.join('  |  '), margin, y);
    y += 6;
  }

  // ── Personal Details (country-specific) ──
  if (cc.showPersonalDetails) {
    const details: string[] = [];
    if (cv.personalInfo.dateOfBirth) details.push(cv.personalInfo.dateOfBirth);
    if (cv.personalInfo.nationality) details.push(cv.personalInfo.nationality);
    if (cv.personalInfo.maritalStatus) details.push(cv.personalInfo.maritalStatus);
    if (cv.personalInfo.drivingLicense) details.push(`Permis ${cv.personalInfo.drivingLicense}`);
    if (cv.personalInfo.visaStatus) details.push(cv.personalInfo.visaStatus);
    if (details.length) {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'italic');
      doc.text(details.join('  |  '), margin, y);
      doc.setFont('helvetica', 'normal');
      y += 6;
    }
  }

  // ── Summary ──
  if (cv.summary) {
    sectionTitle(cc.sections.profile);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(45, 52, 54);
    const sumLines = doc.splitTextToSize(cv.summary, contentWidth);
    checkPageBreak(sumLines.length * 4.5);
    doc.text(sumLines, margin, y);
    y += sumLines.length * 4.5 + 4;
  }

  // ── Experiences ──
  if (cv.experiences?.length) {
    sectionTitle(cc.sections.experience);
    for (const exp of cv.experiences) {
      checkPageBreak(20);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 52, 54);
      doc.text(exp.title, margin, y);

      const dateText = `${exp.startDate} — ${exp.endDate ?? 'Présent'}`;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(dateText, pageWidth - margin - doc.getTextWidth(dateText), y);
      y += 5;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 80, 80);
      doc.text(`${exp.company}${exp.location ? ` | ${exp.location}` : ''}`, margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(45, 52, 54);
      doc.setFontSize(10);
      for (const hl of exp.highlights) {
        checkPageBreak(6);
        const hlLines = doc.splitTextToSize(`•  ${hl}`, contentWidth - 4);
        doc.text(hlLines, margin + 2, y);
        y += hlLines.length * 4.5;
      }
      y += 2;
    }
  }

  // ── Education ──
  if (cv.education?.length) {
    sectionTitle(cc.sections.education);
    for (const edu of cv.education) {
      checkPageBreak(14);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 52, 54);
      doc.text(edu.degree, margin, y);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(edu.year, pageWidth - margin - doc.getTextWidth(edu.year), y);
      y += 5;

      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 80, 80);
      doc.text(edu.institution, margin, y);
      y += 5;

      if (edu.details) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const detLines = doc.splitTextToSize(edu.details, contentWidth);
        checkPageBreak(detLines.length * 4);
        doc.text(detLines, margin, y);
        y += detLines.length * 4 + 2;
      }
      y += 2;
    }
  }

  // ── Skills ──
  if (cv.skills?.length) {
    sectionTitle(cc.sections.skills);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(45, 52, 54);
    const skillsText = cv.skills.join('  •  ');
    const skillLines = doc.splitTextToSize(skillsText, contentWidth);
    checkPageBreak(skillLines.length * 4.5);
    doc.text(skillLines, margin, y);
    y += skillLines.length * 4.5 + 4;
  }

  // ── Languages ──
  if (cv.languages?.length) {
    sectionTitle(cc.sections.languages);
    doc.setFontSize(10);
    for (const lang of cv.languages) {
      checkPageBreak(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 52, 54);
      doc.text(`${lang.name}`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(` — ${lang.level}`, margin + doc.getTextWidth(`${lang.name}`), y);
      y += 5;
    }
    y += 2;
  }

  // ── Certifications ──
  if (cv.certifications?.length) {
    sectionTitle(cc.sections.certifications);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    for (const cert of cv.certifications) {
      checkPageBreak(6);
      doc.text(`•  ${cert}`, margin, y);
      y += 5;
    }
  }

  // ── Interests ──
  if (cv.interests?.length) {
    sectionTitle(cc.sections.interests);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const interestsText = cv.interests.join('  •  ');
    const intLines = doc.splitTextToSize(interestsText, contentWidth);
    checkPageBreak(intLines.length * 4.5);
    doc.text(intLines, margin, y);
    y += intLines.length * 4.5 + 4;
  }

  // ── References ──
  if (cc.showReferences && cv.references) {
    sectionTitle(cc.sections.references);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (typeof cv.references === 'string') {
      doc.text(cv.references, margin, y);
      y += 6;
    } else {
      for (const ref of cv.references) {
        checkPageBreak(14);
        doc.setFont('helvetica', 'bold');
        doc.text(ref.name, margin, y);
        doc.setFont('helvetica', 'normal');
        y += 4.5;
        doc.text(`${ref.title} — ${ref.company}`, margin, y);
        y += 4.5;
        doc.setTextColor(120, 120, 120);
        doc.text(ref.contact, margin, y);
        doc.setTextColor(45, 52, 54);
        y += 6;
      }
    }
  }

  // ── Declaration (India format) ──
  if (cv.declaration) {
    checkPageBreak(16);
    sectionTitle('Declaration');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const declLines = doc.splitTextToSize(cv.declaration, contentWidth);
    doc.text(declLines, margin, y);
    y += declLines.length * 4.5 + 4;
  }

  // ── Signature line (DE, IT, JP, IN) ──
  if (cc.signatureLine) {
    checkPageBreak(20);
    y += 10;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const today = new Date().toLocaleDateString('fr-FR');
    doc.text(today, margin, y);
    doc.line(margin + 60, y, margin + 130, y);
    y += 4;
    doc.text('Signature', margin + 80, y);
  }

  return doc.output('blob');
}

// ─── Word (.docx) Generation ──────────────────────────────────────────
export async function generateWord(cv: CVData): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, BorderStyle, TabStopPosition, TabStopType } = await import('docx');
  const cc = getCountryConfig(cv.targetCountry);
  const children: InstanceType<typeof Paragraph>[] = [];

  // ── Header ──
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`,
          bold: true, size: 44, color: '000000', font: 'Calibri',
        }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: cv.personalInfo.title,
          size: 26, color: '555555', font: 'Calibri',
        }),
      ],
      spacing: { after: 60 },
      border: { bottom: { color: '000000', style: BorderStyle.SINGLE, size: 4, space: 6 } },
    }),
  );

  // Contact
  const contactParts: string[] = [];
  if (cv.personalInfo.email) contactParts.push(cv.personalInfo.email);
  if (cv.personalInfo.phone) contactParts.push(cv.personalInfo.phone);
  if (cv.personalInfo.address) contactParts.push(cv.personalInfo.address);
  if (cv.personalInfo.linkedin) contactParts.push(cv.personalInfo.linkedin);
  if (contactParts.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contactParts.join('  |  '), size: 18, color: '555555', font: 'Calibri' })],
        spacing: { after: 200 },
      }),
    );
  }

  // Personal details (country-specific)
  if (cc.showPersonalDetails) {
    const details: string[] = [];
    if (cv.personalInfo.dateOfBirth) details.push(cv.personalInfo.dateOfBirth);
    if (cv.personalInfo.nationality) details.push(cv.personalInfo.nationality);
    if (cv.personalInfo.maritalStatus) details.push(cv.personalInfo.maritalStatus);
    if (cv.personalInfo.drivingLicense) details.push(`Permis ${cv.personalInfo.drivingLicense}`);
    if (cv.personalInfo.visaStatus) details.push(cv.personalInfo.visaStatus);
    if (details.length) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: details.join('  |  '), size: 18, color: '555555', font: 'Calibri', italics: true })],
          spacing: { after: 200 },
        }),
      );
    }
  }

  // ── Helper: Section heading ──
  const addSection = (title: string) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 24, color: '000000', font: 'Calibri' })],
        spacing: { before: 300, after: 80 },
        border: { bottom: { color: '3C3C3C', style: BorderStyle.SINGLE, size: 4, space: 4 } },
      }),
    );
  };

  // ── Summary ──
  if (cv.summary) {
    addSection(cc.sections.profile);
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cv.summary, size: 20, font: 'Calibri' })],
        spacing: { after: 120 },
      }),
    );
  }

  // ── Experiences ──
  if (cv.experiences?.length) {
    addSection(cc.sections.experience);
    for (const exp of cv.experiences) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.title, bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: `\t${exp.startDate} — ${exp.endDate ?? 'Présent'}`, size: 20, color: '555555', font: 'Calibri' }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `${exp.company}${exp.location ? ` | ${exp.location}` : ''}`, size: 20, color: '3C3C3C', font: 'Calibri', italics: true }),
          ],
          spacing: { after: 60 },
        }),
      );
      for (const hl of exp.highlights) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: hl, size: 20, font: 'Calibri' })],
            bullet: { level: 0 },
            spacing: { after: 30 },
          }),
        );
      }
    }
  }

  // ── Education ──
  if (cv.education?.length) {
    addSection(cc.sections.education);
    for (const edu of cv.education) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.degree, bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: `\t${edu.year}`, size: 20, color: '555555', font: 'Calibri' }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: edu.institution, size: 20, color: '3C3C3C', font: 'Calibri', italics: true })],
          spacing: { after: 40 },
        }),
      );
      if (edu.details) {
        children.push(new Paragraph({ children: [new TextRun({ text: edu.details, size: 19, font: 'Calibri' })], spacing: { after: 60 } }));
      }
    }
  }

  // ── Skills ──
  if (cv.skills?.length) {
    addSection(cc.sections.skills);
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cv.skills.join('  •  '), size: 20, font: 'Calibri' })],
        spacing: { after: 120 },
      }),
    );
  }

  // ── Languages ──
  if (cv.languages?.length) {
    addSection(cc.sections.languages);
    for (const lang of cv.languages) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${lang.name}`, bold: true, size: 20, font: 'Calibri' }),
            new TextRun({ text: ` — ${lang.level}`, size: 20, font: 'Calibri' }),
          ],
          spacing: { after: 40 },
        }),
      );
    }
  }

  // ── Certifications ──
  if (cv.certifications?.length) {
    addSection(cc.sections.certifications);
    for (const cert of cv.certifications) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: cert, size: 20, font: 'Calibri' })],
          bullet: { level: 0 },
          spacing: { after: 30 },
        }),
      );
    }
  }

  // ── Interests ──
  if (cv.interests?.length) {
    addSection(cc.sections.interests);
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cv.interests.join('  •  '), size: 20, font: 'Calibri' })],
        spacing: { after: 120 },
      }),
    );
  }

  // ── References ──
  if (cc.showReferences && cv.references) {
    addSection(cc.sections.references);
    if (typeof cv.references === 'string') {
      children.push(new Paragraph({ children: [new TextRun({ text: cv.references, size: 20, font: 'Calibri', italics: true })], spacing: { after: 120 } }));
    } else {
      for (const ref of cv.references) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: ref.name, bold: true, size: 20, font: 'Calibri' })], spacing: { before: 80 } }),
          new Paragraph({ children: [new TextRun({ text: `${ref.title} — ${ref.company}`, size: 20, color: '555555', font: 'Calibri' })] }),
          new Paragraph({ children: [new TextRun({ text: ref.contact, size: 18, color: '555555', font: 'Calibri' })], spacing: { after: 60 } }),
        );
      }
    }
  }

  // ── Declaration (India format) ──
  if (cv.declaration) {
    addSection('Declaration');
    children.push(new Paragraph({ children: [new TextRun({ text: cv.declaration, size: 20, font: 'Calibri' })], spacing: { after: 120 } }));
  }

  const docFile = new Document({
    sections: [{ children }],
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20 } },
      },
    },
  });

  return Packer.toBlob(docFile);
}
