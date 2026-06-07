import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AnalysisSummary } from '../api/types'
import { useAuth } from '../hooks/useAuth'
import ScanProgress from '../components/ScanProgress'

export default function Dashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [scanJobId, setScanJobId] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const { data: summary, isLoading: summaryLoading } = useQuery<AnalysisSummary>({
    queryKey: ['analysis', 'summary'],
    queryFn: () => api.get('/analysis/summary'),
  })

  const startScan = async () => {
    setScanning(true)
    try {
      const job = await api.post<{ id: string }>('/scan/start')
      setScanJobId(job.id)
    } catch (e: any) {
      alert(e.message)
      setScanning(false)
    }
  }

  const onScanDone = useCallback(() => {
    setScanning(false)
    setScanJobId(null)
    queryClient.invalidateQueries({ queryKey: ['analysis', 'summary'] })
  }, [queryClient])

  const CARDS = [
    { label: 'Exact duplicates', key: 'exact_duplicates' as const, href: '/duplicates', icon: '🔁' },
    { label: 'Near duplicates',  key: 'near_duplicates'  as const, href: '/duplicates', icon: '👯' },
    { label: 'Burst groups',     key: 'bursts'           as const, href: '/bursts',     icon: '📸' },
    { label: 'Blurry',           key: 'blurry'           as const, href: '/quality',    icon: '🌫️' },
    { label: 'Bad exposure',     key: 'bad_exposure'     as const, href: '/quality',    icon: '🌑' },
    { label: 'Screenshots',      key: 'screenshots'      as const, href: '/quality',    icon: '🖥️' },
    { label: 'In queue',         key: 'deletion_queue'   as const, href: '/queue',      icon: '🗑️' },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>📷 Photos Cleanup</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          {user?.avatar_url && (
            <img src={user.avatar_url} alt="" width={32} height={32} style={{ borderRadius: '50%' }} />
          )}
          <span style={{ fontSize: '.9rem', color: '#555' }}>{user?.email}</span>
          <button
            style={{ fontSize: '.85rem', padding: '.3rem .7rem', cursor: 'pointer' }}
            onClick={() => api.post('/auth/logout').then(() => (window.location.href = '/login'))}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Summary cards */}
      {summaryLoading ? (
        <p style={{ color: '#555' }}>Loading…</p>
      ) : summary ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {CARDS.map(({ label, key, href, icon }) => (
            <a key={key} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8,
                padding: '1rem', textAlign: 'center', cursor: 'pointer',
                transition: 'box-shadow .15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.12)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
              >
                <div style={{ fontSize: '1.4rem' }}>{icon}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1a73e8', lineHeight: 1.2 }}>
                  {summary[key]}
                </div>
                <div style={{ fontSize: '.8rem', color: '#666', marginTop: '.25rem' }}>{label}</div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p style={{ color: '#888', marginBottom: '2rem' }}>No scan data yet.</p>
      )}

      {/* Scan button / progress */}
      {scanning && scanJobId ? (
        <ScanProgress jobId={scanJobId} onDone={onScanDone} />
      ) : (
        <button
          disabled={scanning}
          onClick={startScan}
          style={{
            padding: '.75rem 1.5rem', fontSize: '1rem',
            background: '#1a73e8', color: '#fff',
            border: 'none', borderRadius: 4, cursor: 'pointer',
          }}
        >
          {scanning ? 'Starting…' : 'Start scan'}
        </button>
      )}
    </div>
  )
}
