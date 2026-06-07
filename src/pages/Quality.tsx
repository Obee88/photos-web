import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Photo } from '../api/types'
import { NavBar } from '../components/NavBar'
import { PhotoThumb } from '../components/PhotoThumb'

interface QualityItem { photo: Photo; flags: string[] }
interface PaginatedQuality {
  items: QualityItem[]
  total: number
  page: number
  page_size: number
}

const FLAG_LABELS: Record<string, string> = {
  blurry: '🌫️ Blurry',
  underexposed: '🌑 Dark',
  overexposed: '☀️ Bright',
  screenshot: '🖥️ Screenshot',
}

const GOOGLE_PHOTO_URL = (googleId: string) =>
  `https://photos.google.com/photo/${googleId}`

export default function Quality() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<PaginatedQuality>({
    queryKey: ['analysis', 'quality', page],
    queryFn: () => api.get(`/analysis/quality?page=${page}&page_size=40`),
  })

  const addMutation = useMutation({
    mutationFn: (photoIds: string[]) =>
      api.post('/queue', { photo_ids: photoIds, reason: 'quality' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis', 'summary'] })
      setSelected(new Set())
    },
  })

  const toggle = (photoId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(photoId) ? next.delete(photoId) : next.add(photoId)
      return next
    })
  }

  const selectAll = () => {
    if (!data) return
    setSelected(new Set(data.items.map(i => i.photo.id)))
  }

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
      <NavBar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 1rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <h2 style={{ margin: 0 }}>Quality issues {data ? `(${data.total})` : ''}</h2>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button onClick={selectAll} style={{ fontSize: '.85rem', padding: '.4rem .8rem', cursor: 'pointer' }}>
            Select all on page
          </button>
          {selected.size > 0 && (
            <button
              onClick={() => addMutation.mutate(Array.from(selected))}
              disabled={addMutation.isPending}
              style={{ background: '#ea4335', color: '#fff', border: 'none', borderRadius: 4, padding: '.4rem .8rem', cursor: 'pointer' }}
            >
              🗑️ Queue {selected.size}
            </button>
          )}
        </div>
      </div>

      {isLoading && <p>Loading…</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
        {data?.items.map(({ photo, flags }) => (
          <div key={photo.id} style={{ position: 'relative' }}>
            <PhotoThumb
              photo={photo}
              selected={selected.has(photo.id)}
              onToggle={() => toggle(photo.id)}
              googleUrl={GOOGLE_PHOTO_URL(photo.google_id)}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '4px' }}>
              {flags.map(f => (
                <span key={f} style={{
                  fontSize: '.65rem', background: '#f1f3f4', border: '1px solid #e0e0e0',
                  borderRadius: 3, padding: '1px 4px', color: '#444',
                }}>
                  {FLAG_LABELS[f] ?? f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

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
