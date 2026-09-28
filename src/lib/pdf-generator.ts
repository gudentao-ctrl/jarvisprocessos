import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Generates a PDF document for the assessment report.
 * Returns a Blob that can be downloaded directly in the browser.
 *
 * The implementation is intentionally simple – it creates a one‑page PDF
 * with the candidate's name, age, current/desired roles and, if present,
 * the radar data rendered as a textual table.  In a real product you would
 * replace the table with an image of the radar chart (e.g., by rendering
 * the chart to a canvas, converting to PNG and embedding it).
 */
export async function generateAssessmentReport(candidate: any): Promise<Blob> {
  const {
    full_name,
    current_role,
    desired_role,
    birth_date,
    profile_data,
    ai_summary,
  } = candidate;

  // Calculate age
  const age = Math.floor(
    (Date.now() - new Date(birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size (points)
  const { width, height } = page.getSize();
  const fontSize = 12;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const drawText = (text: string, y: number) => {
    page.drawText(text, {
      x: 50,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  };

  let cursorY = height - 50;
  drawText(`Assessment Report – ${full_name}`, cursorY);
  cursorY -= 30;
  drawText(`Idade: ${age} anos`, cursorY);
  cursorY -= 20;
  drawText(`Cargo atual: ${current_role}`, cursorY);
  cursorY -= 20;
  drawText(`Cargo desejado: ${desired_role}`, cursorY);
  cursorY -= 30;

  // Radar data (if present)
  if (profile_data?.radar?.length) {
    drawText(`Perfil comportamental (Radar) – valores %:`, cursorY);
    cursorY -= 20;
    profile_data.radar.forEach((p: { name: string; value: number }) => {
      drawText(`- ${p.name}: ${p.value}%`, cursorY);
      cursorY -= 18;
    });
    cursorY -= 10;
  }

  // AI‑generated summary sections
  const sections = [
    { title: "Resumo do Perfil Natural", content: ai_summary?.natural },
    { title: "Pontos Fortes & Estilo de Liderança", content: ai_summary?.strengths },
    { title: "Ambiente de Trabalho Ideal", content: ai_summary?.ideal_env },
    { title: "Pontos Cegos", content: ai_summary?.blind_spots },
  ];

  sections.forEach(({ title, content }) => {
    if (!content) return;
    drawText(title + ":", cursorY);
    cursorY -= 18;
    // split into lines of ~80 chars
    const words = content.split(" ");
    let line = "";
    for (const w of words) {
      if ((line + " " + w).length > 80) {
        drawText(line, cursorY);
        cursorY -= 18;
        line = w;
      } else {
        line = line ? line + " " + w : w;
      }
    }
    if (line) {
      drawText(line, cursorY);
      cursorY -= 18;
    }
    cursorY -= 8;
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}
