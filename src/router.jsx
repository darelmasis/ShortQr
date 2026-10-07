import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Skeleton } from 'quickit-ui'
import { useAuth } from './auth.jsx'
import AppFooter from './components/AppFooter.jsx'
import AppHeader from './components/AppHeader.jsx'

const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const LinksPage = lazy(() => import('./pages/LinksPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))

export function PageFallback() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton shape="rect" className="h-6 w-3/4" />
      <Skeleton shape="rect" className="h-6 w-1/2" />
      <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton shape="rect" className="h-96 w-full" />
        <Skeleton shape="rect" className="h-96 w-full" />
      </div>
    </div>
  )
}

export function Layout() {
  return (
    <>
      <AppHeader />
      <main className="page">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <AppFooter />
    </>
  )
}

export function RequireAuth() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton shape="rect" className="h-6 w-1/3" />
        <Skeleton shape="rect" className="h-6 w-1/2" />
        <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Skeleton shape="rect" className="h-28" />
          <Skeleton shape="rect" className="h-28" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route element={<RequireAuth />}>
          <Route path="enlaces" element={<LinksPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
