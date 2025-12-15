<template>
  <form @submit.prevent="handleSubmit" class="auth-form register-form-steps">
    <!-- Шаг 1: Имя пользователя -->
    <div v-if="currentStep === 1" class="register-step">
      <StepIndicator :current-step="1" :total-steps="5" />
      <div class="input-group">
        <label for="register-username">Имя пользователя</label>
        <input
          id="register-username"
          v-model="registerData.username"
          type="text"
          placeholder="Введите имя пользователя"
          required
          autocomplete="username"
          @keyup.enter="nextStep"
        />
        <div v-if="errors.username" class="input-error">{{ errors.username }}</div>
      </div>
      <button type="button" @click="nextStep" class="auth-btn primary-btn">
        Далее
      </button>
    </div>

    <!-- Шаг 2: Email -->
    <div v-if="currentStep === 2" class="register-step">
      <StepIndicator :current-step="2" :total-steps="5" />
      <div class="input-group">
        <label for="register-email">Email</label>
        <input
          id="register-email"
          v-model="registerData.email"
          type="email"
          placeholder="Введите email"
          required
          autocomplete="email"
          @keyup.enter="nextStep"
        />
        <div v-if="errors.email" class="input-error">{{ errors.email }}</div>
      </div>
      <div class="step-buttons">
        <button type="button" @click="prevStep" class="auth-btn secondary-btn">
          Назад
        </button>
        <button type="button" @click="nextStep" class="auth-btn primary-btn">
          Далее
        </button>
      </div>
    </div>

    <!-- Шаг 3: Код подтверждения -->
    <div v-if="currentStep === 3" class="register-step">
      <StepIndicator :current-step="3" :total-steps="5" />
      <div class="input-group">
        <label for="register-code">Код подтверждения</label>
        <p class="verification-hint">
          Мы отправили код подтверждения на <strong>{{ pendingEmail }}</strong>
        </p>
        <input
          id="register-code"
          v-model="registerData.code"
          type="text"
          placeholder="Введите 6-значный код"
          maxlength="6"
          pattern="[0-9]{6}"
          autocomplete="one-time-code"
          @keyup.enter="confirmCode"
        />
        <div v-if="errors.code" class="input-error">{{ errors.code }}</div>
      </div>
      <div class="step-buttons">
        <button type="button" @click="prevStep" class="auth-btn secondary-btn">
          Назад
        </button>
        <button type="button" @click="confirmCode" class="auth-btn primary-btn">
          Подтвердить
        </button>
      </div>
      <div class="resend-container">
        <button
          type="button"
          @click="resendCode"
          :disabled="resendCooldown > 0"
          class="auth-btn secondary-btn resend-btn"
        >
          {{ resendCooldown > 0 ? `Отправить код заново (${resendCooldown})` : 'Отправить код заново' }}
        </button>
      </div>
    </div>

    <!-- Шаг 4: Полное имя -->
    <div v-if="currentStep === 4" class="register-step">
      <StepIndicator :current-step="4" :total-steps="5" />
      <div class="input-group">
        <label for="register-fullname">Полное имя (необязательно)</label>
        <input
          id="register-fullname"
          v-model="registerData.fullName"
          type="text"
          placeholder="Введите полное имя"
          autocomplete="name"
          @keyup.enter="nextStep"
        />
      </div>
      <div class="step-buttons">
        <button type="button" @click="prevStep" class="auth-btn secondary-btn">
          Назад
        </button>
        <button type="button" @click="skipFullName" class="auth-btn skip-btn">
          Пропустить
        </button>
        <button type="button" @click="nextStep" class="auth-btn primary-btn">
          Далее
        </button>
      </div>
    </div>

    <!-- Шаг 5: Пароль -->
    <div v-if="currentStep === 5" class="register-step">
      <StepIndicator :current-step="5" :total-steps="5" />
      <div class="input-group">
        <label for="register-password">Пароль</label>
        <input
          id="register-password"
          v-model="registerData.password"
          type="password"
          placeholder="Введите пароль (минимум 6 символов)"
          required
          autocomplete="new-password"
          @keyup.enter="focusPassword2"
        />
        <div class="password-hint">Минимум 6 символов</div>
      </div>
      <div class="input-group">
        <label for="register-password2">Повторите пароль</label>
            <input
              id="register-password2"
              ref="password2Input"
              v-model="registerData.password2"
              type="password"
              placeholder="Повторите пароль"
              required
              autocomplete="new-password"
              @keyup.enter="completeRegistration"
            />
        <div v-if="errors.password" class="input-error">{{ errors.password }}</div>
      </div>
      <div class="step-buttons">
        <button type="button" @click="prevStep" class="auth-btn secondary-btn">
          Назад
        </button>
        <button type="button" @click="completeRegistration" class="auth-btn primary-btn" :disabled="loading">
          {{ loading ? 'Завершение...' : 'Завершить регистрацию' }}
        </button>
      </div>
    </div>

    <div class="auth-switch">
      <p>Уже есть аккаунт? <a href="#" @click.prevent="$emit('switch-to-login')">Войти</a></p>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useApi } from '../composables/useApi'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import StepIndicator from './StepIndicator.vue'

const emit = defineEmits(['success', 'switch-to-login'])

const { request } = useApi()
const { saveAuth } = useAuth()
const { showToast } = useToast()

const currentStep = ref(1)
const loading = ref(false)
const resendCooldown = ref(0)
const pendingEmail = ref('')
const pendingToken = ref(null)
const pendingUser = ref(null)

const registerData = reactive({
  username: '',
  email: '',
  code: '',
  fullName: '',
  password: '',
  password2: ''
})

const errors = reactive({
  username: '',
  email: '',
  code: '',
  password: ''
})

function clearErrors() {
  errors.username = ''
  errors.email = ''
  errors.code = ''
  errors.password = ''
}

async function nextStep() {
  clearErrors()

  if (currentStep.value === 1) {
    if (!registerData.username.trim()) {
      errors.username = 'Введите имя пользователя'
      return
    }
    if (registerData.username.length < 3) {
      errors.username = 'Имя пользователя должно быть не менее 3 символов'
      return
    }

    try {
      loading.value = true
      const data = await request(`/check-username/${encodeURIComponent(registerData.username.trim())}`)
      if (!data.available) {
        errors.username = data.error || 'Это имя пользователя уже занято'
        return
      }
      currentStep.value = 2
    } catch (error) {
      errors.username = 'Ошибка проверки имени пользователя'
    } finally {
      loading.value = false
    }
  } else if (currentStep.value === 2) {
    if (!registerData.email.trim()) {
      errors.email = 'Введите email'
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(registerData.email)) {
      errors.email = 'Неверный формат email'
      return
    }

    await registerUser()
  } else if (currentStep.value === 4) {
    currentStep.value = 5
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
    clearErrors()
  }
}

function skipFullName() {
  registerData.fullName = ''
  currentStep.value = 5
}

async function registerUser() {
  try {
    loading.value = true
    const data = await request('/register', {
      method: 'POST',
      body: JSON.stringify({
        username: registerData.username,
        email: registerData.email,
        password: 'temp_password_will_be_changed',
        fullName: null
      })
    })

    if (data.needsCodeConfirmation) {
      pendingEmail.value = data.email
      pendingToken.value = data.token
      pendingUser.value = data.user
      currentStep.value = 3
      startResendCooldown()
      showToast('Код подтверждения отправлен на почту', 'success')
    }
  } catch (error) {
    if (error.status === 400 || error.status === 409) {
      errors.username = 'Пользователь с таким именем уже существует'
      currentStep.value = 1
    } else {
      showToast(error.message || 'Ошибка регистрации', 'error')
    }
  } finally {
    loading.value = false
  }
}

async function confirmCode() {
  clearErrors()

  if (!registerData.code || registerData.code.length !== 6 || !/^\d{6}$/.test(registerData.code)) {
    errors.code = 'Введите 6-значный код'
    return
  }

  try {
    loading.value = true
    const data = await request('/confirm-email', {
      method: 'POST',
      body: JSON.stringify({
        email: pendingEmail.value,
        code: registerData.code
      })
    })

    if (data.success && data.token && data.user) {
      pendingToken.value = data.token
      pendingUser.value = data.user
      currentStep.value = 4
      registerData.code = ''
      showToast('Email подтверждён! Завершите регистрацию', 'success')
    } else {
      errors.code = data.error || 'Неверный код'
    }
  } catch (error) {
    errors.code = error.message || 'Ошибка подтверждения'
  } finally {
    loading.value = false
  }
}

async function completeRegistration() {
  clearErrors()

  if (!registerData.password) {
    errors.password = 'Введите пароль'
    return
  }

  if (registerData.password.length < 6) {
    errors.password = 'Пароль должен быть не менее 6 символов'
    return
  }

  if (registerData.password !== registerData.password2) {
    errors.password = 'Пароли не совпадают'
    return
  }

  if (!pendingToken.value || !pendingUser.value) {
    showToast('Ошибка: данные регистрации не найдены. Начните регистрацию заново', 'error')
    resetForm()
    return
  }

  try {
    loading.value = true
    const data = await request('/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${pendingToken.value}`
      },
      body: JSON.stringify({
        password: registerData.password,
        fullName: registerData.fullName || null
      })
    })

    if (data.user) {
      saveAuth(data.user, pendingToken.value)
      showToast('Регистрация завершена! Вы автоматически вошли в аккаунт', 'success')
      resetForm()
      emit('success')
    }
  } catch (error) {
    showToast(error.message || 'Ошибка завершения регистрации', 'error')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  currentStep.value = 1
  Object.assign(registerData, {
    username: '',
    email: '',
    code: '',
    fullName: '',
    password: '',
    password2: ''
  })
  clearErrors()
  pendingEmail.value = ''
  pendingToken.value = null
  pendingUser.value = null
}

const password2Input = ref(null)

function focusPassword2() {
  nextTick(() => {
    password2Input.value?.focus()
  })
}

function startResendCooldown() {
  resendCooldown.value = 60
  const interval = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(interval)
    }
  }, 1000)
}

async function resendCode() {
  if (resendCooldown.value > 0) return

  try {
    loading.value = true
    const data = await request('/resend-code', {
      method: 'POST',
      body: JSON.stringify({
        email: pendingEmail.value
      })
    })

    if (data.success) {
      showToast('Новый код отправлен на почту', 'success')
      startResendCooldown()
    }
  } catch (error) {
    showToast(error.message || 'Ошибка отправки кода', 'error')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  // Обработка через отдельные методы для каждого шага
}
</script>

<style scoped>
.register-form-steps {
  max-width: 500px;
  margin: 0 auto;
}

.register-step {
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.input-group input {
  width: 100%;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.3s;
  font-family: inherit;
}

.input-group input:focus {
  outline: none;
  border-color: var(--neon-red);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 20px rgba(255, 0, 51, 0.2);
}

.input-group input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.step-buttons {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.step-buttons .auth-btn {
  flex: 1;
  padding: 14px 24px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  transition: all 0.3s;
  cursor: pointer;
  border: none;
  font-family: inherit;
}

.primary-btn {
  background: linear-gradient(135deg, var(--neon-red), var(--neon-pink));
  color: white;
  box-shadow: 0 4px 15px rgba(255, 0, 51, 0.3);
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 0, 51, 0.4);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
}

.secondary-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: var(--neon-red);
  box-shadow: 0 0 15px rgba(255, 0, 51, 0.2);
}

.skip-btn {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  border: 2px solid transparent;
}

.skip-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.verification-hint {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 12px;
  padding: 12px;
  background: rgba(255, 0, 51, 0.1);
  border-radius: 8px;
  border-left: 3px solid var(--neon-red);
}

.verification-hint strong {
  color: var(--neon-red);
  font-weight: 700;
}

.input-error {
  color: var(--neon-red);
  font-size: 0.85rem;
  margin-top: 6px;
  padding: 8px 12px;
  background: rgba(255, 0, 51, 0.1);
  border-radius: 8px;
  border-left: 3px solid var(--neon-red);
  animation: shake 0.3s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.password-hint {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: 6px;
  font-style: italic;
}

.resend-container {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.resend-btn {
  font-size: 0.9rem;
  padding: 10px 20px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px dashed var(--border-color);
}

.resend-btn:hover:not(:disabled) {
  color: var(--neon-red);
  border-color: var(--neon-red);
  background: rgba(255, 0, 51, 0.05);
}

.resend-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-switch {
  margin-top: 24px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.auth-switch p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.auth-switch a {
  color: var(--neon-red);
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s;
}

.auth-switch a:hover {
  text-shadow: 0 0 10px rgba(255, 0, 51, 0.5);
}
</style>

