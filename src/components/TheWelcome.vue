<script setup>
import bgImage from '@/assets/images/login-bg.png'
import LoginSection from './LoginSection.vue'
import WarningCard from './WarningCard.vue'
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)
const showSuccessCard = ref(false)

onMounted(() => {
  authStore.initialize()
})

watch(
  isAuthenticated,
  (value) => {
    if (value) {
      showSuccessCard.value = true
    }
  },
  { immediate: true },
)

function onClickCard() {
  showSuccessCard.value = false
}
</script>

<style>
.welcome {
  width: 100%;
  height: 100%;
  background-position: center;
  background-size: cover;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

<template>
  <div class="welcome" :style="{ backgroundImage: `url(${bgImage})` }">
    <LoginSection v-if="!isAuthenticated" />
    <WarningCard v-else-if="showSuccessCard" @on-click="onClickCard" />
  </div>
</template>
