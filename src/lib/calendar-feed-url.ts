/** Only Google Agenda private iCal addresses are accepted (never arbitrary URLs). */
export function isAllowedCalendarFeedUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === "https:" &&
      url.hostname === "calendar.google.com" &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname.startsWith("/calendar/ical/") &&
      url.pathname.endsWith(".ics")
    );
  } catch {
    return false;
  }
}

/** Link that opens Google Agenda with the meeting already filled in. */
export function googleCalendarTemplateUrl(e: {
  title: string;
  start: string;
  end?: string | null;
  description?: string | null;
  location?: string | null;
  guests?: string[];
}) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(e.start);
  const end = e.end ? new Date(e.end) : new Date(start.getTime() + 3600_000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    ctz: "America/Sao_Paulo",
  });
  if (e.description) p.set("details", e.description);
  if (e.location) p.set("location", e.location);
  if (e.guests?.length) p.set("add", e.guests.join(","));
  return `https://calendar.google.com/calendar/render?${p}`;
}
