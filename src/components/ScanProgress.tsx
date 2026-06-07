import { useEffect, useState } from 'react'
import { useScanProgress } from '../hooks/useScanProgress'
import type { ScanJob } from '../api/types'

interface Props {
  jobId: string
  onDone: () => void
}

export default function ScanProgress({ jobId, onDone }: Props) {
  const { job, done } = useScanProgress(jobId)

  useEffect(() => {
    if (done) onDone()
  }, [done, onDone])

  if (!job) return <p style={{ color: '#555' }}>Starting scan…</p>

  const pct = job.total > 0 ? Math.round((job.processed / job.total) * 100) : null

  return (
    <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: 8, marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
        <span style={{ fontWeight: 500 }}>
          {job.status === 'error' ? '❌ Scan failed' : job.status === 'done' ? '✅ Scan complete' : `⏳ ${job.phase ?? 'scanning…'}`}
        </span>
        <span style={{ color: '#555', fontSize: '.9rem' }}>
          {job.processed.toLocaleString()} / {job.total > 0 ? job.total.toLocaleString() : '?'} photos
        </span>
      </div>

      <div style={{ background: '#e0e0e0', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 4,
            background: job.status === 'error' ? '#ea4335' : '#1a73e8',
            width: pct != null ? `${pct}%` : '100%',
            transition: 'width .3s ease',
            animation: pct == null ? 'indeterminate 1.4s infinite' : undefined,
          }}
        />
      </div>

      {job.error && <p style={{ color: '#ea4335', marginTop: '.5rem', fontSize: '.9rem' }}>{job.error}</p>}

      <style>{`
        @keyframes indeterminate {
          0%   { transform: translateX(-100%) scaleX(.4); }
          100% { transform: translateX(250%) scaleX(.4); }
        }
      `}</style>
    </div>
  )
}
