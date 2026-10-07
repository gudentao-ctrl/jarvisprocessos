/** Calendar age at report issuance; date-only birth dates never shift by timezone. */
export function calculateAssessmentAge(birthDate?: string | null, reference = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate ?? "");
  if (!match || !Number.isFinite(reference.getTime())) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return null;
  let age = reference.getUTCFullYear() - year;
  if (reference.getUTCMonth() + 1 < month || (reference.getUTCMonth() + 1 === month && reference.getUTCDate() < day)) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
}