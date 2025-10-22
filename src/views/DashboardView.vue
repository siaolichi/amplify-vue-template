<template>
  <div class="dashboard">
    <WarningCard v-if="showSuccessCard" @on-click="onClickCard" />
    <div class="dashboard__card" :aria-busy="loadingAttributes">
      <div v-if="loadingAttributes" class="dashboard__loading" role="status" aria-live="polite">
        <span class="dashboard__spinner" aria-hidden="true"></span>
        <p class="dashboard__loading-text">載入中...</p>
      </div>
      <template v-else>
        <h1 class="dashboard__title">歡迎登入 Dreamlog</h1>
        <p class="dashboard__subtitle">請輸入你的暱稱</p>
        <form class="dashboard__form" @submit.prevent="handleSubmit">
          <label class="dashboard__label" for="nickname">暱稱</label>
          <input
            id="nickname"
            v-model="nickname"
            class="dashboard__input"
            type="text"
            placeholder="輸入你的暱稱"
            required
            autofocus
            :disabled="saving"
          />
          <button type="submit" class="dashboard__button" :disabled="!nickname.trim() || saving">
            {{ saving ? "儲存中..." : "確認" }}
          </button>
        </form>
        <p v-if="message" class="dashboard__hint" aria-live="polite">
          {{ message }}
        </p>
        <p v-if="submittedNickname" class="dashboard__hint">
          目前暱稱：<strong>{{ submittedNickname }}</strong>
        </p>
        <p v-if="errorMessage" class="dashboard__error" role="alert">
          {{ errorMessage }}
        </p>
        <button type="button" class="dashboard__logout" @click="handleLogout" :disabled="saving || loadingLogout">
          {{ loadingLogout ? "登出中..." : "登出" }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { fetchUserAttributes, updateUserAttribute } from "aws-amplify/auth";
import { useAuthStore } from "../stores/auth";

import WarningCard from "@/components/WarningCard.vue";

const showSuccessCard = ref(true);
const nickname = ref("");
const submittedNickname = ref("");
const saving = ref(false);
const message = ref("");
const errorMessage = ref("");
const authStore = useAuthStore();
const loadingLogout = ref(false);
const router = useRouter();
const loadingAttributes = ref(true);

async function handleSubmit() {
  const trimmed = nickname.value.trim();
  if (!trimmed) return;
  saving.value = true;
  errorMessage.value = "";
  message.value = "";

  try {
    await updateUserAttribute({
      userAttribute: {
        attributeKey: "nickname",
        value: trimmed,
      },
    });
    submittedNickname.value = trimmed;
    message.value = "暱稱已成功更新。";
  } catch (error) {
    errorMessage.value = error?.message ?? "更新暱稱時發生錯誤，請稍後再試。";
  } finally {
    saving.value = false;
  }
}

async function handleLogout() {
  if (!authStore?.logout || loadingLogout.value) return;

  loadingLogout.value = true;
  message.value = "";
  errorMessage.value = "";

  try {
    await authStore.logout();
    nickname.value = "";
    submittedNickname.value = "";
    message.value = "已成功登出。";
    router.push({ name: "home" });
  } catch (error) {
    errorMessage.value = error?.message ?? "登出時發生錯誤，請稍後再試。";
  } finally {
    loadingLogout.value = false;
  }
}

onMounted(async () => {
  try {
    const attributes = await fetchUserAttributes();
    if (attributes?.nickname) {
      nickname.value = attributes.nickname;
      submittedNickname.value = attributes.nickname;
    }
  } catch (error) {
    errorMessage.value = authStore?.user ? "載入暱稱時發生錯誤，請稍後再試。" : "請先登入後再設定暱稱。";
    if (import.meta?.env?.DEV) {
      console.debug("載入暱稱時發生錯誤：", error);
    }
  } finally {
    loadingAttributes.value = false;
  }
});

function onClickCard() {
  showSuccessCard.value = false;
}
</script>

<style scoped lang="scss">
.dashboard {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(24px, 6vw, 64px);
  background: radial-gradient(circle at 15% 20%, rgba(68, 63, 233, 0.14), transparent 52%),
    radial-gradient(circle at 80% 0%, rgba(233, 30, 99, 0.18), transparent 56%), #05060f;
  color: #f5f6ff;
}

.dashboard__card {
  width: min(420px, 100%);
  padding: clamp(28px, 4vw, 40px);
  background: rgba(14, 18, 35, 0.85);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 32px 80px rgba(8, 12, 28, 0.45);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dashboard__title {
  font-size: clamp(1.8rem, 4vw, 2.2rem);
  font-weight: 700;
}

.dashboard__subtitle {
  color: rgba(245, 246, 255, 0.7);
  line-height: 1.6;
}

.dashboard__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dashboard__label {
  font-size: 0.85rem;
  letter-spacing: 0.3px;
  color: rgba(245, 246, 255, 0.6);
}

.dashboard__input {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(5, 6, 15, 0.7);
  color: #f5f6ff;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.dashboard__input:focus {
  outline: none;
  border-color: rgba(111, 76, 255, 0.8);
  box-shadow: 0 0 0 3px rgba(111, 76, 255, 0.2);
}

.dashboard__button {
  margin-top: 8px;
  padding: 14px 16px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, rgba(233, 30, 99, 0.8), rgba(121, 63, 233, 0.9));
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.4px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.dashboard__button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
  transform: none;
}

.dashboard__button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(111, 66, 193, 0.35);
}

.dashboard__hint {
  margin-top: 4px;
  font-size: 0.9rem;
  color: rgba(245, 246, 255, 0.8);
}

.dashboard__error {
  margin-top: 8px;
  font-size: 0.9rem;
  color: rgba(255, 117, 117, 0.94);
}

.dashboard__loading {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 0;
}

.dashboard__spinner {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 4px solid rgba(245, 246, 255, 0.16);
  border-top-color: rgba(245, 246, 255, 0.95);
  animation: dashboard-spin 1s linear infinite;
}

.dashboard__loading-text {
  color: rgba(245, 246, 255, 0.78);
  font-weight: 600;
  letter-spacing: 0.4px;
}

.dashboard__logout {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(5, 6, 15, 0.4);
  color: #f5f6ff;
  font-weight: 600;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
}

.dashboard__logout:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

.dashboard__logout:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.28);
  transform: translateY(-1px);
}

@keyframes dashboard-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
