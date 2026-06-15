import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AnalysisGroup, Photo } from '../api/types'
import { NavBar } from '../components/NavBar'

interface PaginatedGroups {
  items: AnalysisGroup[]
  total: number
  page: number
  page_size: number
}

const GOOGLE_PHOTO_URL = (googleId: string) =>
  `https://photos.google.com/photo/${googleId}`

type Decision = 'keep' | 'remove' | null

// ── Photo card ────────────────────────────────────────────────────────────────

interface BurstPhotoCardProps {
  photo: Photo
  index: number
  decision: Decision
  onToggle: () => void
  disabled: boolean
}

function BurstPhotoCard({ photo, index, decision, onToggle, disabled }: BurstPhotoCardProps) {
  const borderColor = decision === 'keep' ? '#34a853' : decision === 'remove' ? '#ea4335' : '#e0e0e0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div
        onClick={() => !disabled && onToggle()}
        style={{
          position: 'relative', cursor: disabled ? 'default' : 'pointer',
          border: `2px solid ${borderColor}`, borderRadius: 8,
          overflow: 'hidden', width: 110, height: 110,
          background: '#f0f0f0', transition: 'border-color .15s',
        }}
      >
        {photo.base_url ? (
          <img
            src={`${photo.base_url}=w220-h220-c`}
            alt={photo.filename ?? ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '.75rem' }}>
            No preview
          </div>
        )}

        {/* Decision overlay */}
        {decision && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: decision === 'keep' ? '#34a85333' : '#ea433533',
          }}>
            <span style={{
              background: decision === 'keep' ? '#34a853' : '#ea4335',
              color: '#fff', fontSize: '.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4,
            }}>
              {decision === 'keep' ? 'KEEP' : 'REMOVE'}
            </span>
          </div>
        )}

        {/* Photo index badge */}
        <div style={{
          position: 'absolute', top: 4, left: 4,
          background: 'rgba(0,0,0,.45)', color: '#fff',
          fontSize: '.6rem', padding: '1px 5px', borderRadius: 3,
        }}>
          #{index + 1}
        </div>
      </div>
      <div style={{ fontSize: '.68rem', color: '#666', width: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {photo.filename ?? photo.google_id.slice(0, 10)}
      </div>
      {photo.creation_time && (
        <div style={{ fontSize: '.63rem', color: '#999' }}>
          {new Date(photo.creation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      )}
      <a
        href={GOOGLE_PHOTO_URL(photo.google_id)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{ fontSize: '.68rem', color: '#1a73e8' }}
      >
        Open ↗
      </a>
    </div>
  )
}

// ── Group card ────────────────────────────────────────────────────────────────

interface BurstGroupCardProps {
  group: AnalysisGroup
  onReviewed: () => void
}

function BurstGroupCard({ group, onReviewed }: BurstGroupCardProps) {
  const queryClient = useQueryClient()
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => {
    // Default: keep first, remove the rest
    const d: Record<string, Decision> = {}
    group.photos.forEach((p, i) => { d[p.id] = i === 0 ? 'keep' : 'remove' })
    return d
  })
  const [submitted, setSubmitted] = useState(false)

  const toggle = (photoId: string) => {
    setDecisions(prev => {
      const cur = prev[photoId]
      const next: Decision = cur === 'keep' ? 'remove' : 'keep'
      return { ...prev, [photoId]: next }
    })
  }

  const toRemove = group.photos.filter(p => decisions[p.id] === 'remove').map(p => p.id)

  const addMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/queue', { photo_ids: ids, reason: 'burst' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['analysis', 'summary'] }),
  })

  const reviewMutation = useMutation({
    mutationFn: () => api.patch(`/analysis/groups/${group.id}/reviewed`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis', 'bursts'] })
      queryClient.invalidateQueries({ queryKey: ['analysis', 'scan-overview'] })
      onReviewed()
    },
  })

  const handleApply = async () => {
    if (toRemove.length > 0) {
      await addMutation.mutateAsync(toRemove)
    }
    await reviewMutation.mutateAsync()
    setSubmitted(true)
  }

  const isReviewed = !!group.reviewed_at || submitted
  const date = group.photos[0]?.creation_time?.slice(0, 10) ?? ''

  return (
    <div style={{
      background: '#fff', border: `1px solid ${isReviewed ? '#a5d6a7' : '#e0e0e0'}`,
      borderRadius: 10, padding: '1rem', marginBottom: '1.5rem',
      opacity: isReviewed ? 0.75 : 1,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <span style={{ fontSize: '.85rem', color: '#666' }}>
          📸 {group.photos.length} photos in burst{date ? ` · ${date}` : ''}
        </span>
        {isReviewed ? (
          <span style={{ fontSize: '.8rem', color: '#2e7d32', fontWeight: 500 }}>✅ Reviewed</span>
        ) : (
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button
              onClick={() => setDecisions(Object.fromEntries(group.photos.map((p, i) => [p.id, i === 0 ? 'keep' : 'remove'])))}
              style={{ fontSize: '.75rem', padding: '.3rem .6rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #1a73e8', color: '#1a73e8', background: '#fff' }}
            >
              Keep first
            </button>
            <button
              onClick={() => setDecisions(Object.fromEntries(group.photos.map(p => [p.id, 'keep'])))}
              style={{ fontSize: '.75rem', padding: '.3rem .6rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #34a853', color: '#34a853', background: '#fff' }}
            >
              Keep all
            </button>
          </div>
        )}
      </div>

      {/* Photos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', marginBottom: '.75rem' }}>
        {group.photos.map((photo, i) => (
          <BurstPhotoCard
            key={photo.id}
            photo={photo}
            index={i}
            decision={isReviewed ? null : (decisions[photo.id] ?? null)}
            onToggle={() => toggle(photo.id)}
            disabled={isReviewed}
          />
        ))}
      </div>

      {/* Actions */}
      {!isReviewed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', paddingTop: '.75rem', borderTop: '1px solid #f0f0f0' }}>
          <button
            onClick={handleApply}
            disabled={addMutation.isPending || reviewMutation.isPending}
            style={{
              padding: '.45rem 1rem', borderRadius: 6, cursor: 'pointer', fontSize: '.85rem',
              background: toRemove.length > 0 ? '#ea4335' : '#34a853',
              color: '#fff', border: 'none',
            }}
          >
            {addMutation.isPending || reviewMutation.isPending
              ? 'Saving…'
              : toRemove.length > 0
              ? `🗑️ Queue ${toRemove.length} for removal & mark reviewed`
              : '✅ Mark as reviewed (keep all)'}
          </button>
          <span style={{ fontSize: '.8rem', color: '#aaa' }}>Click photos to toggle keep / remove</span>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Bursts() {
  const [page, setPage] = useState(1)
  const [hideReviewed, setHideReviewed] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<PaginatedGroups>({
    queryKey: ['analysis', 'bursts', page],
    queryFn: () => api.get(`/analysis/bursts?page=${page}&page_size=10`),
  })

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1
  const visibleGroups = hideReviewed
    ? (data?.items ?? []).filter(g => !g.reviewed_at)
    : (data?.items ?? [])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
      <NavBar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 1rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <h2 style={{ margin: 0 }}>Burst groups {data ? `(${data.total})` : ''}</h2>
        <label style={{ fontSize: '.85rem', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <input type="checkbox" checked={hideReviewed} onChange={e => setHideReviewed(e.target.checked)} />
          Hide reviewed
        </label>
      </div>

      <p style={{ fontSize: '.85rem', color: '#888', marginBottom: '1.5rem' }}>
        Defaults to keeping the first photo. Click photos to flip keep / remove decisions, then confirm per group.
      </p>

      {isLoading && <p>Loading…</p>}

      {visibleGroups.map(group => (
        <BurstGroupCard
          key={group.id}
          group={group}
          onReviewed={() => queryClient.invalidateQueries({ queryKey: ['analysis', 'bursts', page] })}
        />
      ))}

      {!isLoading && visibleGroups.length === 0 && (
        <p style={{ color: '#aaa' }}>{hideReviewed ? 'All bursts reviewed! 🎉' : 'No burst groups found.'}</p>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginTop: '1.5rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</button>
          <span style={{ fontSize: '.9rem' }}>Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
        </div>
      )}
    </div>
  )
}
