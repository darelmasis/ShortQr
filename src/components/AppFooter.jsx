import { useNavigate } from 'react-router-dom'
import { Divider, Link } from 'quickit-ui'

export default function AppFooter() {
  const navigate = useNavigate()

  function go(path) {
    return (event) => {
      event.preventDefault()
      navigate(path)
    }
  }

  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="flex max-w-[28ch] flex-col gap-3">
            <Link href="/" onClick={go('/')} className="inline-flex items-center gap-2.5 text-base font-semibold no-underline">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <img src="/favicon.svg" alt="" width="22" height="22" />
              </div>
              <span>ShortQR</span>
            </Link>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Acorta URLs y genera códigos QR al instante. Rápido, gratuito y sin registros innecesarios.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Producto</p>
            <Link href="/" onClick={go('/')} underline="hover" className="text-sm">
              Acortar URL
            </Link>
            <Link href="/enlaces" onClick={go('/enlaces')} underline="hover" className="text-sm">
              Mis enlaces
            </Link>
          </div>
        </div>

        <Divider className="my-6" />

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <p>© {new Date().getFullYear()} ShortQR</p>
          <p>Hecho con quickit-ui</p>
        </div>
      </div>
    </footer>
  )
}
