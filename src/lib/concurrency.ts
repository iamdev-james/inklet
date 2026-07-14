export class BusyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusyError";
  }
}

interface Waiter {
  grant: () => void;
  timer: ReturnType<typeof setTimeout>;
}

export class Semaphore {
  private running = 0;
  private waiters: Waiter[] = [];

  constructor(
    private readonly maxConcurrent: number,
    private readonly maxQueued: number,
    private readonly queueTimeoutMs: number,
  ) {}

  get inFlight(): number {
    return this.running;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running += 1;
      return Promise.resolve();
    }
    if (this.waiters.length >= this.maxQueued) {
      return Promise.reject(new BusyError("conversion queue is full"));
    }
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        grant: () => {
          clearTimeout(waiter.timer);
          this.running += 1;
          resolve();
        },
        timer: setTimeout(() => {
          const index = this.waiters.indexOf(waiter);
          if (index >= 0) this.waiters.splice(index, 1);
          reject(new BusyError("timed out waiting for a conversion slot"));
        }, this.queueTimeoutMs),
      };
      this.waiters.push(waiter);
    });
  }

  private release(): void {
    this.running -= 1;
    this.waiters.shift()?.grant();
  }
}

const store = globalThis as unknown as { __offprintRenderLimiter?: Semaphore };

export function getRenderLimiter(): Semaphore {
  store.__offprintRenderLimiter ??= new Semaphore(2, 4, 15_000);
  return store.__offprintRenderLimiter;
}
