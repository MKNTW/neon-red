<template>
  <div id="toast-container" aria-live="polite" aria-atomic="true">
    <TransitionGroup name="toast" tag="div">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
        role="alert"
      >
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast } from '../composables/useToast'

const { toasts } = useToast()
</script>

<style scoped>
#toast-container {
  position: fixed;
  top: max(20px, var(--safe-area-inset-top));
  left: 10px;
  right: 10px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  background: rgba(15, 15, 15, 0.98);
  color: var(--text-primary);
  padding: 14px 16px;
  border-radius: 12px;
  border: 2px solid var(--border-color);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  font-size: 0.95rem;
  font-weight: 500;
  pointer-events: auto;
  backdrop-filter: blur(10px);
}

.toast-success {
  border-color: var(--neon-green);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
}

.toast-error {
  border-color: var(--neon-red);
  box-shadow: 0 0 20px rgba(255, 0, 51, 0.3);
}

.toast-info {
  border-color: var(--neon-blue);
  box-shadow: 0 0 20px rgba(0, 153, 255, 0.3);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}
</style>

