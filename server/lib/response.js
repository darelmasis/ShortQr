export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...init.headers,
    },
  })
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, error: message }, { status })
}

export function redirectResponse(location) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      'Cache-Control': 'no-store',
    },
  })
}
