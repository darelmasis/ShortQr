import { useSearchParams } from 'react-router-dom'
import { Alert } from 'quickit-ui'
import QuickitWorkspace from '../components/QuickitWorkspace.jsx'

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const authError = searchParams.get('auth') === 'error'
  const leftoverCode = searchParams.get('code')
  const leftoverOAuthError = searchParams.get('error')

  return (
    <div className="flex flex-col items-stretch gap-8 max-sm:max-w-none">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-[clamp(1.625rem,4vw,2.25rem)] font-bold leading-tight tracking-[-0.02em]">
          Acorta tu enlace, genera su <span className="text-neutral-800 dark:text-neutral-200">QR</span>
        </h1>
        <p className="max-w-[42ch] text-pretty text-[0.9375rem] text-neutral-500 dark:text-neutral-400">
          Pega una URL y obtén un enlace corto con su código QR, listo para compartir.
        </p>
      </header>

      {authError && (
        <Alert
          color="danger"
          title="No se pudo completar el inicio de sesión"
          description="Revisa la consola del servidor y que las URIs de redirección estén configuradas. Inténtalo de nuevo."
        />
      )}

      {leftoverCode && (
        <Alert
          color="danger"
          title="Google devolvió el código de acceso a esta página"
          description={
            <>
              En lugar de a <code>/api/auth/callback</code>. Revisa las URIs de redirección autorizadas en Google Cloud Console: deben ser exactamente <code>http://localhost:5173/api/auth/callback</code>.
            </>
          }
        />
      )}

      {leftoverOAuthError && (
        <Alert color="danger" title="Google rechazó el inicio de sesión" description={<code>{leftoverOAuthError}</code>} />
      )}

      <QuickitWorkspace />
    </div>
  )
}
