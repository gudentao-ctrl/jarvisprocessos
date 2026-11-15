import { describe, expect, it } from "vitest";
import { parseCalendarBusy } from "../src/lib/calendar-feed.server";
import { isAllowedCalendarFeedUrl } from "../src/lib/calendar-feed-url";

const calendar = (events: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Calendar test//EN\r\n${events}\r\nEND:VCALENDAR`;
const event = (fields: string) => `BEGIN:VEVENT\r\n${fields}\r\nEND:VEVENT`;
const from = Date.parse("2026-11-15T00:00:00Z");
const to = Date.parse("2026-11-16T00:00:00Z");

describe("Google iCal availability", () => {
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