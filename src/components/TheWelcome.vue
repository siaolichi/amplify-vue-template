<script setup>
import bgImage from "@/assets/images/login-bg.png";
import LoginSection from "./LoginSection.vue";
import { onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const router = useRouter();
const authStore = useAuthStore();
const { isAuthenticated } = storeToRefs(authStore);

onMounted(() => {
  authStore.initialize();
});

watch(
  isAuthenticated,
  (value) => {
    if (value) {
      router.push({ name: "dashboard" });
    }
  },
  { immediate: true }
);

function onClickCard() {
  showSuccessCard.value = false;
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
  </div>
</template>
