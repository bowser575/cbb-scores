import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

/* ---------- data loading ---------- */

const cache = new Map<string, { data: unknown; at: number }>()
const STALE_MS = 30_000

interface Resource<T> {
  data: T | undefined
  error: boolean
  reload: () => void
}

/**
 * Fetches `key` with `fetcher` (a null key fetches nothing), serving the last result from memory first so navigating back is instant.
 * `refreshMs(data)` returning a number keeps polling (used while games are live).
 */
export function useResource<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  refreshMs?: (data: T) => number | null,
): Resource<T> {
  const cached = key == null ? undefined : cache.get(key)
  const [state, setState] = useState<{ key: string | null; data: T | undefined; error: boolean }>({
    key,
    data: cached?.data as T | undefined,
    error: false,
  })
  const [nonce, setNonce] = useState(0)
  const fetcherRef = useRef(fetcher)
  const refreshRef = useRef(refreshMs)
  fetcherRef.current = fetcher
  refreshRef.current = refreshMs

  // Reset synchronously when the key changes so stale data from another key never renders.
  if (state.key !== key) {
    setState({ key, data: cached?.data as T | undefined, error: false })
  }

  useEffect(() => {
    if (key == null) return
    let cancelled = false
    let timer: number | undefined

    const run = async () => {
      try {
        const data = await fetcherRef.current()
        if (cancelled) return
        cache.set(key, { data, at: Date.now() })
        setState({ key, data, error: false })
        const next = refreshRef.current?.(data)
        if (next) timer = window.setTimeout(run, next)
      } catch {
        if (cancelled) return
        setState((s) => (s.key === key ? { ...s, error: s.data === undefined } : s))
        // A failed refresh keeps the last data on screen; keep polling so live scores don't freeze.
        const last = cache.get(key)
        const next = last && refreshRef.current?.(last.data as T)
        if (next) timer = window.setTimeout(run, next)
      }
    }

    const entry = cache.get(key)
    if (!entry || Date.now() - entry.at > STALE_MS || nonce > 0) {
      run()
    } else {
      const next = refreshRef.current?.(entry.data as T)
      if (next) timer = window.setTimeout(run, next)
    }

    // Catch up when the tab comes back to the foreground.
    const onVisible = () => {
      const e = cache.get(key)
      if (document.visibilityState === 'visible' && (!e || Date.now() - e.at > STALE_MS)) {
        window.clearTimeout(timer)
        run()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [key, nonce])

  const reload = useCallback(() => {
    setState((s) => ({ ...s, error: false }))
    setNonce((n) => n + 1)
  }, [])

  const current = state.key === key ? state : { data: cached?.data as T | undefined, error: false }
  return { data: current.data, error: current.error, reload }
}

/* ---------- persisted values (the web's UserDefaults) ---------- */

const listeners = new Set<() => void>()

function readStored<T>(name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(name)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function writeStored(name: string, value: unknown) {
  try {
    localStorage.setItem(name, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private mode); the value just won't persist.
  }
  snapshots.delete(name)
  listeners.forEach((l) => l())
}

const snapshots = new Map<string, unknown>()

export function useStored<T>(name: string, fallback: T): [T, (value: T) => void] {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }, [])
  const value = useSyncExternalStore(subscribe, () => {
    if (!snapshots.has(name)) snapshots.set(name, readStored(name, fallback))
    return snapshots.get(name) as T
  })
  const set = useCallback((v: T) => writeStored(name, v), [name])
  return [value, set]
}

/** Teams the user starred. Their games are pinned to the top of Scores. */
export function useFavorites() {
  const [ids, setIds] = useStored<string[]>('favorites', [])
  const has = useCallback((id: string) => ids.includes(id), [ids])
  const toggle = useCallback(
    (id: string) => setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]),
    [ids, setIds],
  )
  return { ids, has, toggle }
}

/* ---------- environment ---------- */

const darkQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

export function useDarkMode(): boolean {
  return useSyncExternalStore(
    (cb) => {
      darkQuery?.addEventListener('change', cb)
      return () => darkQuery?.removeEventListener('change', cb)
    },
    () => darkQuery?.matches ?? false,
  )
}
