import { useEffect, useRef, useState } from 'react'
import type { ScanJob } from '../api/types'

const API_BASE = window.__APP_CONFIG__?.apiUrl ?? import.meta.env.VITE_API_URL ?? ''

const MAX_BACKOFF_MS = 30_000

export function useScanProgress(jobId: string | null) {
  const [job, setJob] = useState<ScanJob | null>(null)
  const [done, setDone] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backoffRef = useRef(1_000)
  const stoppedRef = useRef(false)

  useEffect(() => {
    if (!jobId) return

    stoppedRef.current = false
    backoffRef.current = 1_000

    function connect() {
      if (stoppedRef.current) return

      const es = new EventSource(`${API_BASE}/scan/status/${jobId}`, { withCredentials: true })
      esRef.current = es

      es.onmessage = (e) => {
        backoffRef.current = 1_000 // reset backoff on successful message
        const data = JSON.parse(e.data) as ScanJob
        setJob(data)
        if (data.status === 'done' || data.status === 'error') {
          stoppedRef.current = true
          setDone(true)
          es.close()
        }
      }

      es.onerror = () => {
        es.close()
        if (stoppedRef.current) return
        // Transient error — reconnect with exponential backoff instead of giving up
        const delay = backoffRef.current
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS)
        retryTimerRef.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      stoppedRef.current = true
      esRef.current?.close()
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current)
      }
    }
  }, [jobId])

  return { job, done }
}
