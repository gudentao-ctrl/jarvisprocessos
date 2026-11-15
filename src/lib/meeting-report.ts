// Builds a meeting report only from sentences actually present in the transcript (no AI, no credits).
export type MeetingAction = { text: string; owner: string; deadline: string };
export type MeetingReport = {
  summary: string[];
  actions: MeetingAction[];
  deadlines: string[];
  pending: string[];
  validations: string[];
};

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(" ").length >= 4);
}

const DEADLINE = /\b(ate|prazo|amanha|semana que vem|proxima semana|mes que vem|segunda|terca|quarta|quinta|sexta|sabado|domingo|dia \d{1,2}|\d{1,2}\/\d{1,2}(\/\d{2,4})?|em \d+ dias?)\b/;
const ACTION = /\b(vou|vamos|vai|irei|iremos|fica responsavel|ficou responsavel|responsavel|precisa|precisamos|tem que|temos que|devo|deve|devemos|enviar|mandar|preparar|agendar|providenciar|entregar|fazer|ajustar|revisar)\b/;
const PENDING = /\b(pendente|pendencia|falta|faltando|aguardando|ainda nao|em aberto|nao foi|nao esta|depende|bloqueado|atrasad)/;
const VALIDATION = /\b(validad|aprovad|aprovamos|aprovou|confirmad|confirmamos|ok|concordamos|fechado|esta certo|de acordo|homologad|conferid)/;
const KEY = /\b(importante|decid|problema|objetivo|resultado|meta|cliente|custo|processo|proposta|principal|prioridade)/;

function deadlineOf(sentence: string): string {
  const m = fold(sentence).match(DEADLINE);
  if (!m) return "";
  const idx = m.index ?? 0;
  return sentence.slice(idx, idx + 40).split(/[,.;]/)[0].trim();
}

function ownerOf(sentence: string, people: string[]): string {
  const f = fold(sentence);
  const hit = people.find((p) => p && f.includes(fold(p.split(" ")[0])));
  if (hit) return hit;
  if (/\b(vou|irei|devo)\b/.test(f)) return "Quem falou";
  if (/\b(vamos|iremos|devemos|precisamos|temos que)\b/.test(f)) return "Equipe";
  return "";
}

export function buildMeetingReport(transcript: string, participants = ""): MeetingReport {
  const people = participants.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
  const sentences = splitSentences(transcript);
  const report: MeetingReport = { summary: [], actions: [], deadlines: [], pending: [], validations: [] };
  for (const s of sentences) {
    const f = fold(s);
    const deadline = deadlineOf(s);
    if (ACTION.test(f)) report.actions.push({ text: s, owner: ownerOf(s, people), deadline });
    if (deadline) report.deadlines.push(s);
    if (PENDING.test(f)) report.pending.push(s);
    if (VALIDATION.test(f) && !PENDING.test(f)) report.validations.push(s);
    if (KEY.test(f)) report.summary.push(s);
  }
  if (report.summary.length === 0) report.summary = sentences.slice(0, 5);
  const cap = <T,>(a: T[], n: number) => a.slice(0, n);
  return {
    summary: cap(report.summary, 12),
    actions: cap(report.actions, 40),
    deadlines: cap(report.deadlines, 30),
    pending: cap(report.pending, 30),
    validations: cap(report.validations, 30),
  };
}
