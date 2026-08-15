import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * COMPANIES & SECTORS
 * ============================================================ */

export const listCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("companies")
      .select("id, name, public_enabled, sectors(id, name)")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
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
    const { data: row, error } = await context.supabase
      .from("sectors")
      .insert({ company_id: data.company_id, name: data.name })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
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
      .select("id, title, participant, interview_date, status, meeting_type, company_id, created_at, companies(name), sectors(name)")
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
 * TRANSCRIPTION (Lovable AI Gateway STT)
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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const { data: interview, error: ie } = await context.supabase
      .from("interviews")
      .select("id, audio_path, audio_mime, audio_parts")
      .eq("id", data.interview_id)
      .single();
    if (ie || !interview?.audio_path) throw new Error("Áudio não encontrado");

    const parts: string[] =
      (interview.audio_parts as string[] | null)?.length
        ? (interview.audio_parts as string[])
        : [interview.audio_path];

    async function transcribePart(path: string): Promise<string> {
      const { data: blob, error: dlErr } = await context.supabase.storage
        .from("interview-audio")
        .download(path);
      if (dlErr || !blob) throw new Error("Falha ao baixar áudio: " + (dlErr?.message ?? ""));

      const mime = path.endsWith(".wav") ? "audio/wav" : interview!.audio_mime || blob.type || "audio/webm";
      const ext = mime.includes("wav") ? "wav" : mime.includes("mp4") ? "mp4" : mime.includes("mpeg") ? "mp3" : "webm";

      const form = new FormData();
      form.append("file", blob, `audio.${ext}`);
      form.append("model", "openai/gpt-4o-mini-transcribe");
      form.append("language", "pt");

      const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
        if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos ao workspace.");
        throw new Error(`Falha na transcrição (${res.status}): ${txt.slice(0, 200)}`);
      }

      const json = (await res.json()) as { text?: string };
      return (json.text ?? "").trim();
    }

    const single = typeof data.part_index === "number";
    const index = single ? Math.min(data.part_index!, parts.length - 1) : 0;

    let text = "";
    if (single) {
      const chunkText = await transcribePart(parts[index]);
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
      for (const p of parts) all.push(await transcribePart(p));
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
      await context.supabase
        .from("transcript_edits")
        .insert({ transcript_id: current.id, previous_content: current.content, edited_by: context.userId });
    }

    const { data: row, error } = await context.supabase
      .from("transcripts")
      .upsert({ interview_id: data.interview_id, content: data.content }, { onConflict: "interview_id" })
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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

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

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Limite de IA atingido. Tente novamente em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos ao workspace.");
      throw new Error(`Falha na análise (${res.status}): ${txt.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: z.infer<typeof AnalysisSchema>;
    try {
      parsed = AnalysisSchema.parse(JSON.parse(raw));
    } catch (e) {
      throw new Error("Resposta da IA inválida. Tente novamente.");
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

    function drawText(text: string, opts: { size?: number; bold?: boolean; color?: any; gap?: number } = {}) {
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
          page.drawText(lines[i], { x: MARGIN + (i === 0 ? 0 : 10), y, size: 10, font, color: DARK });
          y -= 13;
        }
        y -= 2;
      }
      y -= 10;
    }

    // Header bar
    page.drawRectangle({ x: 0, y: PAGE_H - 36, width: PAGE_W, height: 36, color: ORANGE });
    page.drawText("JARVIS — Entrevista Operacional", {
      x: MARGIN, y: PAGE_H - 24, size: 13, font: fontBold, color: rgb(1, 1, 1),
    });
    y = PAGE_H - 36 - 30;

    drawText(interview.title, { size: 18, bold: true });
    const meta = [
      interview.companies?.name && `Empresa: ${interview.companies.name}`,
      interview.sectors?.name && `Setor: ${interview.sectors.name}`,
      interview.participant && `Participante: ${interview.participant}`,
      `Data: ${interview.interview_date}`,
    ].filter(Boolean).join("  •  ");
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
      page.drawText("Transcrição Completa", { x: MARGIN + 10, y: y - 11, size: 12, font: fontBold, color: DARK });
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
