import type { Photo } from '../api/types'

interface Props {
  photo: Photo
  selected: boolean
  onToggle: () => void
  googleUrl: string
}

export function PhotoThumb({ photo, selected, onToggle, googleUrl }: Props) {
  return (
    <div
      style={{
        position: 'relative',
        width: 140,
        cursor: 'pointer',
        borderRadius: 6,
        overflow: 'visible',
      }}
    >
      {/* Selection overlay */}
      <div
        onClick={onToggle}
        style={{
          position: 'relative',
          width: 140,
          height: 140,
          borderRadius: 6,
          overflow: 'hidden',
          border: selected ? '3px solid #ea4335' : '3px solid transparent',
          boxSizing: 'border-box',
          background: '#f0f0f0',
        }}
      >
        {photo.base_url ? (
          <img
            src={`${photo.base_url}=w280-h280-c`}
            alt={photo.filename ?? ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '.8rem' }}>
            No preview
          </div>
        )}
        {selected && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(234,67,53,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1.8rem' }}>🗑️</span>
          </div>
        )}
        {/* Checkbox indicator */}
        <div style={{
          position: 'absolute', top: 5, left: 5,
          width: 18, height: 18, borderRadius: '50%',
          background: selected ? '#ea4335' : 'rgba(255,255,255,.8)',
          border: selected ? 'none' : '2px solid rgba(0,0,0,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', color: '#fff',
        }}>
          {selected ? '✓' : ''}
        </div>
      </div>

      {/* Filename + open link */}
      <div style={{ marginTop: 4, fontSize: '.72rem', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {photo.filename ?? photo.google_id.slice(0, 10)}
      </div>
      <a
        href={googleUrl}
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
