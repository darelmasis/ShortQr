export async function api(path, init) {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(data?.error ?? 'Error de conexión con el servidor')
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}
