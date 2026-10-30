/** 封装 localStorage 读写 —— 统一 JSON 序列化/错误处理/跨 tab 同步 */
import { useEffect, useRef, useState, useCallback } from 'react'

type LSEvents = { storage: StorageEvent }

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

function safeStringify<T>(val: T): string {
  try { return JSON.stringify(val) } catch { return '' }
}

/**
 * 类似 useState 的 hook，值自动持久化到 localStorage，跨 tab 同步。
 * @param key localStorage key
 * @param fallback 无值/解析失败时的默认值
 */
export function useLocalStorage<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValueState] = useState<T>(() => safeParse<T>(localStorage.getItem(key), fallback))
  const keyRef = useRef(key)

  // key 变化时重新读
  useEffect(() => {
    keyRef.current = key
    setValueState(safeParse<T>(localStorage.getItem(key), fallback))
  }, [key])

  // 跨 tab 同步
  useEffect(() => {
    const handler = (e: LSEvents['storage']) => {
      if (e.key !== keyRef.current) return
      setValueState(safeParse<T>(e.newValue, fallback))
    }
    window.addEventListener('storage', handler as unknown as EventListener)
    return () => window.removeEventListener('storage', handler as unknown as EventListener)
  }, [])

  const setValue = useCallback((v: T | ((prev: T) => T)) => {
    setValueState((prev) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
      try { localStorage.setItem(keyRef.current, safeStringify(next)) } catch { /* quota / disabled */ }
      return next
    })
  }, [])

  const remove = useCallback(() => {
    try { localStorage.removeItem(keyRef.current) } catch { /* ignore */ }
    setValueState(fallback)
  }, [fallback])

  return [value, setValue, remove]
}

/** 一次性读 localStorage(不订阅变化) */
export function readLocalStorage<T>(key: string, fallback: T): T {
  return safeParse<T>(localStorage.getItem(key), fallback)
}

/** 一次性写 localStorage */
export function writeLocalStorage<T>(key: string, value: T): void {
  try { localStorage.setItem(key, safeStringify(value)) } catch { /* quota / disabled */ }
}

/** 一次性删 localStorage */
export function removeLocalStorage(key: string): void {
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}
