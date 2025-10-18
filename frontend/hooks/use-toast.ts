"use client"

import * as React from "react"

import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 2
const TOAST_REMOVE_DELAY = 3000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  createdAt?: number
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
  CLEAR_TOASTS: "CLEAR_TOASTS",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return `toast-${count}`
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast> & { id: string }
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["CLEAR_TOASTS"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

const clearToasts = () => {
  toastTimeouts.forEach((timeout, toastId) => {
    clearTimeout(timeout)
  })
  toastTimeouts.clear()
  dispatch({ type: "CLEAR_TOASTS" })
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      // Evitar duplicados por ID
      const existingToastIndex = state.toasts.findIndex(t => t.id === action.toast.id)
      if (existingToastIndex > -1) {
        const updatedToasts = [...state.toasts]
        updatedToasts[existingToastIndex] = { ...updatedToasts[existingToastIndex], ...action.toast }
        return {
          ...state,
          toasts: updatedToasts,
        }
      }

      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        clearToasts()
        return {
          ...state,
          toasts: [],
        }
      }
      
      // Limpiar timeout si existe
      if (toastTimeouts.has(action.toastId)) {
        clearTimeout(toastTimeouts.get(action.toastId))
        toastTimeouts.delete(action.toastId)
      }
      
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }

    case "CLEAR_TOASTS":
      clearToasts()
      return {
        ...state,
        toasts: [],
      }

    default:
      return state
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: Partial<ToasterToast>) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })

  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
      createdAt: Date.now(),
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

// Métodos de conveniencia para tipos comunes de toast
toast.success = (props: Toast) => 
  toast({ ...props, variant: "default" })

toast.error = (props: Toast) => 
  toast({ ...props, variant: "destructive" })

toast.warning = (props: Toast) => 
  toast({ ...props, variant: "default" })

toast.info = (props: Toast) => 
  toast({ ...props, variant: "default" })

toast.loading = (props: Toast) => 
  toast({ ...props, variant: "default" })

toast.promise = async <T,>(
  promise: Promise<T>,
  options: {
    loading: Toast
    success: Toast | ((data: T) => Toast)
    error: Toast | ((error: any) => Toast)
  }
) => {
  const loadingToast = toast.loading(options.loading)

  try {
    const result = await promise
    loadingToast.dismiss()

    const successToast = typeof options.success === 'function' 
      ? options.success(result) 
      : options.success
    toast.success(successToast)

    return result
  } catch (error) {
    loadingToast.dismiss()

    const errorToast = typeof options.error === 'function'
      ? options.error(error)
      : options.error
    toast.error(errorToast)

    throw error
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
    clearAll: () => dispatch({ type: "CLEAR_TOASTS" }),
    update: (toastId: string, props: Partial<ToasterToast>) => 
      dispatch({ type: "UPDATE_TOAST", toast: { ...props, id: toastId } }),
  }
}

// Exportar funciones individuales para uso directo
export { useToast, toast, clearToasts }