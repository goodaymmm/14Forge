import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

let toastCount = 0
const toasts = new Set<Toast>()
const listeners = new Set<(toasts: Toast[]) => void>()

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_VALUE
  return toastCount.toString()
}

export function toast(props: Omit<Toast, 'id'>) {
  const toast: Toast = {
    ...props,
    id: genId(),
  }
  
  toasts.add(toast)
  listeners.forEach(listener => listener(Array.from(toasts)))
  
  setTimeout(() => {
    toasts.delete(toast)
    listeners.forEach(listener => listener(Array.from(toasts)))
  }, 5000)
  
  return toast.id
}

export function Toaster() {
  const [toastList, setToastList] = useState<Toast[]>([])
  
  useEffect(() => {
    const updateToasts = (newToasts: Toast[]) => {
      setToastList(newToasts)
    }
    
    listeners.add(updateToasts)
    return () => {
      listeners.delete(updateToasts)
    }
  }, [])
  
  const dismiss = (id: string) => {
    const toast = Array.from(toasts).find(t => t.id === id)
    if (toast) {
      toasts.delete(toast)
      listeners.forEach(listener => listener(Array.from(toasts)))
    }
  }
  
  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4">
      {toastList.map(toast => (
        <div
          key={toast.id}
          className={cn(
            "relative flex w-96 items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all",
            toast.variant === 'destructive'
              ? "border-destructive bg-destructive text-destructive-foreground"
              : "border-border bg-background"
          )}
        >
          <div className="flex-1">
            {toast.title && (
              <div className="text-sm font-semibold">{toast.title}</div>
            )}
            {toast.description && (
              <div className="text-sm opacity-90">{toast.description}</div>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="absolute right-2 top-2 rounded-md p-1 opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}