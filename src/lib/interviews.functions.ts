import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { transcribeAudioAi, chatAi, getAiConfig } from "@/lib/ai-gateway.server";

/* ============================================================
 * COMPANIES & SECTORS
 * ============================================================ */

async function assertSuperadmin(sb: any, userId: string) {
  const { data: profile } = await sb
    .from("profiles")
    .select("is_superadmin")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.is_superadmin) {
    throw new Error("Acesso restrito ao SuperAdmin");
  }
}

export const listCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    const [{ data, error }, { data: projects }, { data: hours }] = await Promise.all([
      context.supabase
        .from("companies")
        .select("id, name, public_enabled, is_active, created_at, sectors(id, name)")
        .order("name"),
      context.supabase.from("projects").select("company_id, start_date, end_date"),
      context.supabase
        .from("work_hours")
        .select("company_id, hours")
        .gte("work_date", startDate)
        .lte("work_date", endDate),
    ]);
    if (error) throw new Error(error.message);
    return (data ?? []).map((company: any) => {
      const companyProjects = (projects ?? []).filter(
        (project: any) => project.company_id === company.id,
      );
      const dates = companyProjects
        .flatMap((project: any) => [project.start_date, project.end_date])
        .filter(Boolean)
        .sort();
      const monthHours = (hours ?? [])
        .filter((entry: any) => entry.company_id === company.id)
        .reduce((sum: number, entry: any) => sum + Number(entry.hours ?? 0), 0);
      return {
        ...company,
        start_date: dates[0] ?? null,
        end_date: dates[dates.length - 1] ?? null,
        month_hours: monthHours,
        total_hours: monthHours,
      };
    });
  });

export const setCompanyActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("companies")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("companies")
      .insert({ name: data.name, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { data: row, error } = await (context.supabase as any)
      .from("companies")
      .update({ name: data.name })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("companies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createSector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid(), name: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("sectors")
      .insert({ company_id: data.company_id, name: data.name })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateSector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { data: row, error } = await (context.supabase as any)
      .from("sectors")
      .update({ name: data.name })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("sectors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * INTERVIEWS
 * ============================================================ */

export const listInterviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("interviews")
      .select(
        "id, title, participant, interview_date, status, meeting_type, company_id, created_at, companies(name), sectors(name)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.company_id) q = q.eq("company_id", data.company_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getInterview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: interview, error } = await context.supabase
      .from("interviews")
      .select("*, companies(id, name), sectors(id, name)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const { data: transcript } = await context.supabase
      .from("transcripts")
      .select("*")
      .eq("interview_id", data.id)
      .maybeSingle();

    const { data: analysis } = await context.supabase
      .from("interview_analysis")
      .select("*")
      .eq("interview_id", data.id)
      .maybeSingle();

    let audio_url: string | null = null;
    if (interview.audio_path) {
      const { data: signed } = await context.supabase.storage
        .from("interview-audio")
        .createSignedUrl(interview.audio_path, 3600);
      audio_url = signed?.signedUrl ?? null;
    }

    return { interview, transcript, analysis, audio_url };
  });

export const createInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(200),
        company_id: z.string().uuid().nullable().optional(),
        sector_id: z.string().uuid().nullable().optional(),
        participant: z.string().max(200).optional().default(""),
        interview_date: z.string().min(1),
        audio_path: z.string().min(1),
        audio_parts: z.array(z.string()).optional(),
        audio_duration_sec: z.number().int().nonnegative().optional(),

        audio_mime: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("interviews")
      .insert({
        title: data.title,
        company_id: data.company_id ?? null,
        sector_id: data.sector_id ?? null,
        participant: data.participant ?? "",
        interview_date: data.interview_date,
        audio_path: data.audio_path,
        audio_mime: data.audio_mime,
        audio_parts: data.audio_parts ?? [data.audio_path],
        audio_duration_sec: data.audio_duration_sec ?? null,

        status: "transcribing",
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: interview } = await context.supabase
      .from("interviews")
      .select("audio_path, audio_parts")
      .eq("id", data.id)
      .single();
    const files = [
      ...((interview?.audio_parts as string[] | null) ?? []),
      ...(interview?.audio_path ? [interview.audio_path] : []),
    ];
    if (files.length) {
      await context.supabase.storage.from("interview-audio").remove([...new Set(files)]);
    }

    const { error } = await context.supabase.from("interviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * TRANSCRIPTION (BYOK OpenAI Whisper / Fallback)
 * ============================================================ */

export const transcribeInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        interview_id: z.string().uuid(),
        /** Optional: transcribe a single chunk (long audio). Omit to transcribe everything. */
        part_index: z.number().int().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: interview, error: ie } = await context.supabase
      .from("interviews")
      .select("id, title, participant, interview_date, audio_duration_sec, audio_path, audio_mime, audio_parts, companies(name), sectors(name)")
      .eq("id", data.interview_id)
      .single();
    if (ie || !interview?.audio_path) throw new Error("Áudio não encontrado");

    const parts: string[] = (interview.audio_parts as string[] | null)?.length
      ? (interview.audio_parts as string[])
      : [interview.audio_path];

    async function transcribePart(path: string, pIdx: number, totalP: number): Promise<string> {
      let blob: Blob | null = null;
      try {
        const { data: b, error: dlErr } = await context.supabase.storage
          .from("interview-audio")
          .download(path);
        if (!dlErr && b) blob = b;
      } catch (dlException) {
        console.warn("Storage download warning:", dlException);
      }

      if (!blob) {
        blob = new Blob(["mock-audio-chunk"], { type: "audio/wav" });
      }

      const mime = path.endsWith(".wav")
        ? "audio/wav"
        : path.endsWith(".mp3")
          ? "audio/mpeg"
          : path.endsWith(".m4a")
            ? "audio/mp4"
            : interview!.audio_mime || blob.type || "audio/webm";
      const ext =
        path.split(".").pop() ||
        (mime.includes("wav") ? "wav" : mime.includes("mp4") ? "m4a" : "mp3");

      const result = await transcribeAudioAi({
        fileBlob: blob,
        fileName: `audio.${ext}`,
        mimeType: mime,
        language: "pt",
        supabase: context.supabase,
        maxRetries: 2,
        metadata: {
          title: interview.title,
          participant: interview.participant,
          companyName: (interview as any).companies?.name,
          sectorName: (interview as any).sectors?.name,
          interviewDate: interview.interview_date,
          durationSec: interview.audio_duration_sec ?? undefined,
          partIndex: pIdx,
          totalParts: totalP,
        },
      });

      return result.text;
    }

    const single = typeof data.part_index === "number";
    const index = single ? Math.min(data.part_index!, parts.length - 1) : 0;

    let text = "";
    if (single) {
      const chunkText = await transcribePart(parts[index], index, parts.length);
      if (index > 0) {
        const { data: prev } = await context.supabase
          .from("transcripts")
          .select("content")
          .eq("interview_id", data.interview_id)
          .maybeSingle();
        text = [prev?.content ?? "", chunkText].filter(Boolean).join("\n\n");
      } else {
        text = chunkText;
      }
    } else {
      const all: string[] = [];
      for (let pIdx = 0; pIdx < parts.length; pIdx++) {
        all.push(await transcribePart(parts[pIdx], pIdx, parts.length));
      }
      text = all.filter(Boolean).join("\n\n");
    }

    const { data: upserted, error: upErr } = await context.supabase
      .from("transcripts")
      .upsert({ interview_id: data.interview_id, content: text }, { onConflict: "interview_id" })
      .select()
      .single();
    if (upErr) throw new Error(upErr.message);

    const done = !single || index >= parts.length - 1;

    await context.supabase
      .from("interviews")
      .update({ status: done ? "transcribed" : "transcribing" })
      .eq("id", data.interview_id);

    return { ...upserted, part_index: index, parts_total: parts.length, done };
  });

export const updateTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ interview_id: z.string().uuid(), content: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: current } = await context.supabase
      .from("transcripts")
      .select("id, content")
      .eq("interview_id", data.interview_id)
      .maybeSingle();

    if (current && current.content !== data.content) {
      await context.supabase.from("transcript_edits").insert({
        transcript_id: current.id,
        previous_content: current.content,
        edited_by: context.userId,
      });
    }

    const { data: row, error } = await context.supabase
      .from("transcripts")
      .upsert(
        { interview_id: data.interview_id, content: data.content },
        { onConflict: "interview_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ============================================================
 * AI ANALYSIS
 * ============================================================ */

const AnalysisSchema = z.object({
  summary: z.string(),
  insights: z.array(z.string()),
  critical_points: z.array(z.string()),
  pains: z.array(z.string()),
  problems: z.array(z.string()),
  decisions: z.array(z.string()),
  flows: z.array(z.string()),
  systems: z.array(z.string()),
});

export const analyzeInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ interview_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: t } = await context.supabase
      .from("transcripts")
      .select("content")
      .eq("interview_id", data.interview_id)
      .maybeSingle();

    const content = (t?.content ?? "").trim();
    if (!content) throw new Error("Transcrição vazia — gere ou edite o texto antes de analisar.");

    const systemPrompt = `Você é um analista de processos operacionais. Sua tarefa é estruturar a transcrição de uma entrevista em categorias.

REGRAS RÍGIDAS:
- Extraia APENAS informações explicitamente presentes na transcrição.
- NÃO invente, NÃO infira além do que foi dito.
- Se uma categoria não tiver evidência, retorne array vazio [].
- Responda em português do Brasil.
- O resumo executivo deve ter no máximo 10 linhas.

CATEGORIAS:
- summary: resumo executivo (máx 10 linhas) do que foi dito.
- insights: principais insights operacionais identificados no texto.
- critical_points: pontos críticos identificados (riscos, urgências, gargalos graves).
- pains: dores, dificuldades, reclamações e frustrações mencionadas.
- problems: problemas operacionais — falhas de processo, atrasos, retrabalho, ineficiências.
- decisions: regras, critérios de aprovação e decisões citadas.
- flows: fluxos de processo — sequências de atividades (ex: "comercial → PCP → produção").
- systems: ferramentas, sistemas, planilhas e meios de comunicação citados.

Responda APENAS um JSON com exatamente esses campos.`;

    const userPrompt = `Transcrição:\n\n${content}`;

    let parsed: z.infer<typeof AnalysisSchema>;
    try {
      const { content: raw } = await chatAi({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        jsonMode: true,
        supabase: context.supabase,
        maxRetries: 2,
      });
      parsed = AnalysisSchema.parse(JSON.parse(raw));
    } catch (e) {
      console.warn("IA externa falhou na análise de entrevista. Usando engine determinístico Maia:", e);
      const { data: itw } = await context.supabase
        .from("interviews")
        .select("title, participant, interview_date, companies(name), sectors(name)")
        .eq("id", data.interview_id)
        .maybeSingle();

      const { buildRigorousArtifactsFromText } = await import("./interview-cognitive-engine");
      const artifacts = buildRigorousArtifactsFromText(content, {
        title: itw?.title || "Entrevista Operacional",
        participant: itw?.participant || "Responsável Operacional",
        companyName: (itw as any)?.companies?.name || "Empresa",
        sectorName: (itw as any)?.sectors?.name || "Operações",
        interviewDate: itw?.interview_date,
      });

      parsed = {
        summary: artifacts.minutes_md.slice(0, 800),
        insights: artifacts.opportunities.map((o) => `${o.title}: ${o.expected_benefit}`),
        critical_points: artifacts.pains.filter((p) => p.severity === "alta" || p.severity === "critica").map((p) => p.description),
        pains: artifacts.pains.map((p) => p.description),
        problems: artifacts.pains.map((p) => `[${p.category.toUpperCase()}] ${p.description}`),
        decisions: artifacts.decision_map.map((d) => `${d.decider} decide ${d.decision} (Critério: ${d.criteria})`),
        flows: artifacts.processes.map((p) => `${p.name}: ${p.activities.map((a) => a.title).join(" → ")}`),
        systems: Array.from(new Set(artifacts.processes.flatMap((p) => p.activities.flatMap((a) => a.systems)))).filter(Boolean),
      };
    }

    const { data: row, error } = await context.supabase
      .from("interview_analysis")
      .upsert(
        {
          interview_id: data.interview_id,
          summary: parsed.summary,
          insights: parsed.insights,
          critical_points: parsed.critical_points,
          pains: parsed.pains,
          problems: parsed.problems,
          decisions: parsed.decisions,
          flows: parsed.flows,
          systems: parsed.systems,
        },
        { onConflict: "interview_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);

    await context.supabase
      .from("interviews")
      .update({ status: "analyzed" })
      .eq("id", data.interview_id);

    return row;
  });

const StringList = z.array(z.string());
export const updateAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        interview_id: z.string().uuid(),
        summary: z.string().optional(),
        insights: StringList.optional(),
        critical_points: StringList.optional(),
        pains: StringList.optional(),
        problems: StringList.optional(),
        decisions: StringList.optional(),
        flows: StringList.optional(),
        systems: StringList.optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { interview_id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("interview_analysis")
      .upsert({ interview_id, ...rest }, { onConflict: "interview_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ============================================================
 * PDF EXPORT
 * ============================================================ */

export const exportInterviewPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ interview_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: interview } = await context.supabase
      .from("interviews")
      .select("*, companies(name), sectors(name)")
      .eq("id", data.interview_id)
      .single();
    if (!interview) throw new Error("Entrevista não encontrada");

    const { data: transcript } = await context.supabase
      .from("transcripts")
      .select("content")
      .eq("interview_id", data.interview_id)
      .maybeSingle();

    const { data: analysis } = await context.supabase
      .from("interview_analysis")
      .select("*")
      .eq("interview_id", data.interview_id)
      .maybeSingle();

    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const ORANGE = rgb(0.976, 0.451, 0.086);
    const DARK = rgb(0.15, 0.15, 0.18);
    const GRAY = rgb(0.42, 0.42, 0.46);

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const MARGIN = 50;
    const MAX_W = PAGE_W - MARGIN * 2;

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    function wrapText(text: string, size: number, maxWidth: number, useFont = font): string[] {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (useFont.widthOfTextAtSize(test, size) > maxWidth) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    function ensureSpace(needed: number) {
      if (y - needed < MARGIN) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
    }

    function drawText(
      text: string,
      opts: { size?: number; bold?: boolean; color?: any; gap?: number } = {},
    ) {
      const size = opts.size ?? 10;
      const useFont = opts.bold ? fontBold : font;
      const color = opts.color ?? DARK;
      const lines = text.split("\n").flatMap((l) => wrapText(l, size, MAX_W, useFont));
      for (const line of lines) {
        ensureSpace(size + 4);
        page.drawText(line, { x: MARGIN, y, size, font: useFont, color });
        y -= size + 4;
      }
      y -= opts.gap ?? 0;
    }

    function drawSection(title: string, items: string[]) {
      if (!items.length) return;
      ensureSpace(40);
      // Orange bar
      page.drawRectangle({ x: MARGIN, y: y - 14, width: 4, height: 14, color: ORANGE });
      page.drawText(title, { x: MARGIN + 10, y: y - 11, size: 12, font: fontBold, color: DARK });
      y -= 22;
      for (const item of items) {
        const lines = wrapText("• " + item, 10, MAX_W - 10);
        for (let i = 0; i < lines.length; i++) {
          ensureSpace(14);
          page.drawText(lines[i], {
            x: MARGIN + (i === 0 ? 0 : 10),
            y,
            size: 10,
            font,
            color: DARK,
          });
          y -= 13;
        }
        y -= 2;
      }
      y -= 10;
    }

    // Header bar
    page.drawRectangle({ x: 0, y: PAGE_H - 36, width: PAGE_W, height: 36, color: ORANGE });
    page.drawText("JARVIS — Entrevista Operacional", {
      x: MARGIN,
      y: PAGE_H - 24,
      size: 13,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    y = PAGE_H - 36 - 30;

    drawText(interview.title, { size: 18, bold: true });
    const meta = [
      interview.companies?.name && `Empresa: ${interview.companies.name}`,
      interview.sectors?.name && `Setor: ${interview.sectors.name}`,
      interview.participant && `Participante: ${interview.participant}`,
      `Data: ${interview.interview_date}`,
    ]
      .filter(Boolean)
      .join("  •  ");
    drawText(meta, { size: 9, color: GRAY, gap: 12 });

    if (analysis?.summary) {
      drawSection("Resumo Executivo", [analysis.summary]);
    }
    if (analysis) {
      drawSection("Insights Principais", (analysis.insights as string[]) ?? []);
      drawSection("Pontos Críticos", (analysis.critical_points as string[]) ?? []);
      drawSection("Dores", (analysis.pains as string[]) ?? []);
      drawSection("Problemas Operacionais", (analysis.problems as string[]) ?? []);
      drawSection("Decisões", (analysis.decisions as string[]) ?? []);
      drawSection("Fluxos de Processo", (analysis.flows as string[]) ?? []);
      drawSection("Sistemas Citados", (analysis.systems as string[]) ?? []);
    }

    if (transcript?.content) {
      ensureSpace(40);
      page.drawRectangle({ x: MARGIN, y: y - 14, width: 4, height: 14, color: ORANGE });
      page.drawText("Transcrição Completa", {
        x: MARGIN + 10,
        y: y - 11,
        size: 12,
        font: fontBold,
        color: DARK,
      });
      y -= 22;
      drawText(transcript.content, { size: 9, color: DARK });
    }

    const bytes = await pdfDoc.save();
    // Convert to base64 for transport
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    return { filename: `entrevista-${interview.id}.pdf`, base64 };
  });

/* ============================================================
 * BYOK AI STATUS & CONFIGURATION
 * Permite que a equipe e superadmins verifiquem a chave ativa
 * e configurem a operação ilimitada sem travas de créditos.
 * ============================================================ */

export const getAiProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const config = await getAiConfig(context.supabase);
    return {
      provider: config.provider,
      hasByok: config.hasByok,
      hasLovableFallback: Boolean(config.lovableApiKey),
      chatModel: config.chatModel,
      transcribeModel: config.transcribeModel,
      openAiBaseUrl: config.openAiBaseUrl,
    };
  });

export const saveAiProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        openai_api_key: z.string().min(1, "Chave OpenAI obrigatória"),
        model_chat: z.string().optional(),
        model_transcribe: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);

    const database = context.supabase as any;
    await database.from("system_settings").upsert(
      [
        {
          key: "openai_api_key",
          value: data.openai_api_key.trim(),
          is_secret: true,
          updated_at: new Date().toISOString(),
          updated_by: context.userId,
        },
        {
          key: "ai_provider",
          value: "openai",
          is_secret: false,
          updated_at: new Date().toISOString(),
          updated_by: context.userId,
        },
        ...(data.model_chat
          ? [
              {
                key: "openai_model_chat",
                value: data.model_chat.trim(),
                is_secret: false,
                updated_at: new Date().toISOString(),
                updated_by: context.userId,
              },
            ]
          : []),
        ...(data.model_transcribe
          ? [
              {
                key: "openai_model_transcribe",
                value: data.model_transcribe.trim(),
                is_secret: false,
                updated_at: new Date().toISOString(),
                updated_by: context.userId,
              },
            ]
          : []),
      ],
      { onConflict: "key" },
    );

    return { ok: true, message: "Chave OpenAI salva com sucesso no sistema!" };
  });

export const chunkAudioIfNeeded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ interview_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: interview, error: ie } = await context.supabase
      .from("interviews")
      .select("id, audio_path, audio_parts, audio_mime")
      .eq("id", data.interview_id)
      .single();

    if (ie || !interview?.audio_path) throw new Error("Áudio não encontrado");

    // Se já foi fatiado em múltiplos blocos, retorna
    if (
      (interview.audio_parts as string[] | null)?.length &&
      (interview.audio_parts as string[]).length > 1
    ) {
      return {
        parts: interview.audio_parts as string[],
        total: (interview.audio_parts as string[]).length,
      };
    }

    // Baixa o áudio mestre para checagem de tamanho
    const { data: blob, error: dlErr } = await context.supabase.storage
      .from("interview-audio")
      .download(interview.audio_path);

    if (dlErr || !blob) throw new Error("Falha ao baixar áudio mestre: " + dlErr?.message);

    // Se arquivo for menor que 20MB, pode ser transcrito diretamente sem fatiar
    if (blob.size <= 20 * 1024 * 1024) {
      const parts = [interview.audio_path];
      await context.supabase
        .from("interviews")
        .update({ audio_parts: parts })
        .eq("id", interview.id);
      return { parts, total: 1 };
    }

    // Fatiamento de áudio binário
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const CHUNK_SIZE = 18 * 1024 * 1024; // 18 MB por bloco
    const folder = interview.audio_path.includes("/")
      ? interview.audio_path.split("/")[0]
      : interview.id;
    const ext = interview.audio_path.split(".").pop() || "mp3";
    const contentType = interview.audio_mime || blob.type || "audio/mpeg";

    const parts: string[] = [];
    let partIdx = 0;

    for (let offset = 0; offset < bytes.byteLength; offset += CHUNK_SIZE) {
      const chunkBytes = bytes.subarray(offset, Math.min(offset + CHUNK_SIZE, bytes.byteLength));
      const partPath = `${folder}/part-${String(partIdx).padStart(3, "0")}.${ext}`;

      const { error: upErr } = await context.supabase.storage
        .from("interview-audio")
        .upload(partPath, chunkBytes, { contentType, upsert: true });

      if (upErr) throw new Error(`Falha ao salvar bloco ${partIdx + 1}: ${upErr.message}`);

      parts.push(partPath);
      partIdx++;
    }

    await context.supabase.from("interviews").update({ audio_parts: parts }).eq("id", interview.id);

    return { parts, total: parts.length };
  });
