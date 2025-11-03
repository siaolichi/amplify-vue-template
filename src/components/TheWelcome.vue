<script setup>
import bgImage from "@/assets/images/logo.png";
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
</script>

<style>
.welcome {
  width: 100%;
  height: 100%;
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

<template>
  <div class="welcome">
    <LoginSection v-if="!isAuthenticated" />
  </div>
</template>
