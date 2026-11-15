import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCalendarBusy, readBusy } from "../src/lib/calendar-feed.server";
import { isAllowedCalendarFeedUrl } from "../src/lib/calendar-feed-url";

const calendar = (events: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Calendar test//EN\r\n${events}\r\nEND:VCALENDAR`;
const event = (fields: string) => `BEGIN:VEVENT\r\n${fields}\r\nEND:VEVENT`;
const from = Date.parse("2026-11-15T00:00:00Z");
const to = Date.parse("2026-11-16T00:00:00Z");

describe("Google iCal availability", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("uses the supported manual redirect mode and reads the calendar", async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      if (init.redirect !== "manual") throw new Error("Unsupported redirect mode at the edge");
      return new Response(calendar(event("UID:direct\r\nDTSTART:20261115T120000Z\r\nDTEND:20261115T130000Z")));
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await readBusy("https://calendar.google.com/calendar/ical/test/public/basic.ics", from, to)).toEqual([[Date.parse("2026-11-15T12:00:00Z"), Date.parse("2026-11-15T13:00:00Z")]]);
  });
  it("rejects redirects without fetching their destination", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { Location: "https://example.com/private" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(readBusy("https://calendar.google.com/calendar/ical/test/public/basic.ics", from, to)).rejects.toThrow("redirecionou");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("accepts the supplied public Google iCal URL", () => {
    expect(isAllowedCalendarFeedUrl("https://calendar.google.com/calendar/ical/processos.maia%40maiaconsultoria.com.br/public/basic.ics")).toBe(true);
    expect(isAllowedCalendarFeedUrl("https://calendar.google.com.evil.test/calendar/ical/test/public/basic.ics")).toBe(false);
  });
  it("counts detached recurring occurrences when Google omits the master", async () => {
    const text = calendar(event("UID:detached\r\nRECURRENCE-ID:20261115T120000Z\r\nDTSTART:20261115T130000Z\r\nDTEND:20261115T140000Z"));
    expect(await parseCalendarBusy(text, from, to)).toEqual([[Date.parse("2026-11-15T13:00:00Z"), Date.parse("2026-11-15T14:00:00Z")]]);
  });
  it("does not duplicate an exception when its recurring master exists", async () => {
    const text = calendar([
      event("UID:series\r\nDTSTART:20261114T120000Z\r\nDTEND:20261114T130000Z\r\nRRULE:FREQ=DAILY;COUNT=2"),
      event("UID:series\r\nRECURRENCE-ID:20261115T120000Z\r\nDTSTART:20261115T140000Z\r\nDTEND:20261115T150000Z"),
    ].join("\r\n"));
    expect(await parseCalendarBusy(text, from, to)).toEqual([[Date.parse("2026-11-15T14:00:00Z"), Date.parse("2026-11-15T15:00:00Z")]]);
  });
  it("ignores cancelled and transparent detached occurrences", async () => {
    const text = calendar(["STATUS:CANCELLED", "TRANSP:TRANSPARENT"].map((status, i) => event(`UID:ignored-${i}\r\nRECURRENCE-ID:20261115T120000Z\r\nDTSTART:20261115T120000Z\r\nDTEND:20261115T130000Z\r\n${status}`)).join("\r\n"));
    expect(await parseCalendarBusy(text, from, to)).toEqual([]);
  });
});