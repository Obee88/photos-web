import { useEffect, useState } from 'react'
import type { ScanJob } from '../api/types'

const API_BASE = window.__APP_CONFIG__?.apiUrl ?? import.meta.env.VITE_API_URL ?? ''

export function useScanProgress(jobId: string | null) {
  const [job, setJob] = useState<ScanJob | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!jobId) return
    const es = new EventSource(`${API_BASE}/scan/status/${jobId}`, { withCredentials: true })

    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as ScanJob
      setJob(data)
      if (data.status === 'done' || data.status === 'error') {
        setDone(true)
        es.close()
      }
    }

    es.onerror = () => {
      setDone(true)
      es.close()
    }

    return () => es.close()
  }, [jobId])

  return { job, done }
}
