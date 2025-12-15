<template>
  <div class="profile-edit-form">
    <input
      v-if="field !== 'password'"
      :ref="inputRef"
      :type="field === 'email' ? 'email' : 'text'"
      :placeholder="`Новое ${label.toLowerCase()}`"
      v-model="editValue"
      @keyup.enter="handleSave"
      @keyup.esc="handleCancel"
    />
    <template v-else>
      <input
        ref="passwordInput"
        type="password"
        placeholder="Новый пароль"
        v-model="editValue"
        @keyup.enter="focusPassword2"
      />
      <input
        ref="password2Input"
        type="password"
        placeholder="Повторите пароль"
        v-model="editValue2"
        @keyup.enter="handleSave"
        @keyup.esc="handleCancel"
      />
    </template>
    <div v-if="error" class="input-error">{{ error }}</div>
    <div class="profile-edit-actions">
      <button @click="handleSave" class="profile-save-btn" :disabled="loading">
        {{ loading ? 'Сохранение...' : 'Сохранить' }}
      </button>
      <button @click="handleCancel" class="profile-cancel-btn" :disabled="loading">
        Отмена
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  field: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  currentValue: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['save', 'cancel'])

const editValue = ref(props.currentValue || '')
const editValue2 = ref('')
const error = ref('')
const inputRef = ref(null)
const passwordInput = ref(null)
const password2Input = ref(null)

watch(() => props.currentValue, (newVal) => {
  editValue.value = newVal || ''
})

watch([editValue, editValue2], () => {
  error.value = ''
})

function validate() {
  if (props.field === 'password') {
    if (!editValue.value) {
      error.value = 'Введите новый пароль'
      return false
    }
    if (editValue.value.length < 6) {
      error.value = 'Пароль должен быть не менее 6 символов'
      return false
    }
    if (editValue.value !== editValue2.value) {
      error.value = 'Пароли не совпадают'
      return false
    }
  } else {
    if (!editValue.value.trim() && props.field !== 'fullName') {
      error.value = 'Поле не может быть пустым'
      return false
    }
    if (props.field === 'username' && editValue.value.trim().length < 3) {
      error.value = 'Имя пользователя должно быть не менее 3 символов'
      return false
    }
    if (props.field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(editValue.value)) {
        error.value = 'Неверный формат email'
        return false
      }
    }
  }
  return true
}

function handleSave() {
  if (!validate()) return
  
  const value = props.field === 'password' ? editValue.value : editValue.value.trim()
  emit('save', value, props.field === 'password' ? editValue2.value : undefined)
}

function handleCancel() {
  editValue.value = props.currentValue || ''
  editValue2.value = ''
  error.value = ''
  emit('cancel')
}

function focusPassword2() {
  nextTick(() => {
    password2Input.value?.focus()
  })
}

// Автофокус при открытии
nextTick(() => {
  if (props.field === 'password') {
    passwordInput.value?.focus()
  } else {
    inputRef.value?.focus()
  }
})
</script>

<style scoped>
.profile-edit-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid var(--neon-blue);
  border-radius: 10px;
}

.profile-edit-form input {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.3s;
}

.profile-edit-form input:focus {
  outline: none;
  border-color: var(--neon-blue);
  box-shadow: 0 0 15px rgba(0, 153, 255, 0.3);
}

.input-error {
  color: var(--neon-red);
  font-size: 0.85rem;
  margin-top: -5px;
}

.profile-edit-actions {
  display: flex;
  gap: 10px;
  margin-top: 5px;
}

.profile-save-btn,
.profile-cancel-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}

.profile-save-btn {
  background: var(--neon-blue);
  color: white;
}

.profile-save-btn:hover:not(:disabled) {
  background: var(--neon-green);
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
}

.profile-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.profile-cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
}

.profile-cancel-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: var(--neon-red);
}
</style>

