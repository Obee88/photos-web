import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PreScanInfo, ScanOverview } from '../api/types'
import { useAuth } from '../hooks/useAuth'
import ScanProgress from '../components/ScanProgress'

// ── helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

function fmt(n: number) { return n.toLocaleString() }

// ── Pre-scan dialog ───────────────────────────────────────────────────────────

interface PreScanDialogProps {
  info: PreScanInfo
  onChoose: (fullScan: boolean) => void
  onCancel: () => void
}

function PreScanDialog({ info, onChoose, onCancel }: PreScanDialogProps) {
  const hasExisting = info.scanned > 0

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '2rem',
        maxWidth: 480, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,.18)',
      }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Start a new scan</h2>

        {/* Info banner */}
        <div style={{ background: '#f1f3f4', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          {hasExisting ? (
            <>
              <strong>{fmt(info.scanned)}</strong> photos already analyzed
              {info.unanalyzed > 0 && (
                <> · <strong style={{ color: '#f29900' }}>{fmt(info.unanalyzed)}</strong> pending</>
              )}
              {info.last_scan_at && (
                <div style={{ fontSize: '.85rem', color: '#666', marginTop: '.25rem' }}>
                  Last scan: {relativeTime(info.last_scan_at)}
                </div>
              )}
            </>
          ) : (
            <>No photos analyzed yet — this will be your first scan.</>
          )}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '1.25rem' }}>
          <button
            onClick={() => onChoose(false)}
            style={{
              padding: '1rem', borderRadius: 8, border: '2px solid #1a73e8',
              background: '#fff', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 600, color: '#1a73e8', marginBottom: '.25rem' }}>
              ⚡ Scan new photos only
            </div>
            <div style={{ fontSize: '.85rem', color: '#555' }}>
              Fetch and analyze photos added since the last scan.
              {hasExisting && ` Skips the ${fmt(info.scanned)} already analyzed.`}
            </div>
          </button>

          <button
            onClick={() => onChoose(true)}
            style={{
              padding: '1rem', borderRadius: 8, border: '2px solid #e0e0e0',
              background: '#fff', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 600, color: '#333', marginBottom: '.25rem' }}>
              🔄 Re-scan everything
            </div>
            <div style={{ fontSize: '.85rem', color: '#555' }}>
              Re-analyze all photos from scratch.
              {hasExisting && ` Will re-process all ${fmt(info.scanned)} photos — takes longer.`}
            </div>
          </button>
        </div>

        <button
          onClick={onCancel}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '.9rem' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ReviewBadge({ reviewed, total }: { reviewed: number; total: number }) {
  if (total === 0) return <span style={{ fontSize: '.75rem', color: '#aaa' }}>none</span>
  const done = reviewed === total
  return (
    <span style={{
      fontSize: '.75rem', padding: '2px 7px', borderRadius: 10,
      background: done ? '#e8f5e9' : '#fff3e0',
      color: done ? '#2e7d32' : '#e65100',
      fontWeight: 500,
    }}>
      {done ? `✅ all reviewed` : `${reviewed}/${total} reviewed`}
    </span>
  )
}

// ── Scan overview ─────────────────────────────────────────────────────────────

interface ScanOverviewCardProps {
  overview: ScanOverview
  onCreateAlbum: () => void
  albumCreating: boolean
}

function ScanOverviewCard({ overview, onCreateAlbum, albumCreating }: ScanOverviewCardProps) {
  const { last_scan, groups, quality, queue_count } = overview

  const GROUP_ROWS = [
    { key: 'exact_duplicate' as const, label: 'Exact copies', icon: '🔁', href: '/duplicates' },
    { key: 'near_duplicate' as const, label: 'Near duplicates', icon: '👯', href: '/duplicates' },
    { key: 'burst' as const, label: 'Burst groups', icon: '📸', href: '/bursts' },
  ]

  const QUALITY_ROWS = [
    { key: 'blurry' as const, label: 'Blurry', icon: '🌫️' },
    { key: 'bad_exposure' as const, label: 'Bad exposure', icon: '🌑' },
    { key: 'screenshots' as const, label: 'Screenshots', icon: '🖥️' },
  ]

  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, overflow: 'hidden', marginBottom: '2rem' }}>
      {/* Scan header */}
      {last_scan && (
        <div style={{ background: '#f8f9fa', borderBottom: '1px solid #e0e0e0', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
          <div>
            <span style={{ fontWeight: 600 }}>
              {last_scan.is_full_scan ? '🔄 Full scan' : '⚡ Incremental scan'}
            </span>
            {last_scan.finished_at && (
              <span style={{ fontSize: '.85rem', color: '#666', marginLeft: '.75rem' }}>
                {relativeTime(last_scan.finished_at)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '.85rem', color: '#555' }}>
            {last_scan.new_photos > 0 && (
              <span>🆕 <strong>{fmt(last_scan.new_photos)}</strong> new</span>
            )}
            {last_scan.skipped_photos > 0 && (
              <span>⏭️ <strong>{fmt(last_scan.skipped_photos)}</strong> skipped</span>
            )}
          </div>
        </div>
      )}

      {/* Groups table */}
      <div style={{ padding: '1.25rem' }}>
        <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.75rem' }}>
          Groups to review
        </div>
        {GROUP_ROWS.map(({ key, label, icon, href }) => {
          const stat = groups[key]
          if (stat.total === 0) return null
          return (
            <a key={key} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '.6rem .5rem', borderRadius: 6,
                transition: 'background .12s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <span style={{ fontSize: '.95rem' }}>
                  {icon} {label} <strong>({fmt(stat.total)})</strong>
                </span>
                <ReviewBadge reviewed={stat.reviewed} total={stat.total} />
              </div>
            </a>
          )
        })}

        {GROUP_ROWS.every(r => groups[r.key].total === 0) && (
          <p style={{ color: '#aaa', fontSize: '.9rem', margin: '.5rem 0' }}>No duplicate or burst groups found.</p>
        )}

        {/* Quality separator */}
        {quality.total > 0 && (
          <>
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em', margin: '1rem 0 .75rem' }}>
              Quality issues
            </div>
            {QUALITY_ROWS.map(({ key, label, icon }) => {
              const count = quality[key]
              if (count === 0) return null
              return (
                <a key={key} href="/quality" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '.6rem .5rem', borderRadius: 6,
                    transition: 'background .12s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <span style={{ fontSize: '.95rem' }}>{icon} {label}</span>
                    <strong style={{ fontSize: '.9rem' }}>{fmt(count)}</strong>
                  </div>
                </a>
              )
            })}
          </>
        )}
      </div>

      {/* Deletion queue footer */}
      <div style={{ borderTop: '1px solid #e0e0e0', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem' }}>
        <a href="/queue" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span style={{ fontSize: '.95rem' }}>
            🗑️ Deletion queue: <strong>{fmt(queue_count)}</strong> photo{queue_count !== 1 ? 's' : ''}
          </span>
        </a>

        {queue_count > 0 && !last_scan?.album_url && (
          <button
            onClick={onCreateAlbum}
            disabled={albumCreating}
            style={{
              background: '#1a73e8', color: '#fff', border: 'none',
              borderRadius: 6, padding: '.5rem 1rem', cursor: 'pointer', fontSize: '.85rem',
            }}
          >
            {albumCreating ? 'Creating…' : '📁 Create "To Delete" album in Google Photos'}
          </button>
        )}

        {last_scan?.album_url && (
          <a
            href={last_scan.album_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7',
              borderRadius: 6, padding: '.5rem 1rem', fontSize: '.85rem', textDecoration: 'none',
            }}
          >
            ✅ Open "To Delete" album →
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [showDialog, setShowDialog] = useState(false)
  const [scanJobId, setScanJobId] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  // Holds a cancel function for the picker polling loop so it can be
  // torn down if the component unmounts before the user finishes picking.
  const cancelPickerRef = useRef<(() => void) | null>(null)
  useEffect(() => () => { cancelPickerRef.current?.() }, [])

  const { data: overview, isLoading: overviewLoading } = useQuery<ScanOverview>({
    queryKey: ['analysis', 'scan-overview'],
    queryFn: () => api.get('/analysis/scan-overview'),
  })

  const { data: preScanInfo, isLoading: preScanLoading } = useQuery<PreScanInfo>({
    queryKey: ['scan', 'pre-scan-info'],
    queryFn: () => api.get('/scan/pre-scan-info'),
    enabled: showDialog,
  })

  const albumMutation = useMutation({
    mutationFn: () => api.post<{ album_url: string }>('/queue/create-album'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis', 'scan-overview'] })
    },
  })

  const openDialog = () => setShowDialog(true)

  const handleChoose = async (fullScan: boolean) => {
    setShowDialog(false)
    setScanning(true)
    try {
      // 1. Create a Google Photos Picker session
      const { picker_session_id, picker_uri } = await api.post<{
        picker_session_id: string
        picker_uri: string
      }>('/scan/picker-session')

      // 2. Open the picker in a popup for the user to select photos
      const popup = window.open(picker_uri, 'google-photos-picker', 'width=900,height=700')
      if (!popup) {
        throw new Error('Popup was blocked by your browser. Please allow popups for this site and try again.')
      }

      // 3. Poll until the user finishes picking (mediaItemsSet = true)
      const PICKER_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
      await new Promise<void>((resolve, reject) => {
        const deadline = Date.now() + PICKER_TIMEOUT_MS

        const interval = setInterval(async () => {
          // User closed the popup without confirming
          if (popup.closed) {
            clearInterval(interval)
            cancelPickerRef.current = null
            reject(new Error('Photo picker was closed without selecting photos. Please try again.'))
            return
          }
          // Hard timeout
          if (Date.now() > deadline) {
            clearInterval(interval)
            popup.close()
            cancelPickerRef.current = null
            reject(new Error('Picker timed out after 10 minutes. Please try again.'))
            return
          }
          try {
            const status = await api.get<{ media_items_set: boolean }>(
              `/scan/picker-session/${picker_session_id}`
            )
            if (status.media_items_set) {
              clearInterval(interval)
              popup.close()
              cancelPickerRef.current = null
              resolve()
            }
          } catch (err) {
            clearInterval(interval)
            popup.close()
            cancelPickerRef.current = null
            reject(err)
          }
        }, 2000)

        // Expose a cancel path so the useEffect cleanup can abort on unmount
        cancelPickerRef.current = () => {
          clearInterval(interval)
          popup.close()
          reject(new Error('Scan cancelled.'))
        }
      })

      // 4. Start the scan with the picker session
      const job = await api.post<{ id: string }>(
        `/scan/start?picker_session_id=${picker_session_id}&full_scan=${fullScan}`
      )
      setScanJobId(job.id)
    } catch (e: any) {
      alert(e.message)
      setScanning(false)
    }
  }

  const onScanDone = useCallback(() => {
    setScanning(false)
    setScanJobId(null)
    queryClient.invalidateQueries({ queryKey: ['analysis', 'scan-overview'] })
    queryClient.invalidateQueries({ queryKey: ['scan', 'pre-scan-info'] })
  }, [queryClient])

  const hasAnyData = overview && (
    overview.last_scan !== null ||
    Object.values(overview.groups).some(g => g.total > 0) ||
    overview.quality.total > 0 ||
    overview.queue_count > 0
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 680, margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>📷 Photos Cleanup</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          {user?.avatar_url && (
            <img src={user.avatar_url} alt="" width={30} height={30} style={{ borderRadius: '50%' }} />
          )}
          <span style={{ fontSize: '.85rem', color: '#555' }}>{user?.email}</span>
          <button
            style={{ fontSize: '.8rem', padding: '.3rem .6rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' }}
            onClick={() => api.post('/auth/logout').then(() => (window.location.href = '/login'))}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Scan in progress */}
      {scanning && scanJobId && (
        <ScanProgress jobId={scanJobId} onDone={onScanDone} />
      )}

      {/* Overview */}
      {!scanning && (
        <>
          {overviewLoading ? (
            <p style={{ color: '#888' }}>Loading…</p>
          ) : hasAnyData && overview ? (
            <ScanOverviewCard
              overview={overview}
              onCreateAlbum={() => albumMutation.mutate()}
              albumCreating={albumMutation.isPending}
            />
          ) : (
            <div style={{
              background: '#f8f9fa', border: '1px dashed #ccc', borderRadius: 12,
              padding: '3rem', textAlign: 'center', marginBottom: '2rem',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
              <p style={{ color: '#666', margin: '0 0 1.5rem' }}>
                No scans yet. Start a scan to analyze your Google Photos library and find photos to clean up.
              </p>
            </div>
          )}

          {/* Start scan button */}
          {!scanning && (
            <button
              onClick={openDialog}
              style={{
                padding: '.75rem 1.5rem', fontSize: '1rem',
                background: '#1a73e8', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer',
              }}
            >
              {hasAnyData ? '🔍 Start new scan' : '🔍 Start first scan'}
            </button>
          )}
        </>
      )}

      {/* Pre-scan dialog */}
      {showDialog && !preScanLoading && preScanInfo && (
        <PreScanDialog
          info={preScanInfo}
          onChoose={handleChoose}
          onCancel={() => setShowDialog(false)}
        />
      )}
      {showDialog && preScanLoading && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', color: '#555' }}>
            Checking your library…
          </div>
        </div>
      )}

      {/* Build info */}
      <footer style={{ marginTop: '3rem', textAlign: 'center', fontSize: '.75rem', color: '#bbb' }}>
        build: {import.meta.env.VITE_GIT_SHA ?? 'dev'}
      </footer>
    </div>
  )
}
