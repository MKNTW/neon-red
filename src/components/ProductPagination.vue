<template>
  <div class="products-pagination">
    <button
      @click="$emit('page-change', currentPage - 1)"
      :disabled="currentPage === 1"
      class="pagination-btn"
    >
      ← Назад
    </button>
    <span class="pagination-info">
      Страница {{ currentPage }} из {{ totalPages }}
    </span>
    <button
      @click="$emit('page-change', currentPage + 1)"
      :disabled="currentPage >= totalPages"
      class="pagination-btn"
    >
      Вперед →
    </button>
  </div>
</template>

<script setup>
defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  }
})

defineEmits(['page-change'])
</script>

<style scoped>
.products-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin: 30px 0;
  flex-wrap: wrap;
}

.pagination-btn {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}

.pagination-btn:hover:not(:disabled) {
  background: rgba(255, 0, 51, 0.1);
  border-color: var(--neon-red);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  color: var(--text-secondary);
  font-weight: 600;
  padding: 0 15px;
}
</style>

