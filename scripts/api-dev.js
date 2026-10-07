import { existsSync, statSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const ROOT = process.cwd()
const API_DIR = path.join(ROOT, 'api')
const CACHE_DIR = path.join(ROOT, 'node_modules', '.cache', 'shortqr-api')

function loadDotEnv() {
  const envFile = path.join(ROOT, '.env')
  if (!existsSync(envFile)) return
  const content = readFileSync(envFile, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadDotEnv()

const compiled = new Map()

function apiFileFor(pathname) {
  const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean)
  if (segments[0] !== 'api' || segments.length < 2) return null
  const rest = segments.slice(1)
  for (let i = rest.length; i >= 0; i--) {
    const prefix = rest.slice(0, i)
    const trailing = rest.slice(i)
    const dir = path.join(API_DIR, ...prefix)
    if (trailing.length === 0) {
      const exact = `${path.join(dir)}.js`
      if (existsSync(exact)) return exact
      const index = path.join(dir, 'index.js')
      if (existsSync(index)) return index
    } else if (trailing.length === 1) {
      const dynamic = path.join(dir, '[slug].js')
      if (existsSync(dynamic)) return dynamic
    }
  }
  return null
}

async function loadModule(entry) {
  const stat = statSync(entry)
  const cached = compiled.get(entry)
  if (cached && cached.mtime === stat.mtimeMs) {
    return import(`${pathToFileURL(cached.out).href}?t=${cached.mtime}`)
  }

  const out = path.join(
    CACHE_DIR,
    entry.slice(API_DIR.length + 1).replaceAll('\\', '/').replace(/\.js$/, '.mjs'),
  )
  mkdirSync(path.dirname(out), { recursive: true })

  await build({
    entryPoints: [entry],
    outfile: out,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    packages: 'external',
    logLevel: 'silent',
  })

  compiled.set(entry, { mtime: stat.mtimeMs, out })
  return import(pathToFileURL(out).href)
}

function buildWebRequest(req, overrideUrl) {
  const url = overrideUrl ?? new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const init = {
    method: req.method ?? 'GET',
    headers: req.headers,
  }
  if (req.method === 'GET' || req.method === 'HEAD' || !req.headers['content-length']) {
    return Promise.resolve(new Request(url, init))
  }
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(new Request(url, { ...init, body: Buffer.concat(chunks) })))
  })
}

async function sendResponse(res, response) {
  res.statusCode = response.status
  const cookies = response.headers.getSetCookie()
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') res.setHeader(key, value)
  })
  if (cookies.length > 0) res.setHeader('set-cookie', cookies)
  if (response.body) {
    res.end(Buffer.from(await response.arrayBuffer()))
  } else {
    res.end()
  }
}

async function handle(req, res, next) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const method = (req.method ?? 'GET').toUpperCase()

  try {
    if (url.pathname.startsWith('/api/')) {
      const entry = apiFileFor(url.pathname)
      if (!entry) return next()
      const mod = await loadModule(entry)
      const handler = mod?.[method]
      if (typeof handler !== 'function') {
        res.statusCode = 405
        res.end('Method Not Allowed')
        return
      }
      const response = await handler(await buildWebRequest(req))
      return await sendResponse(res, response)
    }

    const segments = url.pathname.split('/').filter(Boolean)
    if (segments.length === 1) {
      const entry = path.join(API_DIR, 'redirect.js')
      const mod = await loadModule(entry)
      const request = await buildWebRequest(
        req,
        new URL(`/api/redirect?slug=${encodeURIComponent(segments[0])}`, url.origin),
      )
      const response = await mod.GET(request)
      if (response.status === 404) return next()
      return await sendResponse(res, response)
    }

    next()
  } catch (error) {
    console.error('[api-dev]', error)
    res.statusCode = 500
    res.end('Error interno del API de desarrollo')
  }
}

export function apiDev() {
  return {
    name: 'shortqr-api-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(req, res, next)
      })
    },
  }
}
