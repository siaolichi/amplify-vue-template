<template>
  <main class="register">
    <section class="register__card">
      <h1 class="register__title">建立你的夢域誌帳號 Dreamlog Register</h1>
      <p class="register__subtitle">
        嗨，我是夢域誌的創作者。在這場計劃形的作品中，我打算嘗試在數位時代後的各種可能。<br />
        從這件作品開始，每次的展覽、演出，或是相關場域，我都會藏一個 QRCode，這些 QRCode 裡會有我給各位的虛擬小禮物。<br />
        要拿禮物首先要有個禮物箱，快點註冊帳號跟我一起在虛實中大亂鬥吧！
      </p>

      <form v-if="!needsConfirmation" class="register__form" @submit.prevent="handleSubmit">
        <label class="register__field">
          <span>Email</span>
          <input v-model.trim="email" type="email" placeholder="you@example.com" autocomplete="email" required />
        </label>
        <label class="register__field">
          <span>Password</span>
          <input v-model="password" type="password" placeholder="輸入密碼" autocomplete="new-password" required />
        </label>
        <label class="register__field">
          <span>Password Confirmation</span>
          <input
            v-model="passwordConfirmation"
            type="password"
            placeholder="再次輸入密碼"
            autocomplete="new-password"
            required
          />
        </label>
        <button type="submit" class="register__submit" :disabled="isSubmitDisabled">
          <span v-if="loading" class="register__spinner" aria-hidden="true" />
          <span>註冊</span>
        </button>
      </form>

      <form v-else class="register__form" @submit.prevent="handleConfirm">
        <p class="register__hint">我們已傳送驗證碼至 {{ maskedEmail }}，請輸入收到的六位數代碼完成註冊。</p>
        <label class="register__field">
          <span>驗證碼</span>
          <input v-model.trim="confirmationCode" type="text" inputmode="numeric" placeholder="例如：123456" required />
        </label>
        <button type="submit" class="register__submit" :disabled="isConfirmDisabled">
          <span v-if="loading" class="register__spinner" aria-hidden="true" />
          <span>確認驗證碼</span>
        </button>
      </form>

      <p v-if="displayError" class="register__error">{{ displayError }}</p>
      <p v-if="successMessage" class="register__success">{{ successMessage }}</p>
    </section>
  </main>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const { loading, errorMessage, nextStep, isAuthenticated } = storeToRefs(authStore);

const email = ref("");
const password = ref("");
const passwordConfirmation = ref("");
const confirmationCode = ref("");
const localError = ref("");
const successMessage = ref("");

const needsConfirmation = computed(() => nextStep.value?.signUpStep && nextStep.value.signUpStep === "CONFIRM_SIGN_UP");

const displayError = computed(() => localError.value || errorMessage.value);

const maskedEmail = computed(() => {
  const target = email.value || nextStep.value?.codeDeliveryDetails?.destination;
  if (!target) return "";
  const [local, domain] = target.split("@");
  if (!domain) return target;
  const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}***` : `${local[0] ?? ""}***`;
  return `${maskedLocal}@${domain}`;
});

const isSubmitDisabled = computed(() => {
  if (loading.value) return true;
  if (!email.value || !password.value || !passwordConfirmation.value) {
    return true;
  }
  return password.value !== passwordConfirmation.value;
});

const isConfirmDisabled = computed(() => {
  if (loading.value) return true;
  return confirmationCode.value.trim().length === 0;
});

watch([email, password, passwordConfirmation, confirmationCode], () => {
  if (localError.value) {
    localError.value = "";
  }
  if (errorMessage.value) {
    authStore.clearError();
  }
});

watch(isAuthenticated, async (value) => {
  if (value) {
    successMessage.value = "註冊並登入成功，將帶您進入首頁。";
    await router.replace({ name: "home" });
  }
});

async function handleSubmit() {
  localError.value = "";
  successMessage.value = "";

  if (password.value !== passwordConfirmation.value) {
    localError.value = "兩次輸入的密碼不一致，請重新確認。";
    return;
  }

  try {
    const normalizedEmail = email.value.trim();
    email.value = normalizedEmail;

    const response = await authStore.register({
      password: password.value,
      email: normalizedEmail,
    });

    if (response.isSignUpComplete) {
      successMessage.value = "註冊成功，正在為您登入…";
    } else if (response.nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
      successMessage.value = "請輸入驗證碼完成註冊。";
    }
  } catch (err) {
    localError.value = err?.message ?? "註冊失敗，請稍後再試。";
  }
}

async function handleConfirm() {
  localError.value = "";
  successMessage.value = "";

  try {
    const normalizedEmail = email.value.trim();
    if (!normalizedEmail) {
      localError.value = "請重新輸入註冊使用的 Email。";
      return;
    }
    email.value = normalizedEmail;

    const result = await authStore.confirmRegistration({
      email: normalizedEmail,
      confirmationCode: confirmationCode.value.trim(),
    });

    if (result.isSignUpComplete) {
      successMessage.value = "驗證完成，請使用該帳號登入。";
      confirmationCode.value = "";
      await router.replace({ name: "home" });
    }
  } catch (err) {
    localError.value = err?.message ?? "驗證碼錯誤或已失效，請再試一次。";
  }
}
</script>

<style scoped>
.register {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: radial-gradient(circle at 20% 20%, rgba(61, 92, 255, 0.28), transparent 45%),
    radial-gradient(circle at 80% 0%, rgba(233, 30, 99, 0.3), transparent 40%), #05060f;
  padding: clamp(24px, 6vw, 64px) 16px;
}

.register__card {
  width: min(420px, 100%);
  background: rgba(9, 11, 23, 0.88);
  border-radius: 24px;
  padding: clamp(32px, 6vw, 48px);
  box-shadow: 0 30px 80px rgba(8, 12, 28, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
}

.register__title {
  margin: 0 0 0.75rem;
  font-size: clamp(1.6rem, 3vw, 1.9rem);
  color: #f5f6ff;
}

.register__subtitle {
  margin: 0 0 2rem;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.95rem;
}

.register__form {
  display: grid;
  gap: 1.25rem;
}

.register__field {
  display: grid;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: rgba(245, 246, 255, 0.92);
}

.register__field input {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background-color: rgba(12, 15, 31, 0.9);
  font-size: 0.95rem;
  color: #f5f6ff;
}

.register__field input:focus {
  outline: none;
  border-color: rgba(233, 30, 99, 0.45);
  box-shadow: 0 0 0 4px rgba(163, 69, 255, 0.25);
}

.register__submit {
  margin-top: 0.5rem;
  padding: 0.85rem 1.5rem;
  border: none;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, rgba(233, 30, 99, 0.95), rgba(163, 69, 255, 0.9));
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.register__submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 25px rgba(163, 69, 255, 0.35);
}

.register__field input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.register__error {
  margin-top: 1.5rem;
  color: #f87171;
  font-size: 0.95rem;
  text-align: center;
}

.register__success {
  margin-top: 1.5rem;
  color: #4ade80;
  font-size: 0.95rem;
  text-align: center;
}

.register__spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
  border-radius: 50%;
  border: 0.15rem solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  animation: register-spin 0.7s linear infinite;
  vertical-align: middle;
}

.register__hint {
  margin: 0;
  padding: 1rem;
  border-radius: 16px;
  background: rgba(12, 15, 31, 0.9);
  border: 1px solid rgba(233, 30, 99, 0.3);
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
}

@keyframes register-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
