import { useNavigate } from 'react-router-dom'
import {
  Button,
  Dropdown,
  Link,
  Skeleton,
  UserChip,
  cn,
  getInitials,
  useQuickitThemeController,
  useDropdown,
  Tooltip,
} from 'quickit-ui'
import { ChevronIcon, MoonIcon, SunIcon } from './icons.jsx'
import { useAuth } from '../auth.jsx'
import GoogleButton from './GoogleButton.jsx'

function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useQuickitThemeController()

  return (
    <Tooltip content={`${resolvedTheme === 'dark' ? 'Lumos' : 'Nox'}`}>
      <Button
        size="sm"
        variant="ghost"
        shape="circle"
        onClick={toggleTheme}
      >
        {resolvedTheme === 'dark' ? (
          <SunIcon className="size-4" />
        ) : (
          <MoonIcon className="size-4" />
        )}
      </Button>
    </Tooltip>
  )
}

function UserMenuTrigger({ user, ...props }) {
  const { open } = useDropdown()
  return (
    <UserChip
      {...props}
      name={user.name}
      initials={getInitials(user.name)}
      src={user.picture || undefined}
      size="sm"
      className={cn(' cursor-pointer', open && 'bg-neutral-100 dark:bg-neutral-800')}
      trailing={
        <ChevronIcon className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} />
      }
    />
  )
}

export default function AppHeader() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  function go(path) {
    return (event) => {
      event.preventDefault()
      navigate(path)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white/60 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/60">
      <Link href="/" underline="none" onClick={go('/')} aria-label="ShortQR — inicio">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            <img src="/favicon.svg" alt="" width="26" height="26" />
          </div>
          <span className="text-xl font-semibold tracking-tight">ShortQR</span>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        {user && (
          <Link
            href="/enlaces"
            appearance="button"
            onClick={go('/enlaces')}
            underline="none"
            className="px-1 py-0.5 text-sm font-medium"
          >
            Mis enlaces
          </Link>
        )}

        {user ? (
          <Dropdown placement="bottom-end" showArrow>
            <Dropdown.Trigger asChild>
              <UserMenuTrigger user={user} />
            </Dropdown.Trigger>
            <Dropdown.Content>
              <Dropdown.Item as="a" href="/enlaces">
                Mis enlaces
              </Dropdown.Item>
              <Dropdown.Item as="a" href="/">
                Crear enlace
              </Dropdown.Item>
              <Dropdown.Separator />
              <Dropdown.Item onClick={() => void handleLogout()} variant="danger">
                Cerrar sesión
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown>
        ) : loading ? (
          <Skeleton shape="rect" className="h-8 w-24" />
        ) : (
          <GoogleButton compact />
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
