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

// ── Decision: keep / remove / undecided per photo ────────────────────────────

type Decision = 'keep' | 'remove' | null

function useGroupDecisions(photos: Photo[]) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})

  const toggle = (photoId: string) => {
    setDecisions(prev => {
      const cur = prev[photoId]
      // cycle: null → keep → remove → null
      const next: Decision = cur === null || cur === undefined ? 'keep' : cur === 'keep' ? 'remove' : null
      return { ...prev, [photoId]: next }
    })
  }

  const setAll = (decision: Decision) => {
    const next: Record<string, Decision> = {}
    photos.forEach(p => { next[p.id] = decision })
    setDecisions(next)
  }

  const keepFirst = () => {
    const next: Record<string, Decision> = {}
    photos.forEach((p, i) => { next[p.id] = i === 0 ? 'keep' : 'remove' })
    setDecisions(next)
  }

  const toRemove = photos.filter(p => decisions[p.id] === 'remove').map(p => p.id)
  const allDecided = photos.every(p => decisions[p.id] != null)

  return { decisions, toggle, setAll, keepFirst, toRemove, allDecided }
}

// ── Photo card in a group ─────────────────────────────────────────────────────

interface PhotoCardProps {
  photo: Photo
  decision: Decision
  onToggle: () => void
}

function PhotoCard({ photo, decision, onToggle }: PhotoCardProps) {
  const borderColor = decision === 'keep' ? '#34a853' : decision === 'remove' ? '#ea4335' : '#e0e0e0'
  const overlay = decision === 'keep'
    ? { label: 'KEEP', bg: '#34a853' }
    : decision === 'remove'
    ? { label: 'REMOVE', bg: '#ea4335' }
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div
        onClick={onToggle}
        style={{
          position: 'relative', cursor: 'pointer',
          border: `2px solid ${borderColor}`, borderRadius: 8,
          overflow: 'hidden', width: 130, height: 130,
          background: '#f0f0f0', transition: 'border-color .15s',
        }}
      >
        {photo.base_url ? (
          <img
            src={`${photo.base_url}=w260-h260-c`}
            alt={photo.filename ?? ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '.8rem' }}>
            No preview
          </div>
        )}
        {overlay && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${overlay.bg}33`,
          }}>
            <span style={{
              background: overlay.bg, color: '#fff',
              fontSize: '.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4,
            }}>
              {overlay.label}
            </span>
          </div>
        )}
        {/* Tap hint on undecided */}
        {!overlay && (
          <div style={{
            position: 'absolute', bottom: 4, right: 4,
            background: 'rgba(0,0,0,.4)', color: '#fff',
            fontSize: '.6rem', padding: '2px 5px', borderRadius: 3,
          }}>
            tap to decide
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ fontSize: '.7rem', color: '#666', width: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {photo.filename ?? photo.google_id.slice(0, 10)}
      </div>
      {photo.creation_time && (
        <div style={{ fontSize: '.65rem', color: '#999' }}>
          {new Date(photo.creation_time).toLocaleDateString()}
        </div>
      )}
      <a
        href={GOOGLE_PHOTO_URL(photo.google_id)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{ fontSize: '.7rem', color: '#1a73e8' }}
      >
        Open ↗
      </a>
    </div>
  )
}

// ── Group card ────────────────────────────────────────────────────────────────

interface GroupCardProps {
  group: AnalysisGroup
  onQueuedAndReviewed: () => void
}

function GroupCard({ group, onQueuedAndReviewed }: GroupCardProps) {
  const queryClient = useQueryClient()
  const { decisions, toggle, keepFirst, setAll, toRemove } = useGroupDecisions(group.photos)
  const [submitted, setSubmitted] = useState(false)

  const addMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/queue', { photo_ids: ids, reason: group.group_type }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['analysis', 'summary'] }),
  })

  const reviewMutation = useMutation({
    mutationFn: () => api.patch(`/analysis/groups/${group.id}/reviewed`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis', 'duplicates'] })
      queryClient.invalidateQueries({ queryKey: ['analysis', 'scan-overview'] })
      onQueuedAndReviewed()
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
  const typeLabel = group.group_type === 'exact_duplicate'
    ? '🔁 Exact copy'
    : `👯 Near duplicate (${Math.round((group.similarity ?? 0) * 100)}% similar)`

  return (
    <div style={{
      background: '#fff', border: `1px solid ${isReviewed ? '#a5d6a7' : '#e0e0e0'}`,
      borderRadius: 10, padding: '1rem', marginBottom: '1.5rem',
      opacity: isReviewed ? 0.75 : 1,
    }}>
      {/* Group header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <span style={{ fontSize: '.85rem', color: '#666' }}>{typeLabel}</span>
        {isReviewed ? (
          <span style={{ fontSize: '.8rem', color: '#2e7d32', fontWeight: 500 }}>✅ Reviewed</span>
        ) : (
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={keepFirst}
              style={{ fontSize: '.75rem', padding: '.3rem .6rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #1a73e8', color: '#1a73e8', background: '#fff' }}
            >
              Keep first
            </button>
            <button
              onClick={() => setAll('keep')}
              style={{ fontSize: '.75rem', padding: '.3rem .6rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #34a853', color: '#34a853', background: '#fff' }}
            >
              Keep all
            </button>
            <button
              onClick={() => setAll('remove')}
              style={{ fontSize: '.75rem', padding: '.3rem .6rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #ea4335', color: '#ea4335', background: '#fff' }}
            >
              Remove all
            </button>
          </div>
        )}
      </div>

      {/* Photos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        {group.photos.map(photo => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            decision={isReviewed ? null : (decisions[photo.id] ?? null)}
            onToggle={() => !isReviewed && toggle(photo.id)}
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
          <span style={{ fontSize: '.8rem', color: '#aaa' }}>
            Click photos to toggle keep / remove
          </span>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Duplicates() {
  const [page, setPage] = useState(1)
  const [hideReviewed, setHideReviewed] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<PaginatedGroups>({
    queryKey: ['analysis', 'duplicates', page],
    queryFn: () => api.get(`/analysis/duplicates?page=${page}&page_size=10`),
  })

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1
  const visibleGroups = hideReviewed
    ? (data?.items ?? []).filter(g => !g.reviewed_at)
    : (data?.items ?? [])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
      <NavBar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 1rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <h2 style={{ margin: 0 }}>
          Duplicates {data ? `(${data.total} groups)` : ''}
        </h2>
        <label style={{ fontSize: '.85rem', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <input
            type="checkbox"
            checked={hideReviewed}
            onChange={e => setHideReviewed(e.target.checked)}
          />
          Hide reviewed
        </label>
      </div>

      <p style={{ fontSize: '.85rem', color: '#888', marginBottom: '1.5rem' }}>
        Click photos to toggle <strong style={{ color: '#34a853' }}>KEEP</strong> / <strong style={{ color: '#ea4335' }}>REMOVE</strong>, then confirm your choices per group.
      </p>

      {isLoading && <p>Loading…</p>}

      {visibleGroups.map(group => (
        <GroupCard
          key={group.id}
          group={group}
          onQueuedAndReviewed={() => queryClient.invalidateQueries({ queryKey: ['analysis', 'duplicates', page] })}
        />
      ))}

      {!isLoading && visibleGroups.length === 0 && (
        <p style={{ color: '#aaa' }}>{hideReviewed ? 'All groups reviewed! 🎉' : 'No duplicates found.'}</p>
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
