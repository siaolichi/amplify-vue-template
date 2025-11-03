<script setup>
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

<template>
  <LoginSection v-if="!isAuthenticated" />
</template>
