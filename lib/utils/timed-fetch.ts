export function timedFetch(url: string, options?: RequestInit, timeoutMs = 15000): Promise<Response> {
  console.time(`Fetch ${url}`)
  return Promise.resolve()
    .then(() => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeout))
    })
    .then(response => {
      console.timeEnd(`Fetch ${url}`)
      return response
    })
}
