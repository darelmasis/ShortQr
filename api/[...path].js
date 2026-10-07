import handler from '../server/index.js'

export const config = { runtime: 'nodejs' }

export function GET(request) {
  return handler(request)
}

export function POST(request) {
  return handler(request)
}

export function PATCH(request) {
  return handler(request)
}

export function DELETE(request) {
  return handler(request)
}
