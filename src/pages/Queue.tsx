import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { NavBar } from '../components/NavBar'

interface QueuePhoto {
  id: string
  google_id: string
  filename: string | null
  base_url: string | null
  creation_time: string | null
  width: number | null
  height: number | null
}
interface QueueItem { id: string; photo: QueuePhoto; reason: string | null; added_at: string }

const GOOGLE_PHOTO_URL = (googleId: string) =>
  `https://photos.google.com/photo/${googleId}`

export default function Queue() {
  const [albumUrl, setAlbumUrl] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: items = [], isLoading } = useQuery<QueueItem[]>({
    queryKey: ['queue'],
    queryFn: () => api.get('/queue'),
  })

  const removeMutation = useMutation({
    mutationFn: (photoId: string) => api.delete(`/queue/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] })
      queryClient.invalidateQueries({ queryKey: ['analysis', 'summary'] })
    },
  })

  const clearMutation = useMutation({
    mutationFn: () => api.delete('/queue'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] })
      queryClient.invalidateQueries({ queryKey: ['analysis', 'summary'] })
      setAlbumUrl(null)
    },
  })

  const albumMutation = useMutation({
    mutationFn: () => api.post<{ album_url: string; photo_count: number }>('/queue/create-album'),
    onSuccess: (data) => setAlbumUrl(data.album_url),
  })

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
      <NavBar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 1rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <h2 style={{ margin: 0 }}>Deletion queue ({items.length})</h2>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {items.length > 0 && !albumUrl && (
            <button
              onClick={() => albumMutation.mutate()}
              disabled={albumMutation.isPending}
              style={{ background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, padding: '.5rem 1rem', cursor: 'pointer' }}
            >
              {albumMutation.isPending ? 'Creating album…' : '📁 Create "To Delete" album in Google Photos'}
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={() => { if (confirm('Clear entire queue?')) clearMutation.mutate() }}
              disabled={clearMutation.isPending}
              style={{ border: '1px solid #ccc', borderRadius: 4, padding: '.5rem 1rem', cursor: 'pointer', background: '#fff' }}
            >
              Clear queue
            </button>
          )}
        </div>
      </div>

      {albumUrl && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
          <strong>✅ Album created!</strong> Open it in Google Photos, review, then delete from there.{' '}
          <a href={albumUrl} target="_blank" rel="noopener noreferrer">Open album →</a>
          <div style={{ marginTop: '.5rem', fontSize: '.85rem', color: '#555' }}>
            After deleting in Google Photos, click "Clear queue" above to clean up this list.
          </div>
        </div>
      )}

      {albumMutation.isError && (
        <p style={{ color: '#ea4335' }}>Failed to create album: {String(albumMutation.error)}</p>
      )}

      {isLoading && <p>Loading…</p>}
      {!isLoading && items.length === 0 && (
        <p style={{ color: '#888' }}>Queue is empty. Mark photos for deletion from the Duplicates, Bursts, or Quality pages.</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
        {items.map(({ id, photo, reason }) => (
          <div key={id} style={{ position: 'relative' }}>
            {/* Thumbnail */}
            <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: 6, background: '#f0f0f0' }}>
              {photo.base_url ? (
                <img
                  src={`${photo.base_url}=w280-h280-c`}
                  alt={photo.filename ?? ''}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
                  No preview
                </div>
              )}
              {/* Remove button */}
              <button
                onClick={() => removeMutation.mutate(photo.id)}
                title="Remove from queue"
                style={{
                  position: 'absolute', top: 4, right: 4,
                  background: 'rgba(0,0,0,.5)', color: '#fff',
                  border: 'none', borderRadius: '50%',
                  width: 22, height: 22, cursor: 'pointer',
                  fontSize: '14px', lineHeight: '22px', textAlign: 'center', padding: 0,
                }}
              >
                ×
              </button>
            </div>
            {/* Meta */}
            <div style={{ marginTop: '4px', fontSize: '.72rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {photo.filename ?? photo.google_id.slice(0, 12)}
            </div>
            {reason && (
              <div style={{ fontSize: '.65rem', color: '#999' }}>{reason}</div>
            )}
            <a
              href={GOOGLE_PHOTO_URL(photo.google_id)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '.7rem', color: '#1a73e8' }}
            >
              Open ↗
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
