export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

type Listener = (items: ToastItem[]) => void

let _items: ToastItem[] = []
let _nextId = 1
const _listeners = new Set<Listener>()

function _notify() {
  for (const fn of _listeners) fn([..._items])
}

function _add(type: ToastType, message: string, duration = 3200) {
  const id = _nextId++
  _items = [..._items, { id, type, message }]
  _notify()
  setTimeout(() => {
    _items = _items.filter((t) => t.id !== id)
    _notify()
  }, duration)
}

export const toast = {
  success: (msg: string) => _add('success', msg),
  error:   (msg: string) => _add('error',   msg),
  info:    (msg: string) => _add('info',     msg),
}

export function subscribeToasts(fn: Listener): () => void {
  _listeners.add(fn)
  fn([..._items])
  return () => _listeners.delete(fn)
}
