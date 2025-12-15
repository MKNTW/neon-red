<template>
  <div class="product" :style="{ animationDelay: `${index * 0.05}s` }">
    <div class="product-image-container">
      <img
        v-if="product.image_url && isValidImageUrl(product.image_url)"
        :data-src="product.image_url"
        :src="shouldLoadImage ? product.image_url : ''"
        :alt="product.title"
        class="product-image-img"
        @error="handleImageError"
        loading="lazy"
      />
      <div
        v-else
        class="product-image-fallback"
        :style="{ background: `linear-gradient(135deg, var(--neon-red), var(--neon-pink))` }"
      >
        {{ product.title.charAt(0).toUpperCase() }}
      </div>
    </div>
    <div class="product-content">
      <h3 class="product-title">{{ product.title }}</h3>
      <p class="product-description">{{ product.description || 'Описание отсутствует' }}</p>
      <div class="product-footer">
        <div class="product-price">{{ formatPrice(product.price) }} ₽</div>
        <div class="product-quantity" v-if="product.quantity !== undefined">
          В наличии: {{ product.quantity }}
        </div>
      </div>
      <button
        @click="handleAddToCart"
        :disabled="!product.quantity || product.quantity === 0"
        class="product-btn"
        :class="{ 'product-btn-disabled': !product.quantity || product.quantity === 0 }"
      >
        {{ product.quantity && product.quantity > 0 ? 'В корзину' : 'Нет в наличии' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCart } from '../composables/useCart'

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['add-to-cart'])

const { addToCart } = useCart()
const imageError = ref(false)

// Lazy loading для изображений - загружаем только первые 6 сразу
const shouldLoadImage = computed(() => props.index < 6)

function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (url.includes('via.placeholder.com')) return false
  return url.startsWith('http') || url.startsWith('//')
}

function handleImageError() {
  imageError.value = true
}

function formatPrice(price) {
  return parseFloat(price).toFixed(2)
}

function handleAddToCart() {
  if (props.product.quantity && props.product.quantity > 0) {
    addToCart(props.product)
    emit('add-to-cart', props.product)
  }
}
</script>

<style scoped>
.product {
  background: var(--card-bg);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s;
  animation: fadeInUp 0.5s ease-out;
  animation-fill-mode: both;
}

.product:hover {
  border-color: var(--neon-red);
  box-shadow: 0 0 25px rgba(255, 0, 51, 0.3);
  transform: translateY(-5px);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.product-image-container {
  width: 100%;
  height: 200px;
  position: relative;
  overflow: hidden;
  background: var(--darker-bg);
}

.product-image-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.product-image-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  font-weight: 900;
  color: white;
  text-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.product-content {
  padding: 20px;
}

.product-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 10px;
  line-height: 1.3;
}

.product-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 15px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.product-price {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--neon-red);
  text-shadow: 0 0 10px rgba(255, 0, 51, 0.5);
}

.product-quantity {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.product-btn {
  width: 100%;
  padding: 14px;
  background: var(--neon-red);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}

.product-btn:hover:not(:disabled) {
  background: var(--neon-pink);
  box-shadow: 0 0 20px rgba(255, 0, 51, 0.5);
  transform: translateY(-2px);
}

.product-btn-disabled {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
  cursor: not-allowed;
}
</style>

