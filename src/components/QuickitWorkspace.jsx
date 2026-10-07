import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  Alert,
  Button,
  DatePicker,
  FormControl,
  Input,
  Label,
  Link,
  Modal,
  ModalAction,
  ModalActions,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalTitle,
  Radio,
  cn,
  toast,
} from 'quickit-ui'
import { useAuth } from '../auth.jsx'
import { api } from '../lib/api.js'
import GoogleButton from './GoogleButton.jsx'
import { CopyIcon } from './icons.jsx'

const DISPLAY_PX = 300
const PNG_PX = 1024
const QR_MARGIN = 2
const QR_COLOR = '#000000'

const responsiveFull = 'min-w-[160px] max-[520px]:w-full'

function renderQr(text, pixelSize) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'L' })
  const modules = qr.modules.size
  const unit = Math.floor(pixelSize / (modules + QR_MARGIN * 2))
  const size = unit * (modules + QR_MARGIN * 2)

  const target = document.createElement('canvas')
  target.width = size
  target.height = size

  const ctx = target.getContext('2d')
  if (!ctx) return target

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = QR_COLOR

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (qr.modules.get(row, col)) {
        ctx.fillRect((col + QR_MARGIN) * unit, (row + QR_MARGIN) * unit, unit, unit)
      }
    }
  }

  return target
}

function renderSvg(text) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'L' })
  const modules = qr.modules.size
  const total = modules + QR_MARGIN * 2
  let cells = ''
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (qr.modules.get(row, col)) {
        cells += `<rect x="${col + QR_MARGIN}" y="${row + QR_MARGIN}" width="1" height="1"/>`
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><g fill="${QR_COLOR}">${cells}</g></svg>`
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {}
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  } catch {
    return false
  }
}

async function copyImage(blob) {
  try {
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      return true
    }
  } catch {}
  return false
}

export default function QuickitWorkspace() {
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState(null)
  const [mode, setMode] = useState('short')
  const [loading, setLoading] = useState(false)
  const [urlError, setUrlError] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [result, setResult] = useState(null)
  const [duplicate, setDuplicate] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!result || !canvasRef.current) return
    const rendered = renderQr(result.shortUrl, DISPLAY_PX)
    const canvas = canvasRef.current
    canvas.width = rendered.width
    canvas.height = rendered.height
    canvas.getContext('2d')?.drawImage(rendered, 0, 0)
  }, [result])

  useEffect(() => {
    if (!result) return
  }, [result])

  function handleSubmit(event) {
    event.preventDefault()
    setApiError(null)

    const raw = url.trim()
    if (raw.length === 0) {
      setUrlError('Escribe una URL para continuar.')
      return
    }

    let target = raw
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`
    try {
      new URL(target)
    } catch {
      setUrlError('La URL no es válida. Revisa el formato, por ejemplo: https://ejemplo.com')
      return
    }

    const guestMode = !user

    if (mode === 'direct' || guestMode) {
      setResult({ shortUrl: target, slug: '' })
      return
    }

    const expires = expiresAt ? new Date(expiresAt).setHours(23, 59, 59, 999) : null

    setLoading(true)
    void (async () => {
      try {
        const data = await api('/api/create', {
          method: 'POST',
          body: JSON.stringify({
            url: target,
            expiresAt: expires ? new Date(expires).toISOString() : null,
          }),
        })
        setResult({ shortUrl: data.shortUrl, slug: data.slug })
      } catch (err) {
        if (err?.status === 409 && err?.data?.exists) {
          setDuplicate({ ...err.data.existing, requestedUrl: target, requestedExpiresAt: expires })
        } else {
          setApiError(
            err instanceof Error
              ? err.message
              : 'No se pudo crear el enlace. Intenta de nuevo en unos segundos.',
          )
        }
      } finally {
        setLoading(false)
      }
    })()
  }

  function reset() {
    setResult(null)
    setUrl('')
    setExpiresAt(null)
    setDuplicate(null)
    setUrlError(null)
    setApiError(null)
  }

  async function reuseExisting() {
    if (!duplicate) return
    setLoading(true)
    try {
      const expires = duplicate.requestedExpiresAt
      if (expires) {
        await api(`/api/links/${duplicate.slug}`, {
          method: 'PATCH',
          body: JSON.stringify({ expiresAt: new Date(expires).toISOString() }),
        })
      }
      setResult({ shortUrl: duplicate.shortUrl, slug: duplicate.slug })
      toast({ title: 'Enlace reutilizado', kind: 'success' })
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'No se pudo reutilizar el enlace.',
        kind: 'error',
      })
    } finally {
      setLoading(false)
      setDuplicate(null)
    }
  }

  function cancelReuse() {
    setDuplicate(null)
  }

  async function copyShort() {
    if (!result) return
    const ok = await copyText(result.shortUrl)
    toast(
      ok
        ? { title: 'Enlace copiado', kind: 'success' }
        : { title: 'No se pudo copiar el enlace', kind: 'error' },
    )
  }

  async function copyPng() {
    if (!result) return
    const rendered = renderQr(result.shortUrl, PNG_PX)
    rendered.toBlob(async (blob) => {
      if (!blob) {
        toast({ title: 'No se pudo copiar el QR', kind: 'error' })
        return
      }
      const ok = await copyImage(blob)
      toast(
        ok
          ? { title: 'QR copiado', kind: 'success' }
          : { title: 'No se pudo copiar el QR', kind: 'error' },
      )
    }, 'image/png')
  }

  async function copySvg() {
    if (!result) return
    const ok = await copyText(renderSvg(result.shortUrl))
    toast(
      ok
        ? { title: 'QR copiado', kind: 'success' }
        : { title: 'No se pudo copiar el QR', kind: 'error' },
    )
  }

  const guestPreview = !user && result

  return (
    <>
      <form
        className="card p-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="flex flex-col gap-5">
          <FormControl controlId="url-input" invalid={urlError !== null} required>
            <Label htmlFor="url-input">URL a acortar</Label>
            <Input
              id="url-input"
              name="url"
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="Pega tu URL aquí, por ejemplo: https://ejemplo.com"
              invalid={urlError !== null}
              value={url}
              onChange={(event) => {
                setUrl(event.target.value)
                if (urlError) setUrlError(null)
              }}
            />
            <FormControl.Description>
              Pega la URL completa; el protocolo https:// se añade automáticamente si falta.
            </FormControl.Description>
            {urlError && <FormControl.Message>{urlError}</FormControl.Message>}
          </FormControl>

          <div
            className="flex flex-wrap items-center gap-4"
            role="radiogroup"
            aria-labelledby="mode-label"
          >
            <span
              id="mode-label"
              className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
            >
              Modo
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <Radio
                name="qr-mode"
                value="short"
                label="Acortar + QR"
                checked={mode === 'short'}
                onChange={() => setMode('short')}
              />
              <Radio
                name="qr-mode"
                value="direct"
                label="QR directo"
                checked={mode === 'direct'}
                onChange={() => setMode('direct')}
              />
            </div>
          </div>

          {mode === 'short' && user && (
            <FormControl controlId="expires-input">
              <Label htmlFor="expires-input">Expiración (opcional)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <DatePicker
                  id="expires-input"
                  name="expiresAt"
                  dateStyle="long"
                  minDate={new Date()}
                  value={expiresAt}
                  onChange={setExpiresAt}
                />
                {expiresAt && (
                  <Button
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    onClick={() => setExpiresAt(null)}
                  >
                    Quitar fecha
                  </Button>
                )}
              </div>
              <FormControl.Description>
                El enlace dejará de redirigir al finalizar el día elegido.
              </FormControl.Description>
            </FormControl>
          )}

          {apiError && (
            <Alert
              color="danger"
              title="No se pudo crear el enlace"
              description={apiError}
              dismissible
              onDismiss={() => setApiError(null)}
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              color="primary"
              variant="solid"
              loading={loading}
              loadingText="Generando…"
              className={cn('max-[520px]:w-full')}
            >
              Generar
            </Button>
            {result && (
              <Button type="button" variant="outline" color="neutral" onClick={reset}>
                Empezar nuevo
              </Button>
            )}
          </div>
        </div>

        {result && (
          <section className="flex flex-col gap-4 self-start" aria-live="polite">
            <div className="flex flex-wrap items-center gap-3 max-[520px]:flex-col max-[520px]:items-stretch">
              <Link
                href={result.shortUrl}
                target="_blank"
                rel="noreferrer"
                underline="hover"
                className="min-w-0 flex-1 font-semibold text-neutral-900 [overflow-wrap:anywhere] dark:text-neutral-100"
              >
                {result.shortUrl}
              </Link>
              <Button
                type="submit"
                variant="outline"
                color="primary"
                onClick={() => void copyShort()}
              >
                <CopyIcon className="size-4" />
                Copiar
              </Button>
            </div>

            <div className="flex flex-row items-center justify-center gap-5 max-[520px]:flex-col">
              <div className="relative isolate h-[220px] w-[220px] shrink-0 rounded-[--radius-card] border border-neutral-200 bg-white p-3 shadow-sm max-[520px]:h-[180px] max-[520px]:w-[180px] dark:border-neutral-800 dark:bg-neutral-950">
                <canvas
                  className="block h-full w-full"
                  ref={canvasRef}
                  role="img"
                  aria-label="Código QR del enlace"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  variant="outline"
                  color="neutral"
                  onClick={() => void copyPng()}
                  className={cn(responsiveFull)}
                >
                  <CopyIcon className="size-4" />
                  Copiar PNG
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  color="neutral"
                  onClick={() => void copySvg()}
                  className={cn(responsiveFull)}
                >
                  <CopyIcon className="size-4" />
                  Copiar SVG
                </Button>
              </div>
            </div>
          </section>
        )}

        {guestPreview && (
          <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <p className="mb-2 max-w-[48ch] text-xs text-neutral-600 dark:text-neutral-400">
              Regístrate con Google para acortar enlaces, ver visitas y estadísticas.
            </p>
            <GoogleButton compact />
          </div>
        )}
      </form>

      <Modal
        open={duplicate !== null}
        onOpenChange={(open) => {
          if (!open) cancelReuse()
        }}
        showCloseButton
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Ya existe un enlace corto para esta URL</ModalTitle>
          </ModalHeader>
          <ModalBody>
            {duplicate && (
              <div className="flex flex-col gap-3 text-sm text-neutral-600 dark:text-neutral-300">
                <p>
                  Este enlace ya fue acortado previamente:{' '}
                  <Link
                    href={duplicate.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                    className="font-semibold text-neutral-900 dark:text-neutral-100"
                  >
                    {duplicate.shortUrl}
                  </Link>
                </p>
                <p>
                  Creado el{' '}
                  <time dateTime={duplicate.createdAt}>
                    {new Date(duplicate.createdAt).toLocaleDateString()}
                  </time>{' '}
                  · {duplicate.visits} visitas.
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  Al reutilizarlo se mantendrá el <strong>mismo enlace corto</strong>; los
                  visitantes que usaron el anterior seguirán llegando a la URL original. La
                  expiración que acabas de seleccionar remplazará a la anterior.
                </p>
              </div>
            )}
          </ModalBody>
          <ModalActions>
            <ModalAction
              type="button"
              variant="solid"
              color="primary"
              onClick={() => void reuseExisting()}
            >
              Reusar este enlace
            </ModalAction>
            <ModalAction type="button" variant="outline" color="neutral" onClick={cancelReuse}>
              Cancelar
            </ModalAction>
          </ModalActions>
        </ModalContent>
      </Modal>
    </>
  )
}
