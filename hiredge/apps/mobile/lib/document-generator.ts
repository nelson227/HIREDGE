/**
 * Document Generator — Generates downloadable PDF and Word (.docx) files
 * Uses jsPDF for PDF and docx for Word generation, all client-side.
 */
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, TabStopPosition, TabStopType } from 'docx';

// ─── Structured CV Data ───────────────────────────────────────────────
export interface CVData {
  targetCountry?: string; // ISO: 'FR','US','CA','UK','DE','CH','BE','JP','AU','NL','ES','IT','BR','IN','AE','MA','SN','QC'
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
    photo?: boolean;
  };
  summary: string;
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
  references?: { name: string; title: string; company: string; contact: string }[] | string;
  declaration?: string;
}

// ─── Country-specific CV Format Configurations ────────────────────────
interface CountryConfig {
  pageFormat: 'a4' | 'letter';
  showPhoto: boolean;
  showPersonalDetails: boolean;
  showReferences: boolean;
  signatureLine: boolean;
  sections: { profile: string; experience: string; education: string; skills: string; languages: string; certifications: string; interests: string; references: string };
}

const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  FR: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false,
    sections: { profile: 'Profil', experience: "Exp\u00e9rience Professionnelle", education: 'Formation', skills: "Comp\u00e9tences", languages: 'Langues', certifications: 'Certifications', interests: "Centres d'Int\u00e9r\u00eat", references: "R\u00e9f\u00e9rences" } },
  US: { pageFormat: 'letter', showPhoto: false, showPersonalDetails: false, showReferences: false, signatureLine: false,
    sections: { profile: 'Summary', experience: 'Professional Experience', education: 'Education', skills: 'Skills', languages: 'Languages', certifications: 'Certifications', interests: 'Interests', references: 'References' } },
  CA: { pageFormat: 'letter', showPhoto: false, showPersonalDetails: false, showReferences: true, signatureLine: false,
    sections: { profile: 'Summary', experience: 'Professional Experience', education: 'Education', skills: 'Skills', languages: 'Languages', certifications: 'Certifications', interests: 'Interests', references: 'References' } },
  UK: { pageFormat: 'a4', showPhoto: false, showPersonalDetails: false, showReferences: true, signatureLine: false,
    sections: { profile: 'Personal Profile', experience: 'Work Experience', education: 'Education', skills: 'Key Skills', languages: 'Languages', certifications: 'Certifications', interests: 'Interests', references: 'References' } },
  DE: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: true,
    sections: { profile: 'Profil', experience: 'Berufserfahrung', education: 'Ausbildung', skills: 'Kenntnisse', languages: 'Sprachen', certifications: 'Zertifizierungen', interests: 'Interessen', references: 'Referenzen' } },
  CH: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: true, signatureLine: false,
    sections: { profile: 'Profil', experience: "Exp\u00e9rience Professionnelle", education: 'Formation', skills: "Comp\u00e9tences", languages: 'Langues', certifications: 'Certifications', interests: "Centres d'Int\u00e9r\u00eat", references: "R\u00e9f\u00e9rences" } },
  BE: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false,
    sections: { profile: 'Profil', experience: "Exp\u00e9rience Professionnelle", education: 'Formation', skills: "Comp\u00e9tences", languages: 'Langues', certifications: 'Certifications', interests: "Centres d'Int\u00e9r\u00eat", references: "R\u00e9f\u00e9rences" } },
  JP: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: true,
    sections: { profile: '\u8077\u52d9\u6982\u8981', experience: '\u8077\u52d9\u7d4c\u6b74', education: '\u5b66\u6b74', skills: '\u30b9\u30ad\u30eb', languages: '\u8a9e\u5b66\u529b', certifications: '\u8cc7\u683c', interests: '\u8da3\u5473', references: '\u7d39\u4ecb\u8005' } },
  AU: { pageFormat: 'a4', showPhoto: false, showPersonalDetails: false, showReferences: true, signatureLine: false,
    sections: { profile: 'Career Objective', experience: 'Employment History', education: 'Education', skills: 'Skills', languages: 'Languages', certifications: 'Certifications', interests: 'Interests', references: 'Referees' } },
  NL: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false,
    sections: { profile: 'Profiel', experience: 'Werkervaring', education: 'Opleiding', skills: 'Vaardigheden', languages: 'Talen', certifications: 'Certificeringen', interests: 'Interesses', references: 'Referenties' } },
  ES: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false,
    sections: { profile: 'Perfil Profesional', experience: 'Experiencia Profesional', education: "Formaci\u00f3n Acad\u00e9mica", skills: 'Competencias', languages: 'Idiomas', certifications: 'Certificaciones', interests: 'Intereses', references: 'Referencias' } },
  IT: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: true,
    sections: { profile: 'Profilo', experience: 'Esperienza Professionale', education: 'Istruzione', skills: 'Competenze', languages: 'Lingue', certifications: 'Certificazioni', interests: 'Interessi', references: 'Referenze' } },
  BR: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false,
    sections: { profile: 'Objetivo', experience: "Experi\u00eancia Profissional", education: "Forma\u00e7\u00e3o Acad\u00eamica", skills: "Compet\u00eancias", languages: 'Idiomas', certifications: "Certifica\u00e7\u00f5es", interests: 'Interesses', references: "Refer\u00eancias" } },
  IN: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: true, signatureLine: true,
    sections: { profile: 'Career Objective', experience: 'Professional Experience', education: 'Education', skills: 'Technical Skills', languages: 'Languages', certifications: 'Certifications', interests: 'Hobbies & Interests', references: 'References' } },
  AE: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: true, signatureLine: false,
    sections: { profile: 'Professional Summary', experience: 'Work Experience', education: 'Education', skills: 'Key Skills', languages: 'Languages', certifications: 'Certifications', interests: 'Interests', references: 'References' } },
  MA: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: false, signatureLine: false,
    sections: { profile: 'Profil', experience: "Exp\u00e9rience Professionnelle", education: 'Formation', skills: "Comp\u00e9tences", languages: 'Langues', certifications: 'Certifications', interests: "Centres d'Int\u00e9r\u00eat", references: "R\u00e9f\u00e9rences" } },
  SN: { pageFormat: 'a4', showPhoto: true, showPersonalDetails: true, showReferences: true, signatureLine: false,
    sections: { profile: 'Profil', experience: "Exp\u00e9rience Professionnelle", education: 'Formation', skills: "Comp\u00e9tences", languages: 'Langues', certifications: 'Certifications', interests: "Centres d'Int\u00e9r\u00eat", references: "R\u00e9f\u00e9rences" } },
  QC: { pageFormat: 'letter', showPhoto: false, showPersonalDetails: false, showReferences: true, signatureLine: false,
    sections: { profile: 'Profil', experience: "Exp\u00e9rience Professionnelle", education: 'Formation', skills: "Comp\u00e9tences", languages: 'Langues', certifications: 'Certifications', interests: "Centres d'Int\u00e9r\u00eat", references: "R\u00e9f\u00e9rences" } },
};

function getCountryConfig(country?: string): CountryConfig {
  if (!country) return COUNTRY_CONFIGS.FR;
  return COUNTRY_CONFIGS[country.toUpperCase()] ?? COUNTRY_CONFIGS.FR;
}

// ─── PDF Generation ───────────────────────────────────────────────────
export function generatePDF(cv: CVData): Blob {
  const cc = getCountryConfig(cv.targetCountry);
  const doc = new jsPDF({ unit: 'mm', format: cc.pageFormat });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPageBreak = (needed: number) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Header ──
  doc.setFillColor(108, 92, 231); // #6C5CE7
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Photo placeholder (for countries that expect it)
  if (cc.showPhoto && cv.personalInfo.photo) {
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(pageWidth - margin - 25, 5, 25, 30, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text('PHOTO', pageWidth - margin - 19, 22);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`, margin, 18);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(cv.personalInfo.title, margin, 26);

  // Contact line
  const contactParts: string[] = [];
  if (cv.personalInfo.email) contactParts.push(cv.personalInfo.email);
  if (cv.personalInfo.phone) contactParts.push(cv.personalInfo.phone);
  if (cv.personalInfo.address) contactParts.push(cv.personalInfo.address);
  if (cv.personalInfo.linkedin) contactParts.push(cv.personalInfo.linkedin);
  if (contactParts.length) {
    doc.setFontSize(9);
    doc.text(contactParts.join('  |  '), margin, 34);
  }

  y = 48;

  // Personal details (for countries that include them)
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
      doc.text(details.join('  |  '), margin, y);
      y += 8;
    }
  }

  doc.setTextColor(45, 52, 54); // #2D3436

  // ── Helper: Section Title ──
  const sectionTitle = (title: string) => {
    checkPageBreak(14);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(108, 92, 231);
    doc.text(title.toUpperCase(), margin, y);
    y += 1;
    doc.setDrawColor(108, 92, 231);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    doc.setTextColor(45, 52, 54);
  };

  // ── Summary ──
  if (cv.summary) {
    sectionTitle(cc.sections.profile);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(cv.summary, contentWidth);
    checkPageBreak(lines.length * 4.5);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 4;
  }

  // ── Experiences ──
  if (cv.experiences.length) {
    sectionTitle(cc.sections.experience);
    for (const exp of cv.experiences) {
      checkPageBreak(20);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(exp.title, margin, y);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      const dateStr = `${exp.startDate} — ${exp.endDate ?? 'Présent'}`;
      doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), y);

      y += 5;
      doc.setTextColor(108, 92, 231);
      doc.text(`${exp.company}${exp.location ? ` | ${exp.location}` : ''}`, margin, y);
      y += 5;
      doc.setTextColor(45, 52, 54);

      for (const hl of exp.highlights) {
        checkPageBreak(6);
        doc.setFontSize(9.5);
        const hlLines = doc.splitTextToSize(`•  ${hl}`, contentWidth - 4);
        doc.text(hlLines, margin + 3, y);
        y += hlLines.length * 4.2;
      }
      y += 4;
    }
  }

  // ── Education ──
  if (cv.education.length) {
    sectionTitle(cc.sections.education);
    for (const edu of cv.education) {
      checkPageBreak(12);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(edu.degree, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(edu.year, pageWidth - margin - doc.getTextWidth(edu.year), y);
      y += 5;
      doc.setTextColor(108, 92, 231);
      doc.text(edu.institution, margin, y);
      doc.setTextColor(45, 52, 54);
      y += 4;
      if (edu.details) {
        doc.setFontSize(9.5);
        doc.text(edu.details, margin + 3, y);
        y += 4;
      }
      y += 3;
    }
  }

  // ── Skills ──
  if (cv.skills.length) {
    sectionTitle(cc.sections.skills);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
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
      doc.text(`${lang.name}`, margin, y);
      doc.setFont('helvetica', 'normal');
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
  const cc = getCountryConfig(cv.targetCountry);
  const children: Paragraph[] = [];

  // ── Header ──
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`,
          bold: true,
          size: 44, // 22pt
          color: '6C5CE7',
          font: 'Calibri',
        }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: cv.personalInfo.title,
          size: 26,
          color: '636E72',
          font: 'Calibri',
        }),
      ],
      spacing: { after: 60 },
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
        children: [new TextRun({ text: contactParts.join('  |  '), size: 18, color: '636E72', font: 'Calibri' })],
        spacing: { after: 200 },
      }),
    );
  }

  // Personal details (for applicable countries)
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
          children: [new TextRun({ text: details.join('  |  '), size: 18, color: '636E72', font: 'Calibri', italics: true })],
          spacing: { after: 200 },
        }),
      );
    }
  }

  // ── Helper: Section heading ──
  const addSection = (title: string) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 24, color: '6C5CE7', font: 'Calibri' })],
        spacing: { before: 300, after: 80 },
        border: { bottom: { color: '6C5CE7', style: BorderStyle.SINGLE, size: 6, space: 4 } },
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
  if (cv.experiences.length) {
    addSection(cc.sections.experience);
    for (const exp of cv.experiences) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.title, bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: `\t${exp.startDate} — ${exp.endDate ?? 'Présent'}`, size: 20, color: '636E72', font: 'Calibri' }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `${exp.company}${exp.location ? ` | ${exp.location}` : ''}`, size: 20, color: '6C5CE7', font: 'Calibri', italics: true }),
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
  if (cv.education.length) {
    addSection(cc.sections.education);
    for (const edu of cv.education) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.degree, bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: `\t${edu.year}`, size: 20, color: '636E72', font: 'Calibri' }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: edu.institution, size: 20, color: '6C5CE7', font: 'Calibri', italics: true })],
          spacing: { after: 40 },
        }),
      );
      if (edu.details) {
        children.push(new Paragraph({ children: [new TextRun({ text: edu.details, size: 19, font: 'Calibri' })], spacing: { after: 60 } }));
      }
    }
  }

  // ── Skills ──
  if (cv.skills.length) {
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
          new Paragraph({ children: [new TextRun({ text: `${ref.title} — ${ref.company}`, size: 20, color: '636E72', font: 'Calibri' })] }),
          new Paragraph({ children: [new TextRun({ text: ref.contact, size: 18, color: '636E72', font: 'Calibri' })], spacing: { after: 60 } }),
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

// ─── Download Helper ──────────────────────────────────────────────────
export function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
