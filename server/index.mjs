import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore } from './store.mjs'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const DIST = resolve(process.env.DIST ?? join(ROOT, 'dist'))
const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '0.0.0.0'
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? ''
const DATA_DIR = resolve(process.env.DATA_DIR ?? join(ROOT, 'data'))

const store = createStore(join(DATA_DIR, 'store.json'))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolveBody, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('Payload too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) return resolveBody({})
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function isAuthorized(req) {
  if (!AUTH_TOKEN) return true
  const header = req.headers.authorization ?? ''
  return header === `Bearer ${AUTH_TOKEN}`
}

function validSpot(spot) {
  return (
    spot &&
    typeof spot.id === 'string' &&
    spot.id.length > 0 &&
    typeof spot.name === 'string' &&
    spot.coordinates &&
    Number.isFinite(spot.coordinates.lng) &&
    Number.isFinite(spot.coordinates.lat)
  )
}

async function handleApi(req, res, url) {
  const path = url.pathname.replace(/\/+$/, '')
  const method = req.method ?? 'GET'

  if (path === '/api/health') {
    const stats = store.stats()
    return sendJson(res, 200, { ok: true, mode: 'server', ...stats })
  }

  if (!isAuthorized(req)) {
    return sendJson(res, 401, { error: 'Unauthorized' })
  }

  if (path === '/api/spots' && method === 'GET') {
    return sendJson(res, 200, store.listSpots())
  }
  if (path === '/api/spots' && method === 'POST') {
    const body = await readBody(req)
    if (!validSpot(body)) return sendJson(res, 400, { error: 'Spot invalide' })
    return sendJson(res, 201, store.upsertSpot(body))
  }
  const spotMatch = path.match(/^\/api\/spots\/(.+)$/)
  if (spotMatch && method === 'DELETE') {
    store.removeSpot(decodeURIComponent(spotMatch[1]))
    return sendJson(res, 200, { ok: true })
  }

  if (path === '/api/saved' && method === 'GET') {
    return sendJson(res, 200, store.listSaved())
  }
  if (path === '/api/saved' && method === 'POST') {
    const body = await readBody(req)
    if (typeof body.id !== 'string') return sendJson(res, 400, { error: 'id manquant' })
    store.addSaved(body.id)
    return sendJson(res, 201, { ok: true })
  }
  const savedMatch = path.match(/^\/api\/saved\/(.+)$/)
  if (savedMatch && method === 'DELETE') {
    store.removeSaved(decodeURIComponent(savedMatch[1]))
    return sendJson(res, 200, { ok: true })
  }

  return sendJson(res, 404, { error: 'Not found' })
}

const OPENAIP_UPSTREAM = 'https://storage.openaip.net/openaip-system-exports'

async function proxyOpenaip(req, res, url) {
  const upstream = OPENAIP_UPSTREAM + decodeURIComponent(url.pathname).replace(/^\/openaip/, '')
  try {
    const upstreamRes = await fetch(upstream)
    if (!upstreamRes.ok) {
      res.writeHead(upstreamRes.status, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Not found')
      return
    }
    const body = Buffer.from(await upstreamRes.arrayBuffer())
    res.writeHead(200, {
      'Content-Type': upstreamRes.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'public, max-age=3600',
    })
    res.end(body)
  } catch (error) {
    console.warn(`[openaip] proxy error: ${error.message}`)
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Bad gateway')
  }
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/index.html'

  let filePath = normalize(join(DIST, pathname))
  if (!filePath.startsWith(DIST + sep) && filePath !== DIST) {
    res.writeHead(403)
    return res.end('Forbidden')
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    // Missing files with an extension are assets — never fall back to the SPA
    // shell, so a missing worker/bundle fails loudly instead of returning HTML.
    if (extname(pathname) !== '') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      return res.end('Not found')
    }
    filePath = join(DIST, 'index.html')
  }
  if (!existsSync(filePath)) {
    res.writeHead(404)
    return res.end('Build introuvable. Lancez « npm run build ».')
  }

  const type = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  const isAsset = filePath.includes(`${sep}assets${sep}`)
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  createReadStream(filePath).pipe(res)
}

const server = createServer(async (req, res) => {
  setCors(res)
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url)
    } else if (url.pathname.startsWith('/openaip/')) {
      await proxyOpenaip(req, res, url)
    } else {
      serveStatic(req, res, url)
    }
  } catch (error) {
    sendJson(res, 400, { error: error.message })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`AeroSpot FPV — serveur prêt : http://${HOST}:${PORT}`)
  console.log(`  dist   : ${DIST}`)
  console.log(`  data   : ${join(DATA_DIR, 'store.json')}`)
  console.log(`  auth   : ${AUTH_TOKEN ? 'activée (Bearer token)' : 'désactivée'}`)
})

function shutdown() {
  store.flush()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 1000)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
