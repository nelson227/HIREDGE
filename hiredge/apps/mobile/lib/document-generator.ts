/**
 * Document Generator — Generates downloadable PDF and Word (.docx) files
 * Uses jsPDF for PDF and docx for Word generation, all client-side.
 */
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, TabStopPosition, TabStopType } from 'docx';

// ─── Structured CV Data ───────────────────────────────────────────────
export interface CVData {
  personalInfo: {
    firstName: string;
    lastName: string;
    title: string;
    email?: string;
    phone?: string;
    address?: string;
    linkedin?: string;
    portfolio?: string;
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
}

// ─── PDF Generation ───────────────────────────────────────────────────
export function generatePDF(cv: CVData): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
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
  if (contactParts.length) {
    doc.setFontSize(9);
    doc.text(contactParts.join('  |  '), margin, 34);
  }

  y = 48;
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
    sectionTitle('Profil');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(cv.summary, contentWidth);
    checkPageBreak(lines.length * 4.5);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 4;
  }

  // ── Experiences ──
  if (cv.experiences.length) {
    sectionTitle('Expérience Professionnelle');
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
    sectionTitle('Formation');
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
    sectionTitle('Compétences');
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
    sectionTitle('Langues');
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
    sectionTitle('Certifications');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    for (const cert of cv.certifications) {
      checkPageBreak(6);
      doc.text(`•  ${cert}`, margin, y);
      y += 5;
    }
  }

  return doc.output('blob');
}

// ─── Word (.docx) Generation ──────────────────────────────────────────
export async function generateWord(cv: CVData): Promise<Blob> {
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
    addSection('Profil');
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cv.summary, size: 20, font: 'Calibri' })],
        spacing: { after: 120 },
      }),
    );
  }

  // ── Experiences ──
  if (cv.experiences.length) {
    addSection('Expérience Professionnelle');
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
    addSection('Formation');
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
    addSection('Compétences');
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cv.skills.join('  •  '), size: 20, font: 'Calibri' })],
        spacing: { after: 120 },
      }),
    );
  }

  // ── Languages ──
  if (cv.languages?.length) {
    addSection('Langues');
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
    addSection('Certifications');
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
