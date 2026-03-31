/**
 * Fetch with AbortController Timeout
 *
 * Wraps the native `fetch()` with an `AbortSignal.timeout()` to prevent
 * indefinite hangs when external APIs are slow or unresponsive.
 *
 * Server-side only — used by all external API clients in `lib/apis/`.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
 */

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Default timeout for external API calls (milliseconds) */
export const API_TIMEOUT_MS = 5_000;

/* ------------------------------------------------------------------ */
/* Wrapper                                                             */
/* ------------------------------------------------------------------ */

/**
 * Fetch a URL with an automatic timeout via AbortSignal.
 *
 * Behaves identically to `fetch()` but aborts the request if it exceeds
 * `timeoutMs` milliseconds. The caller's existing error handling will
 * catch the resulting `AbortError` / `TimeoutError`.
 *
 * @param url       — the URL to fetch
 * @param options   — standard `RequestInit` options (headers, method, etc.)
 * @param timeoutMs — timeout in milliseconds (defaults to `API_TIMEOUT_MS`)
 * @returns the `Response` from fetch
 * @throws `TimeoutError` (or `AbortError`) when the request exceeds the timeout
 */
export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = API_TIMEOUT_MS,
): Promise<Response> {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
}
