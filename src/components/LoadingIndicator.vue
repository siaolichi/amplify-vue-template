<template>
  <div class="loading-indicator" role="status" :aria-live="ariaLive">
    <span class="loading-indicator__spinner" aria-hidden="true"></span>
    <p v-if="message" class="loading-indicator__text">{{ message }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  message: {
    type: String,
    default: "載入中...",
  },
  /**
   * Optionally override aria-live region politeness.
   */
  ariaLive: {
    type: String,
    default: "polite",
    validator: (value) => ["off", "polite", "assertive"].includes(value),
  },
});

const ariaLive = computed(() => props.ariaLive);
const message = computed(() => props.message);
</script>

<style scoped lang="scss">
.loading-indicator {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 0;
  color: rgba(245, 246, 255, 0.78);
}

.loading-indicator__spinner {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 4px solid rgba(245, 246, 255, 0.16);
  border-top-color: rgba(245, 246, 255, 0.95);
  animation: loading-indicator-spin 1s linear infinite;
}

.loading-indicator__text {
  font-weight: 600;
  letter-spacing: 0.4px;
}

@keyframes loading-indicator-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
