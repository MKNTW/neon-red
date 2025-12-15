import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Композабл для оптимизации производительности
 */
export function useOptimization() {
  const isVisible = ref(true)
  let visibilityHandler = null
  let intersectionObserver = null

  // Отслеживание видимости страницы для паузы обновлений
  onMounted(() => {
    if (typeof document !== 'undefined') {
      visibilityHandler = () => {
        isVisible.value = !document.hidden
      }
      document.addEventListener('visibilitychange', visibilityHandler)
    }
  })

  onUnmounted(() => {
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
    if (intersectionObserver) {
      intersectionObserver.disconnect()
    }
  })

  /**
   * Lazy loading для изображений через Intersection Observer
   */
  function setupLazyImages(container) {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return
    }

    intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target
          if (img.dataset.src) {
            img.src = img.dataset.src
            img.removeAttribute('data-src')
            intersectionObserver.unobserve(img)
          }
        }
      })
    }, {
      rootMargin: '50px'
    })

    const images = container.querySelectorAll('img[data-src]')
    images.forEach(img => intersectionObserver.observe(img))
  }

  /**
   * Debounce функция для оптимизации частых вызовов
   */
  function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  /**
   * Throttle функция для ограничения частоты вызовов
   */
  function throttle(func, limit) {
    let inThrottle
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  return {
    isVisible,
    setupLazyImages,
    debounce,
    throttle
  }
}

