import { ApiError } from './types.ts';
import type { Runtime } from './types.ts';

const BASE = 'https://api.mfapi.in';
const TIMEOUT = 12_000;
const MAX_RETRY_WAIT = 5_000;

class ProviderError extends ApiError {
  transient: boolean;
  constructor(message: string, transient: boolean, retryAfter: number | null = null) {
    super(message, 502, retryAfter);
    this.transient = transient;
  }
}

function retryDelay(value: string | null, now: number): number | null {
  if (value === null || !value.trim()) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

export class Provider {
  runtime: Runtime;
  active = 0;
  waiters: Array<() => void> = [];
  nextStart = 0;
  constructor(runtime: Runtime) { this.runtime = runtime; }

  private async slot<T>(action: () => Promise<T>): Promise<T> {
    await new Promise<void>(resolve => {
      if (this.active < 2) { this.active += 1; resolve(); }
      else this.waiters.push(resolve);
    });
    try {
      const now = this.runtime.now().getTime();
      const start = Math.max(now, this.nextStart);
      this.nextStart = start + 100;
      if (start > now) await this.runtime.sleep(start - now);
      return await action();
    } finally {
      const next = this.waiters.shift();
      if (next) next();
      else this.active -= 1;
    }
  }

  private async once(path: string, maximumBytes: number): Promise<unknown> {
    return this.slot(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT);
      try {
        let response: Response;
        try {
          response = await this.runtime.fetch(`${BASE}${path}`, {
            signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'manual',
            headers: { Accept: 'application/json' },
          });
        } catch {
          throw new ProviderError(controller.signal.aborted ? 'MFAPI request timed out.' : 'MFAPI could not be reached.', true);
        }
        // Workers rejects redirect: 'error' before any network I/O. Manual mode keeps
        // the fixed-origin policy, and every 3xx is rejected without following Location.
        if (response.status >= 300 && response.status < 400) {
          await response.body?.cancel().catch(() => undefined);
          throw new ProviderError(`MFAPI returned an unexpected redirect (HTTP ${response.status}); no redirect was followed.`, false);
        }
        if (!response.ok) {
          const retryAfter = retryDelay(response.headers.get('Retry-After'), this.runtime.now().getTime());
          await response.body?.cancel().catch(() => undefined);
          throw new ProviderError(`MFAPI request failed (HTTP ${response.status}).`,
            [408, 425, 429, 500, 502, 503, 504].includes(response.status), retryAfter);
        }
        const announced = Number(response.headers.get('Content-Length'));
        if (Number.isFinite(announced) && announced > maximumBytes) {
          await response.body?.cancel().catch(() => undefined);
          throw new ProviderError('MFAPI response exceeds the supported size limit.', false);
        }
        // Enforce the limit while streaming, before allocating a potentially unbounded body.
        let content = '';
        let bytes = 0;
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          try {
            for (;;) {
              const chunk = await reader.read();
              if (chunk.done) break;
              bytes += chunk.value.byteLength;
              if (bytes > maximumBytes) {
                await reader.cancel();
                throw new ProviderError('MFAPI response exceeds the supported size limit.', false);
              }
              content += decoder.decode(chunk.value, { stream: true });
            }
            content += decoder.decode();
          } catch (error) {
            if (error instanceof ProviderError) throw error;
            throw new ProviderError('MFAPI response could not be read before its timeout.', true);
          } finally { reader.releaseLock(); }
        }
        try { return JSON.parse(content) as unknown; }
        catch { throw new ProviderError('MFAPI returned invalid JSON.', false); }
      } finally { clearTimeout(timeout); }
    });
  }

  async json(path: string, latest = false): Promise<unknown> {
    // Paths are generated exclusively by validated server operations; redirects are rejected.
    if (!(path === '/mf/latest' || /^\/mf\/[1-9]\d*$/.test(path) || path.startsWith('/mf/search?q='))) {
      throw new ApiError('Invalid provider operation.', 400);
    }
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try { return await this.once(path, (latest ? 32 : 16) * 1024 * 1024); }
      catch (error) {
        if (!(error instanceof ProviderError) || !error.transient || attempt > 0
          || (error.retryAfter !== null && error.retryAfter > MAX_RETRY_WAIT)) throw error;
        await this.runtime.sleep(error.retryAfter ?? 500);
      }
    }
    throw new ApiError('MFAPI request failed.');
  }
}
