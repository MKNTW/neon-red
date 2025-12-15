<template>
  <div class="profile-field" :class="{ editing }">
    <span class="profile-label">{{ label }}</span>
    <div class="profile-field-content">
      <span class="profile-value">{{ value }}</span>
      <button @click="$emit('edit')" class="profile-edit-btn" :disabled="editing">✏️</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  editing: {
    type: Boolean,
    default: false
  }
})

defineEmits(['edit'])
</script>

<style scoped>
.profile-field {
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  margin-bottom: 15px;
}

.profile-label {
  display: block;
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 8px;
  font-weight: 600;
}

.profile-field-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-value {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 500;
}

.profile-edit-btn {
  background: transparent;
  border: none;
  color: var(--neon-blue);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s;
  padding: 5px;
}

.profile-edit-btn:hover:not(:disabled) {
  color: var(--neon-red);
  transform: scale(1.2);
}

.profile-edit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.profile-field.editing {
  border-color: var(--neon-blue);
}
</style>

