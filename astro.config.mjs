// @ts-check
import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'
import fs from 'node:fs'

// HTTPS solo en desarrollo (certificado local de mkcert en .cert/).
// Habilita APIs de contexto seguro (portapapeles de imágenes) en la LAN.
function devHttps() {
  const keyPath = '.cert/key.pem'
  const certPath = '.cert/cert.pem'
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) return undefined
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  }
}

const https = devHttps()

export default defineConfig({
  output: 'server',
  adapter: vercel({
    maxDuration: 10,
  }),
  vite: {
    server: https
      ? {
          https,
        }
      : {},
  },
})
