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
.register-step {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.step-buttons {
  display: flex;
  gap: 12px;
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
}

.secondary-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: var(--neon-red);
}

.skip-btn {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}

.verification-hint {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 10px;
}

.verification-hint strong {
  color: var(--neon-red);
}

.input-error {
  color: var(--neon-red);
  font-size: 0.85rem;
  margin-top: 5px;
}

.password-hint {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: 5px;
}

.resend-container {
  text-align: center;
  margin-top: 15px;
}

.resend-btn {
  font-size: 0.9rem;
  padding: 8px 16px;
}
</style>

