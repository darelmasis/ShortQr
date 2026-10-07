import { useState } from 'react'
import { Badge, Button, Dropdown, FormControl, Input, Label, Link, toast } from 'quickit-ui'
import { api } from '../lib/api.js'
import { MoreIcon } from './icons.jsx'

const STATUS_META = {
  active: { label: 'Activo', color: 'success' },
  inactive: { label: 'Desactivado', color: 'neutral' },
  expired: { label: 'Expirado', color: 'danger' },
}

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
const dateTimeFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function toDatetimeLocal(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatExpiry(iso) {
  if (!iso) return 'Sin expiración'
  return `Expira el ${dateTimeFmt.format(new Date(iso))}`
}

function computeStatus(active, expiresAt) {
  if (!active) return 'inactive'
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return 'expired'
  return 'active'
}

export default function LinkRow({ link, shortUrl, onDeleted }) {
  const [active, setActive] = useState(link.active)
  const [expiresAt, setExpiresAt] = useState(link.expiresAt)
  const [expiryInput, setExpiryInput] = useState(link.expiresAt ? toDatetimeLocal(link.expiresAt) : '')
  const [panelOpen, setPanelOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const status = computeStatus(active, expiresAt)
  const meta = STATUS_META[status]

  async function copyShort() {
    let ok = false
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shortUrl)
        ok = true
      }
    } catch {}
    toast(ok ? { title: 'Enlace copiado', kind: 'success' } : { title: 'No se pudo copiar el enlace', kind: 'error' })
  }

  async function toggleActive() {
    const next = !active
    setSaving(true)
    try {
      const data = await api(`/api/links/${link.slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: next }),
      })
      setActive(data.link.active)
      toast({ title: next ? 'Enlace activado' : 'Enlace desactivado', kind: 'success' })
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'No se pudo actualizar el enlace', kind: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function saveExpiry(next) {
    setSaving(true)
    try {
      const data = await api(`/api/links/${link.slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ expiresAt: next }),
      })
      setExpiresAt(data.link.expiresAt)
      setPanelOpen(false)
      toast({ title: next ? 'Expiración guardada' : 'Expiración eliminada', kind: 'success' })
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'No se pudo guardar la expiración', kind: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function removeLink() {
    if (!window.confirm('¿Eliminar este enlace? Esta acción no se puede deshacer.')) return

    try {
      await fetch(`/api/links/${link.slug}`, { method: 'DELETE' })
      toast({ title: 'Enlace eliminado', kind: 'success' })
      onDeleted(link.slug)
    } catch {
      toast({ title: 'No se pudo eliminar el enlace', kind: 'error' })
    }
  }

  return (
    <div className="card p-4 transition-shadow duration-150 hover:shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={shortUrl}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            className="font-semibold text-neutral-900 [overflow-wrap:anywhere] dark:text-neutral-100"
          >
            {shortUrl}
          </Link>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400" title={link.url}>
            {link.url}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={meta.color} variant="soft" size="sm">
            {meta.label}
          </Badge>
          <Dropdown placement="bottom-end" usePortal>
            <Dropdown.Trigger asChild>
              <Button size="sm" variant="ghost" shape="circle" aria-label={`Acciones para ${shortUrl}`}>
                <MoreIcon className="size-4" />
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Content>
              <Dropdown.Item onClick={() => void copyShort()}>Copiar enlace</Dropdown.Item>
              <Dropdown.Item onClick={() => void toggleActive()}>{active ? 'Desactivar' : 'Activar'}</Dropdown.Item>
              <Dropdown.Item onClick={() => setPanelOpen((open) => !open)}>Expiración</Dropdown.Item>
              <Dropdown.Separator />
              <Dropdown.Item onClick={() => void removeLink()} variant="danger">
                Eliminar
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          {link.visits} {link.visits === 1 ? 'visita' : 'visitas'}
        </span>
        <span>Creado el {dateFmt.format(new Date(link.createdAt))}</span>
        <span>{formatExpiry(expiresAt)}</span>
      </div>

      {panelOpen && (
        <div className="flex flex-col gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950">
          <FormControl controlId={`expiry-${link.slug}`}>
            <Label htmlFor={`expiry-${link.slug}`}>Fecha de expiración</Label>
            <Input
              id={`expiry-${link.slug}`}
              type="datetime-local"
              size="sm"
              value={expiryInput}
              onChange={(event) => setExpiryInput(event.target.value)}
            />
            <FormControl.Description>
              Al llegar la fecha, el enlace dejará de funcionar y se marcará como expirado.
            </FormControl.Description>
          </FormControl>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="solid"
              color="primary"
              loading={saving}
              onClick={() => void saveExpiry(expiryInput ? new Date(expiryInput).toISOString() : null)}
            >
              Guardar
            </Button>
            <Button size="sm" variant="outline" color="neutral" onClick={() => void saveExpiry(null)}>
              Quitar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
