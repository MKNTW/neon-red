<template>
  <form @submit.prevent="handleSubmit" class="auth-form">
    <div class="input-group">
      <label for="login-username">Имя пользователя или Email</label>
      <input
        id="login-username"
        v-model="username"
        type="text"
        placeholder="Введите имя пользователя или email"
        required
        autocomplete="username"
        aria-required="true"
      />
    </div>
    <div class="input-group">
      <label for="login-password">Пароль</label>
      <input
        id="login-password"
        v-model="password"
        type="password"
        placeholder="Введите пароль"
        required
        autocomplete="current-password"
        aria-required="true"
      />
    </div>
    <button type="submit" class="auth-btn primary-btn" :disabled="loading">
      {{ loading ? 'Вход...' : 'Войти' }}
    </button>
    <div class="auth-switch">
      <p>
        <a href="#" @click.prevent="$emit('open-forgot-password')" class="forgot-link">
          Забыли пароль?
        </a>
      </p>
      <p style="margin-top: 10px;">
        Нет аккаунта?
        <a href="#" @click.prevent="$emit('switch-to-register')">Зарегистрироваться</a>
      </p>
    </div>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'

const emit = defineEmits(['success', 'switch-to-register', 'open-forgot-password'])

const { login } = useAuth()
const { showToast } = useToast()

const username = ref('')
const password = ref('')
const loading = ref(false)

async function handleSubmit() {
  if (!username.value.trim() || !password.value) {
    showToast('Заполните все поля', 'error')
    return
  }

  loading.value = true
  try {
    const success = await login(username.value.trim(), password.value)
    if (success) {
      emit('success')
      username.value = ''
      password.value = ''
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
}

.input-group input {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.3s;
}

.input-group input:focus {
  outline: none;
  border-color: var(--neon-red);
  box-shadow: 0 0 15px rgba(255, 0, 51, 0.3);
}

.auth-btn {
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}

.primary-btn {
  background: var(--neon-red);
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background: var(--neon-pink);
  box-shadow: 0 0 20px rgba(255, 0, 51, 0.5);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-switch {
  text-align: center;
  margin-top: 10px;
}

.auth-switch p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.auth-switch a {
  color: var(--neon-blue);
  text-decoration: none;
  transition: color 0.3s;
}

.auth-switch a:hover {
  color: var(--neon-red);
}

.forgot-link {
  color: var(--neon-blue);
}
</style>

