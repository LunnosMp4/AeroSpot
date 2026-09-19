export class HttpError extends Error {
  readonly status: number
  readonly url: string

  constructor(status: number, message: string, url: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.url = url
  }
}

export interface RequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
  headers?: Record<string, string>
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs)
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason)
    else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timer),
  }
}

export async function getJSON<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 12_000
  const { signal, dispose } = withTimeout(options.signal, timeoutMs)
  try {
    const response = await fetch(url, { signal, headers: options.headers })
    if (!response.ok) {
      throw new HttpError(response.status, `Requête échouée (${response.status})`, url)
    }
    return (await response.json()) as T
  } finally {
    dispose()
  }
}

export function buildUrl(base: string, path: string, params: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path.replace(/^\//, ''), base.endsWith('/') ? base : `${base}/`)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

export async function postForm<T>(
  url: string,
  body: Record<string, string>,
  options: RequestOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 30_000
  const { signal, dispose } = withTimeout(options.signal, timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers,
      },
      body: new URLSearchParams(body).toString(),
      signal,
    })
    if (!response.ok) {
      throw new HttpError(response.status, `Requête échouée (${response.status})`, url)
    }
    return (await response.json()) as T
  } finally {
    dispose()
  }
}

export async function sendJSON<T>(
  method: 'POST' | 'PUT' | 'DELETE',
  url: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T | null> {
  const timeoutMs = options.timeoutMs ?? 10_000
  const { signal, dispose } = withTimeout(options.signal, timeoutMs)
  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
    if (!response.ok) {
      throw new HttpError(response.status, `Requête échouée (${response.status})`, url)
    }
    if (response.status === 204) return null
    const text = await response.text()
    return text ? (JSON.parse(text) as T) : null
  } finally {
    dispose()
  }
}
