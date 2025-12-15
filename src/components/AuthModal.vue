<template>
  <Modal
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :close-on-overlay="true"
    content-class="auth-modal-content"
  >
    <div class="auth-header">
      <h2>{{ isLogin ? 'Вход' : 'Регистрация' }}</h2>
      <p class="auth-subtitle">
        {{ isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт' }}
      </p>
    </div>

    <LoginForm
      v-if="isLogin"
      @success="handleLoginSuccess"
      @switch-to-register="isLogin = false"
      @open-forgot-password="$emit('open-forgot-password')"
    />

    <RegisterForm
      v-else
      @success="handleRegisterSuccess"
      @switch-to-login="isLogin = true"
    />
  </Modal>
</template>

<script setup>
import { ref } from 'vue'
import Modal from './Modal.vue'
import LoginForm from './LoginForm.vue'
import RegisterForm from './RegisterForm.vue'

defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'open-forgot-password', 'success'])

const isLogin = ref(true)

function handleLoginSuccess() {
  emit('success')
  emit('update:modelValue', false)
}

function handleRegisterSuccess() {
  emit('success')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.auth-modal-content {
  max-width: 450px;
}

.auth-header {
  text-align: center;
  margin-bottom: 30px;
}

.auth-header h2 {
  color: var(--neon-red);
  font-size: 1.8rem;
  margin-bottom: 10px;
  font-weight: 900;
  text-shadow: 0 0 10px rgba(255, 0, 51, 0.5);
}

.auth-subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
}
</style>

