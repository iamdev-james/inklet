import { afterEach, describe, expect, it } from "vitest";
import { BusyError, Semaphore } from "./concurrency";
import { checkRateLimit, resetRateLimits } from "./rateLimit";

afterEach(() => {
  resetRateLimits();
});

describe("rate limiter", () => {
  it("allows ten conversions then blocks with a retry hint", () => {
    const start = 1_000_000;
    for (let i = 0; i < 10; i += 1) {
      expect(checkRateLimit("1.2.3.4", start + i).allowed).toBe(true);
    }
    const blocked = checkRateLimit("1.2.3.4", start + 100);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks IPs independently and slides the window", () => {
    const start = 2_000_000;
    for (let i = 0; i < 10; i += 1) checkRateLimit("5.6.7.8", start);
    expect(checkRateLimit("9.9.9.9", start).allowed).toBe(true);
    expect(checkRateLimit("5.6.7.8", start + 61 * 60 * 1000).allowed).toBe(true);
  });
});

describe("render semaphore", () => {
  it("runs at most maxConcurrent tasks at once", async () => {
    const semaphore = new Semaphore(2, 4, 1_000);
    let active = 0;
    let peak = 0;
    const task = () =>
      semaphore.run(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 20));
        active -= 1;
      });
    await Promise.all([task(), task(), task(), task(), task()]);
    expect(peak).toBe(2);
  });

  it("rejects immediately when the queue overflows", async () => {
    const semaphore = new Semaphore(1, 1, 1_000);
    const slow = semaphore.run(() => new Promise((resolve) => setTimeout(resolve, 50)));
    const queued = semaphore.run(() => Promise.resolve("queued"));
    await expect(semaphore.run(() => Promise.resolve("overflow"))).rejects.toThrowError(BusyError);
    await expect(queued).resolves.toBe("queued");
    await slow;
  });

  it("rejects queued waiters after the bounded wait", async () => {
    const semaphore = new Semaphore(1, 1, 30);
    const slow = semaphore.run(() => new Promise((resolve) => setTimeout(resolve, 120)));
    await expect(semaphore.run(() => Promise.resolve("late"))).rejects.toThrowError(BusyError);
    await slow;
  });
});
