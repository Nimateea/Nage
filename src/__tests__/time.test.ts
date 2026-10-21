import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "@/lib/utils/time";

describe("formatRelativeTime", () => {
  it("formats timestamps less than 1 minute ago as 'Just now'", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 10000)).toBe("Just now");
  });

  it("formats timestamps in minutes", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 5 * 60000)).toBe("5m ago");
    expect(formatRelativeTime(now - 45 * 60000)).toBe("45m ago");
  });

  it("formats timestamps in hours", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 120 * 60000)).toBe("2h ago");
    expect(formatRelativeTime(now - 300 * 60000)).toBe("5h ago");
  });

  it("formats timestamps in days", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 2880 * 60000)).toBe("2d ago");
    expect(formatRelativeTime(now - 7200 * 60000)).toBe("5d ago");
  });
});
