import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, EmptyState, Skeleton } from 'quickit-ui'
import CreateLinkButton from '../components/CreateLinkButton.jsx'
import LinkRow from '../components/LinkRow.jsx'
import { useAuth } from '../auth.jsx'
import { api } from '../lib/api.js'

export default function LinksPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [links, setLinks] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/')
      return
    }

    api('/api/links')
      .then((data) => setLinks(data.links))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al cargar los enlaces')
        setLinks([])
      })
  }, [authLoading, user, navigate])

  function handleDeleted(slug) {
    setLinks((current) => (current ? current.filter((link) => link.slug !== slug) : current))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Mis enlaces</h1>
        <CreateLinkButton>Crear enlace</CreateLinkButton>
      </div>

      {error && <Alert color="danger" title="No se pudieron cargar los enlaces" description={error} dismissible onDismiss={() => setError(null)} />}

      {!links && !error && (
        <div className="flex flex-col gap-3">
          <Skeleton shape="rect" className="h-28" />
          <Skeleton shape="rect" className="h-28" />
        </div>
      )}

      {links && links.length === 0 && !error && (
        <div className="card p-6">
          <EmptyState
            align="center"
            title="Aún no has creado enlaces"
            description="Cuando acortes una URL o generes un QR aparecerá aquí para que lo administres."
          />
        </div>
      )}

      {links && links.length > 0 && (
        <ul className="flex flex-col gap-3">
          {links.map((link) => (
            <li key={link.slug}>
              <LinkRow link={link} shortUrl={`${window.location.origin}/${link.slug}`} onDeleted={handleDeleted} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
