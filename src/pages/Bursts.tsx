import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AnalysisGroup } from '../api/types'
import { NavBar } from '../components/NavBar'
import { PhotoThumb } from '../components/PhotoThumb'

interface PaginatedGroups {
  items: AnalysisGroup[]
  total: number
  page: number
  page_size: number
}

const GOOGLE_PHOTO_URL = (googleId: string) =>
  `https://photos.google.com/photo/${googleId}`

export default function Bursts() {
  const [page, setPage] = useState(1)
  const [queued, setQueued] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<PaginatedGroups>({
    queryKey: ['analysis', 'bursts', page],
    queryFn: () => api.get(`/analysis/bursts?page=${page}&page_size=10`),
  })

  const addMutation = useMutation({
    mutationFn: (photoIds: string[]) =>
      api.post('/queue', { photo_ids: photoIds, reason: 'burst' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['analysis', 'summary'] }),
  })

  const toggle = (photoId: string) => {
    setQueued(prev => {
      const next = new Set(prev)
      next.has(photoId) ? next.delete(photoId) : next.add(photoId)
      return next
    })
  }

  const queueAll = (group: AnalysisGroup) => {
    // Keep the first photo (best of burst), queue the rest
    const toQueue = group.photos.slice(1).map(p => p.id)
    addMutation.mutate(toQueue)
  }

  const queueSelected = () => {
    if (queued.size === 0) return
    addMutation.mutate(Array.from(queued))
    setQueued(new Set())
  }

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
      <NavBar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 1rem' }}>
        <h2 style={{ margin: 0 }}>Burst groups {data ? `(${data.total})` : ''}</h2>
        {queued.size > 0 && (
          <button
            onClick={queueSelected}
            disabled={addMutation.isPending}
            style={{ background: '#ea4335', color: '#fff', border: 'none', borderRadius: 4, padding: '.5rem 1rem', cursor: 'pointer' }}
          >
            🗑️ Queue {queued.size} selected
          </button>
        )}
      </div>

      {isLoading && <p>Loading…</p>}

      {data?.items.map(group => (
        <div key={group.id} style={{ marginBottom: '2rem', background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
            <span style={{ fontSize: '.85rem', color: '#888' }}>
              📸 {group.photos.length} photos · {group.photos[0]?.creation_time?.slice(0, 10) ?? ''}
            </span>
            <button
              onClick={() => queueAll(group)}
              disabled={addMutation.isPending}
              style={{ fontSize: '.8rem', padding: '.3rem .7rem', cursor: 'pointer', background: '#fff', border: '1px solid #ccc', borderRadius: 4 }}
            >
              Keep first, queue rest
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {group.photos.map((photo, i) => (
              <div key={photo.id} style={{ position: 'relative' }}>
                {i === 0 && (
                  <div style={{
                    position: 'absolute', top: 4, left: 4, background: '#1a73e8',
                    color: '#fff', fontSize: '.65rem', padding: '2px 5px', borderRadius: 3, zIndex: 1,
                  }}>KEEP</div>
                )}
                <PhotoThumb
                  photo={photo}
                  selected={queued.has(photo.id)}
                  onToggle={() => toggle(photo.id)}
                  googleUrl={GOOGLE_PHOTO_URL(photo.google_id)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

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
