import type { LegalReportDocument, LegalReportSection } from "./legalReportTypes";

type PdfPage = {
  commands: string[];
  pageNumber: number;
};

const pageWidth = 595;
const pageHeight = 842;
const marginX = 48;
const marginTop = 56;
const marginBottom = 54;
const lineHeight = 14;
const bodyFontSize = 10;
const maxTextWidth = 92;

function normalizeText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function escapePdfText(value: string) {
  return normalizeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars = maxTextWidth) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    if (!line) {
      line = word;
      return;
    }

    if (`${line} ${word}`.length > maxChars) {
      lines.push(line);
      line = word;
      return;
    }

    line = `${line} ${word}`;
  });

  if (line) {
    lines.push(line);
  }

  return lines.length ? lines : [""];
}

function tableCell(value: string, maxLength: number) {
  const normalized = normalizeText(value);
  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(0, maxLength - 3))}...` : normalized;
}

class PdfBuilder {
  private pages: PdfPage[] = [];
  private y = pageHeight - marginTop;

  constructor(private readonly title: string) {
    this.addPage();
  }

  private currentPage() {
    return this.pages[this.pages.length - 1];
  }

  private addPage() {
    const page: PdfPage = { commands: [], pageNumber: this.pages.length + 1 };
    this.pages.push(page);
    this.y = pageHeight - marginTop;
    this.text(this.title, marginX, this.y, 9, "F2");
    this.text(`Page ${page.pageNumber}`, pageWidth - marginX - 42, marginBottom - 18, 9, "F2");
    this.y -= 34;
  }

  private ensureSpace(height: number) {
    if (this.y - height < marginBottom) {
      this.addPage();
    }
  }

  private text(value: string, x: number, y: number, size = bodyFontSize, font = "F1") {
    this.currentPage().commands.push(`BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`);
  }

  private rule() {
    this.currentPage().commands.push(`${marginX} ${this.y} m ${pageWidth - marginX} ${this.y} l S`);
    this.y -= 16;
  }

  titleBlock(generatedAt: string) {
    this.text(this.title, marginX, this.y, 20, "F2");
    this.y -= 24;
    this.text(`Generated ${generatedAt}`, marginX, this.y, 10, "F1");
    this.y -= 20;
    this.rule();
  }

  section(section: LegalReportSection) {
    this.ensureSpace(52);
    this.text(section.title, marginX, this.y, 14, "F2");
    this.y -= 18;

    section.paragraphs?.forEach((paragraph) => {
      wrapText(paragraph).forEach((line) => {
        this.ensureSpace(lineHeight);
        this.text(line, marginX, this.y);
        this.y -= lineHeight;
      });
      this.y -= 6;
    });

    section.rows?.forEach(([label, value]) => {
      this.ensureSpace(lineHeight + 2);
      this.text(`${label}:`, marginX, this.y, bodyFontSize, "F2");
      this.text(value, marginX + 132, this.y, bodyFontSize, "F1");
      this.y -= lineHeight + 2;
    });

    if (section.table) {
      this.renderTable(section.table.headers, section.table.rows);
    }

    this.y -= 14;
  }

  private renderTable(headers: string[], rows: string[][]) {
    const columnWidths = headers.length === 5 ? [66, 86, 80, 150, 110] : [96, 128, 128, 128];
    const columnMaxChars = headers.length === 5 ? [11, 16, 13, 25, 18] : [16, 22, 22, 22];

    this.ensureSpace(36);
    let x = marginX;
    headers.forEach((header, index) => {
      this.text(tableCell(header, columnMaxChars[index] ?? 18), x, this.y, 9, "F2");
      x += columnWidths[index] ?? 100;
    });
    this.y -= 12;
    this.rule();

    if (rows.length === 0) {
      this.ensureSpace(lineHeight);
      this.text("No rows available.", marginX, this.y);
      this.y -= lineHeight;
      return;
    }

    rows.forEach((row) => {
      this.ensureSpace(18);
      let cellX = marginX;
      row.forEach((cell, index) => {
        this.text(tableCell(cell, columnMaxChars[index] ?? 18), cellX, this.y, 9, "F1");
        cellX += columnWidths[index] ?? 100;
      });
      this.y -= 16;
    });
  }

  build() {
    const objects: string[] = [];
    const addObject = (body: string) => {
      objects.push(body);
      return objects.length;
    };

    const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const pageRefs: number[] = [];
    const contentRefs: number[] = [];

    this.pages.forEach((page) => {
      const stream = page.commands.join("\n");
      const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      contentRefs.push(contentId);
      pageRefs.push(0);
    });

    const pagesId = objects.length + this.pages.length + 1;
    this.pages.forEach((_, index) => {
      pageRefs[index] = addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentRefs[index]} 0 R >>`
      );
    });

    addObject(`<< /Type /Pages /Kids [${pageRefs.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`);
    const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new Blob([pdf], { type: "application/pdf" });
  }
}

export function renderLegalReportPdf(report: LegalReportDocument) {
  const builder = new PdfBuilder(report.title);
  builder.titleBlock(report.generatedAt);
  report.sections.forEach((section) => builder.section(section));
  return builder.build();
}

export function downloadLegalReportPdf(report: LegalReportDocument) {
  const blob = renderLegalReportPdf(report);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `legal-evidence-report-case-${report.caseRecord.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
