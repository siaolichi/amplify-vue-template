<template>
  <div class="login">
    <section class="login__card">
      <h1 class="login__title">Login Dreamlog</h1>
      <p class="login__subtitle">
        Enter your email to receive a one-time verification code.
      </p>

      <form class="login__form" @submit.prevent="onSubmit">
        <label class="login__field">
          <span>Email</span>
          <input
            v-model.trim="formEmail"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            :disabled="needsChallenge || loading"
            required
          />
        </label>

        <label v-if="needsChallenge" class="login__field">
          <span>{{ challengeLabel }}</span>
          <input
            v-model.trim="challengeResponse"
            type="text"
            inputmode="numeric"
            placeholder="Enter verification code"
            autocomplete="one-time-code"
            :disabled="loading"
            required
          />
        </label>

        <div class="login__actions">
          <button v-if="needsChallenge" type="button" class="login__link" @click="restartFlow" :disabled="loading">
            Use different email
          </button>
          <button type="button" class="login__link" @click="goRegister" :disabled="loading">Register</button>
        </div>

        <button type="submit" class="login__submit" :disabled="isSubmitDisabled">
          <span v-if="loading" class="login__spinner" aria-hidden="true" />
          <span>{{ needsChallenge ? "Verify and sign in" : "Send code" }}</span>
        </button>

        <p v-if="displayError" class="login__error">{{ displayError }}</p>
        <p v-if="nextStepMessage" class="login__hint">{{ nextStepMessage }}</p>
      </form>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const emit = defineEmits(["onSubmit"]);

const formEmail = ref("");
const challengeResponse = ref("");
const localError = ref("");

const authStore = useAuthStore();
const { loading, errorMessage, nextStep } = storeToRefs(authStore);
const router = useRouter();

const needsChallenge = computed(() => nextStep.value?.signInStep && nextStep.value.signInStep !== "DONE");

const challengeLabel = computed(() => {
  const destination = nextStep.value?.codeDeliveryDetails?.destination;
  return destination ? `Verification code sent to ${destination}` : "Verification code";
});

const nextStepMessage = computed(() => describeNextStep(nextStep.value));
const displayError = computed(() => localError.value || errorMessage.value);

const isSubmitDisabled = computed(() => {
  if (loading.value) return true;
  if (!formEmail.value.trim()) return true;
  if (needsChallenge.value) {
    return challengeResponse.value.trim().length === 0;
  }
  return false;
});

watch([formEmail, challengeResponse], () => {
  if (localError.value) {
    localError.value = "";
  }
  if (errorMessage.value) {
    authStore.clearError();
  }
});

async function onSubmit() {
  localError.value = "";

  try {
    const email = formEmail.value.trim();

    if (needsChallenge.value) {
      const response = await authStore.completeSignIn(challengeResponse.value.trim());

      if (response.isSignedIn) {
        challengeResponse.value = "";
        emit("onSubmit", response.user);
      }

      return;
    }

    const response = await authStore.login({ email });

    if (response.isSignedIn) {
      emit("onSubmit", response.user);
      return;
    }

    if (response.nextStep) {
      localError.value = describeNextStep(response.nextStep);
    }
  } catch (err) {
    localError.value = err?.message ?? "Unable to sign in. Please try again.";
  }
}

function restartFlow() {
  if (loading.value) return;
  challengeResponse.value = "";
  nextStep.value = null;
  authStore.clearError();
}

function goRegister() {
  if (loading.value) return;
  router.push({ name: "register" });
}

function describeNextStep(step) {
  if (!step || !step.signInStep) return "";

  const destination = step?.codeDeliveryDetails?.destination;

  switch (step.signInStep) {
    case "CONFIRM_SIGN_IN_WITH_EMAIL_CODE":
      return destination ? `Enter the code sent to ${destination}.` : "Enter the verification code from email.";
    case "CONFIRM_SIGN_IN_WITH_SMS_CODE":
      return destination ? `Enter the code sent to ${destination}.` : "Enter the verification code.";
    case "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE":
      return "Enter the requested verification value.";
    default:
      return `Additional sign-in step required: ${step.signInStep}`;
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login__card {
  width: min(420px, 100%);
  background: rgba(9, 11, 23, 0.2);
  border-radius: 24px;
  padding: clamp(32px, 6vw, 48px);
  box-shadow: 0 30px 80px rgba(8, 12, 28, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login__title {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 1.9rem);
  color: #f5f6ff;
  text-align: center;
}

.login__subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.95rem;
  line-height: 1.7;
  text-align: center;
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.login__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login__field span {
  font-size: 0.85rem;
  letter-spacing: 0.3px;
  color: rgba(245, 246, 255, 0.7);
}

.login__field input {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(5, 6, 15, 0.7);
  color: #f5f6ff;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login__field input:focus {
  outline: none;
  border-color: rgba(111, 76, 255, 0.8);
  box-shadow: 0 0 0 3px rgba(111, 76, 255, 0.2);
}

.login__actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
}

.login__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 18px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, rgba(233, 30, 99, 0.85), rgba(121, 63, 233, 0.92));
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.4px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.login__submit:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
  transform: none;
}

.login__submit:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 44px rgba(111, 66, 193, 0.35);
}

.login__hint {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(245, 246, 255, 0.78);
  line-height: 1.6;
}

.login__error {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(255, 140, 140, 0.95);
}

.login__link {
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

.login__link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login__link:not(:disabled):hover {
  color: #fff;
  text-decoration: underline;
}

.login__spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 0.15rem solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: login__spin 0.75s linear infinite;
}

@keyframes login__spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

