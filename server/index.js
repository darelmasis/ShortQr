import * as create from './create.js'
import * as redirect from './redirect.js'
import * as stats from './stats.js'
import * as links from './links/index.js'
import * as link from './links/[slug].js'
import * as authMe from './auth/me.js'
import * as authLogout from './auth/logout.js'
import * as authLogin from './auth/login.js'
import * as authCallback from './auth/callback.js'

const routes = {
  'create': create,
  'redirect': redirect,
  'stats': stats,
  'links': links,
  'auth/me': authMe,
  'auth/logout': authLogout,
  'auth/login': authLogin,
  'auth/callback': authCallback,
}

export default async function handler(request) {
  const url = new URL(request.url)
  const routePath = url.pathname.replace(/^\/api\/?/, '')
  const dynamicLinkMatch = routePath.match(/^links\/([^/]+)$/)
  const route = dynamicLinkMatch ? link : routes[routePath]
  const method = request.method.toUpperCase()
  const routeHandler = route?.[method]

  if (typeof routeHandler !== 'function') {
    return new Response(
      route ? 'Method Not Allowed' : 'Not Found',
      { status: route ? 405 : 404 },
    )
  }

  return routeHandler(request)
}
