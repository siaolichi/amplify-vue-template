<template>
  <main class="register">
    <section class="register__card">
      <h1 class="register__title">Create account</h1>
      <p class="register__subtitle">
        Register with email only. We will send a verification code to complete sign-up.
      </p>

      <form v-if="!needsConfirmation" class="register__form" @submit.prevent="handleSubmit">
        <label class="register__field">
          <span>Email</span>
          <input v-model.trim="email" type="email" placeholder="you@example.com" autocomplete="email" required />
        </label>

        <button type="submit" class="register__submit" :disabled="isSubmitDisabled">
          <span v-if="loading" class="register__spinner" aria-hidden="true" />
          <span>Send verification code</span>
        </button>
      </form>

      <form v-else class="register__form" @submit.prevent="handleConfirm">
        <p class="register__hint">A verification code was sent to {{ maskedEmail }}. Enter it below.</p>
        <label class="register__field">
          <span>Verification code</span>
          <input v-model.trim="confirmationCode" type="text" inputmode="numeric" placeholder="123456" required />
        </label>
        <button type="submit" class="register__submit" :disabled="isConfirmDisabled">
          <span v-if="loading" class="register__spinner" aria-hidden="true" />
          <span>Confirm sign up</span>
        </button>
      </form>

      <p v-if="displayError" class="register__error">{{ displayError }}</p>
      <p v-if="successMessage" class="register__success">{{ successMessage }}</p>
      <button type="button" class="register__link" @click="goLogin" :disabled="loading">Back to Login</button>
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
const confirmationCode = ref("");
const localError = ref("");
const successMessage = ref("");

const needsConfirmation = computed(() => nextStep.value?.signUpStep === "CONFIRM_SIGN_UP");
const displayError = computed(() => localError.value || errorMessage.value);

const maskedEmail = computed(() => {
  const target = email.value || nextStep.value?.codeDeliveryDetails?.destination;
  if (!target) return "";
  const [local, domain] = target.split("@");
  if (!domain) return target;
  const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}***` : `${local[0] ?? ""}***`;
  return `${maskedLocal}@${domain}`;
});

const isSubmitDisabled = computed(() => loading.value || !email.value.trim());
const isConfirmDisabled = computed(() => loading.value || confirmationCode.value.trim().length === 0);

watch([email, confirmationCode], () => {
  if (localError.value) {
    localError.value = "";
  }
  if (errorMessage.value) {
    authStore.clearError();
  }
});

watch(isAuthenticated, async (value) => {
  if (value) {
    await router.replace({ name: "home" });
  }
});

async function handleSubmit() {
  localError.value = "";
  successMessage.value = "";

  try {
    const normalizedEmail = email.value.trim();
    email.value = normalizedEmail;

    const response = await authStore.register({
      email: normalizedEmail,
    });

    if (response.isSignUpComplete) {
      successMessage.value = "Registration complete. You can now sign in with email OTP.";
      return;
    }

    if (response.nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
      successMessage.value = "Verification code sent. Please check your email.";
    }
  } catch (err) {
    localError.value = err?.message ?? "Registration failed. Please try again.";
  }
}

async function handleConfirm() {
  localError.value = "";
  successMessage.value = "";

  try {
    const normalizedEmail = email.value.trim();
    if (!normalizedEmail) {
      localError.value = "Email is required.";
      return;
    }

    const result = await authStore.confirmRegistration({
      email: normalizedEmail,
      confirmationCode: confirmationCode.value.trim(),
    });

    if (result.isSignUpComplete) {
      successMessage.value = "Email verified. Redirecting...";
      confirmationCode.value = "";
      await router.replace({ name: "home" });
    }
  } catch (err) {
    localError.value = err?.message ?? "Code verification failed. Please try again.";
  }
}

function goLogin() {
  if (loading.value) return;
  router.push({ name: "home" });
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

.register__link {
  margin-top: 1rem;
  background: none;
  border: none;
  color: rgba(184, 183, 255, 0.88);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.register__link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.register__link:not(:disabled):hover {
  color: #fff;
  text-decoration: underline;
}

@keyframes register-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
