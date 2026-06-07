import { Link, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/',            label: '🏠 Dashboard' },
  { to: '/duplicates',  label: '🔁 Duplicates' },
  { to: '/bursts',      label: '📸 Bursts' },
  { to: '/quality',     label: '🌫️ Quality' },
  { to: '/queue',       label: '🗑️ Queue' },
]

export function NavBar() {
  const { pathname } = useLocation()
  return (
    <nav style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap' }}>
      {LINKS.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          style={{
            padding: '.4rem .8rem',
            borderRadius: 4,
            textDecoration: 'none',
            fontSize: '.9rem',
            background: pathname === to ? '#1a73e8' : '#f1f3f4',
            color: pathname === to ? '#fff' : '#333',
            fontWeight: pathname === to ? 600 : 400,
          }}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
