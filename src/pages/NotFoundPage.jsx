import { EmptyState } from 'quickit-ui'
import CreateLinkButton from '../components/CreateLinkButton.jsx'

export default function NotFoundPage() {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <EmptyState
        align="center"
        title="404 · Enlace no encontrado"
        description="El enlace que buscas no existe, fue desactivado o ya expiró."
      />
      <div className="mt-4">
        <CreateLinkButton>Crear un enlace nuevo</CreateLinkButton>
      </div>
    </div>
  )
}
