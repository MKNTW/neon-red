import { ref, nextTick } from 'vue'

const toasts = ref([])

export function useToast() {
  function showToast(message, type = 'info', duration = 3000) {
    const id = Date.now() + Math.random()
    const toast = {
      id,
      message,
      type,
      duration
    }

    toasts.value.push(toast)

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  function removeToast(id) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    toasts,
    showToast,
    removeToast
  }
}

