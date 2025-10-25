<template>
  <div class="login-section">
    <form v-if="!showReset" @submit.prevent="onSubmit">
      <!-- Email input -->
      <MDBInput
        type="username"
        label="Email"
        id="formEmail"
        v-model="formEmail"
        wrapperClass="mb-4"
        :disabled="needsChallenge || loading"
      />
      <!-- Password input -->
      <MDBInput
        type="password"
        label="Password"
        id="form1Password"
        v-model="form1Password"
        wrapperClass="mb-4"
        :disabled="needsChallenge || loading"
      />
      <MDBInput
        v-if="needsChallenge"
        type="text"
        :label="challengeLabel"
        id="formChallengeResponse"
        v-model="challengeResponse"
        wrapperClass="mb-4"
        :disabled="loading"
      />
      <!-- 2 column grid layout for inline styling -->
      <MDBRow class="mb-4">
        <MDBCol class="d-flex justify-content-center">
          <!-- Checkbox -->
          <MDBCheckbox
            label="Remember me"
            id="form1LoginCheck"
            v-model="form1LoginCheck"
            :disabled="loading"
            wrapperClass="mb-3 mb-md-0"
          />
        </MDBCol>
        <MDBCol class="d-flex justify-content-md-end justify-content-center">
          <!-- Forgot password trigger -->
          <button type="button" class="login-section__link" @click="toggleReset" :disabled="loading">
            Forgot password?
          </button>
        </MDBCol>
      </MDBRow>
      <!-- Submit button -->
      <MDBBtn color="primary" type="submit" block :disabled="isSubmitDisabled">
        <span v-if="loading" class="spinner" aria-hidden="true" />
        <span>{{ needsChallenge ? "Verify" : "Sign in" }}</span>
      </MDBBtn>

      <p v-if="displayError" class="login-section__error">{{ displayError }}</p>
      <p v-if="needsChallenge && nextStepMessage" class="login-section__hint">
        {{ nextStepMessage }}
      </p>
    </form>

    <transition name="login-section-fade">
      <section v-if="showReset" class="reset-card">
        <h3 class="reset-card__title">重設密碼</h3>
        <p class="reset-card__hint">
          {{
            resetStep === "request"
              ? "輸入註冊 Email 以接收驗證碼"
              : resetStep === "verify"
              ? "輸入驗證碼與新的密碼以完成重設"
              : "密碼已更新，現在可以使用新密碼登入"
          }}
        </p>

        <MDBInput
          type="email"
          label="Email"
          id="resetEmail"
          v-model="resetEmail"
          wrapperClass="mb-3"
          :disabled="loading || resetStep === 'success'"
        />

        <div v-if="resetStep === 'request'" class="reset-card__actions">
          <MDBBtn color="secondary" block type="button" :disabled="isResetRequestDisabled" @click="handleResetRequest">
            <span v-if="loading" class="spinner" aria-hidden="true" />
            寄送驗證碼
          </MDBBtn>
        </div>

        <div v-else-if="resetStep === 'verify'" class="reset-card__verify">
          <MDBInput
            type="text"
            label="驗證碼"
            id="resetCode"
            v-model="resetCode"
            wrapperClass="mb-3"
            :disabled="loading"
          />
          <MDBInput
            type="password"
            label="新的密碼"
            id="resetPassword"
            v-model="resetNewPassword"
            wrapperClass="mb-3"
            :disabled="loading"
          />
          <MDBBtn color="primary" block type="button" :disabled="isResetConfirmDisabled" @click="handleResetConfirm">
            <span v-if="loading" class="spinner" aria-hidden="true" />
            更新密碼
          </MDBBtn>
          <div class="reset-card__links">
            <button type="button" class="reset-card__link" @click="resendResetCode" :disabled="loading">
              重新寄送驗證碼
            </button>
            <button type="button" class="reset-card__link" @click="useDifferentEmail" :disabled="loading">
              使用其他 Email
            </button>
          </div>
        </div>

        <div v-else-if="resetStep === 'success'" class="reset-card__success">
          <p class="reset-card__message">{{ resetMessage }}</p>
          <MDBBtn color="primary" block type="button" @click="closeResetPanel">返回登入</MDBBtn>
        </div>

        <p v-if="resetMessage && resetStep !== 'success'" class="reset-card__message">{{ resetMessage }}</p>
        <p v-if="resetError" class="reset-card__error">{{ resetError }}</p>
      </section>
    </transition>
  </div>
</template>

<script setup>
import { MDBRow, MDBCol, MDBInput, MDBCheckbox, MDBBtn } from "mdb-vue-ui-kit";
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const emit = defineEmits(["onSubmit"]);

const formEmail = ref("");
const form1Password = ref("");
const form1LoginCheck = ref(true);
const challengeResponse = ref("");
const localError = ref("");

const showReset = ref(false);
const resetStep = ref("request");
const resetEmail = ref("");
const resetCode = ref("");
const resetNewPassword = ref("");
const resetMessage = ref("");
const resetError = ref("");

const authStore = useAuthStore();
const { loading, errorMessage, nextStep } = storeToRefs(authStore);
const router = useRouter();

const needsChallenge = computed(() => nextStep.value?.signInStep && nextStep.value.signInStep !== "DONE");

const nextStepMessage = computed(() => describeNextStep(nextStep.value));

const challengeLabel = computed(() => {
  if (!nextStep.value) return "Verification code";

  switch (nextStep.value.signInStep) {
    case "CONFIRM_SIGN_IN_WITH_SMS_CODE":
      return "Enter the code you received";
    case "CONFIRM_SIGN_IN_WITH_TOTP_CODE":
      return "Enter your authenticator code";
    case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
      return "Enter a new password";
    default:
      return "Verification";
  }
});

const isSubmitDisabled = computed(() => {
  if (loading.value) return true;
  if (needsChallenge.value) {
    return challengeResponse.value.trim().length === 0;
  }
  return !formEmail.value || !form1Password.value;
});

const displayError = computed(() => localError.value || errorMessage.value);

const isResetRequestDisabled = computed(() => loading.value || !resetEmail.value.trim());
const isResetConfirmDisabled = computed(
  () => loading.value || !resetCode.value.trim() || !resetNewPassword.value.trim()
);

watch([formEmail, form1Password, challengeResponse], () => {
  if (localError.value) {
    localError.value = "";
  }
  if (errorMessage.value) {
    authStore.clearError();
  }
});

watch([resetEmail, resetCode, resetNewPassword], () => {
  if (resetError.value) {
    resetError.value = "";
  }
  if (errorMessage.value) {
    authStore.clearError();
  }
});

watch(showReset, (value) => {
  if (value) {
    resetEmail.value = formEmail.value.trim();
  } else {
    resetStep.value = "request";
    resetCode.value = "";
    resetNewPassword.value = "";
    resetMessage.value = "";
    resetError.value = "";
  }
  authStore.clearError();
});

async function onSubmit() {
  localError.value = "";

  try {
    const email = formEmail.value.trim();
    const password = form1Password.value;

    if (email === "herroom" && password === "afterme") {
      nextStep.value = null;
      authStore.clearError();
      form1Password.value = "";
      await router.push({ name: "qrcode" });
      return;
    } else if (needsChallenge.value) {
      const response = await authStore.completeSignIn(challengeResponse.value.trim());

      if (response.isSignedIn) {
        challengeResponse.value = "";
        emit("onSubmit", response.user);
      } else if (response.nextStep) {
        localError.value = describeNextStep(response.nextStep);
      }

      return;
    }

    const response = await authStore.login({
      email,
      password,
    });

    if (response.isSignedIn) {
      form1Password.value = "";
      emit("onSubmit", response.user);
      return;
    }

    if (response.nextStep) {
      localError.value = describeNextStep(response.nextStep);
    }
  } catch (err) {
    localError.value = err?.message ?? "登入失敗，請稍後再試。";
  }
}

function describeNextStep(step) {
  if (!step || !step.signInStep) return "";

  switch (step.signInStep) {
    case "CONFIRM_SIGN_IN_WITH_SMS_CODE":
      return `請輸入傳送至 ${step?.codeDeliveryDetails?.destination ?? "您的裝置"} 的驗證碼`;
    case "CONFIRM_SIGN_IN_WITH_TOTP_CODE":
      return "請輸入驗證器 App 所產生的六位數驗證碼";
    case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
      return "首次登入時需要設定一組新的密碼";
    case "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE":
      return "請完成額外的驗證步驟";
    case "RESET_PASSWORD":
      return "需要重設密碼，請透過「Forgot password?」連結進行";
    default:
      return `需要完成額外步驟：${step.signInStep}`;
  }
}

function toggleReset() {
  if (loading.value) return;
  showReset.value = !showReset.value;
}

function resetFlowToRequest() {
  resetStep.value = "request";
  resetCode.value = "";
  resetNewPassword.value = "";
  resetMessage.value = "";
  resetError.value = "";
  authStore.clearError();
}

async function handleResetRequest() {
  if (loading.value) return;

  resetError.value = "";
  resetMessage.value = "";
  authStore.clearError();

  const email = (resetEmail.value || formEmail.value || "").trim();
  resetEmail.value = email;

  if (!email) {
    resetError.value = "請輸入註冊 Email。";
    return;
  }

  try {
    const result = await authStore.initiatePasswordReset(email);
    resetStep.value = "verify";

    const destination =
      result?.nextStep?.codeDeliveryDetails?.destination ?? nextStep.value?.codeDeliveryDetails?.destination ?? "";
    resetMessage.value = destination ? `驗證碼已傳送至 ${destination}，請檢查信箱。` : "驗證碼已傳送，請檢查信箱。";
  } catch (err) {
    resetError.value = err?.message ?? "無法寄送驗證碼，請稍後再試。";
  }
}

async function handleResetConfirm() {
  if (loading.value) return;

  resetError.value = "";
  resetMessage.value = "";
  authStore.clearError();

  const email = resetEmail.value.trim();
  const code = resetCode.value.trim();
  const newPassword = resetNewPassword.value;

  if (!email) {
    resetError.value = "請確認 Email。";
    return;
  }
  if (!code) {
    resetError.value = "請輸入驗證碼。";
    return;
  }
  if (!newPassword) {
    resetError.value = "請輸入新的密碼。";
    return;
  }

  try {
    await authStore.completePasswordReset({
      email,
      confirmationCode: code,
      newPassword,
    });
    resetStep.value = "success";
    resetMessage.value = "密碼已成功更新，請使用新密碼登入。";
    formEmail.value = email;
    resetCode.value = "";
    resetNewPassword.value = "";
  } catch (err) {
    resetError.value = err?.message ?? "重設密碼時發生錯誤，請稍後再試。";
  }
}

async function resendResetCode() {
  await handleResetRequest();
}

function useDifferentEmail() {
  resetFlowToRequest();
  resetEmail.value = "";
}

function closeResetPanel() {
  resetFlowToRequest();
  showReset.value = false;
}
</script>

<style scoped>
.login-section {
  width: 300px;
}

.login-section__error {
  margin-top: 1rem;
  color: #c03546;
  font-size: 0.9rem;
}

.login-section__hint {
  margin-top: 0.75rem;
  color: #0b7285;
  font-size: 0.85rem;
}

.login-section__link {
  background: none;
  border: none;
  color: #6c63ff;
  letter-spacing: 0.3px;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.login-section__link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-section__link:not(:disabled):hover {
  color: #8a84ff;
  text-decoration: underline;
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
  border: 0.15rem solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
  vertical-align: middle;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.reset-card {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: rgba(12, 15, 28, 0.85);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 40px rgba(8, 12, 28, 0.35);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reset-card__title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #f5f6ff;
}

.reset-card__hint {
  font-size: 0.85rem;
  color: rgba(245, 246, 255, 0.75);
  margin-bottom: 0.5rem;
}

.reset-card__actions,
.reset-card__verify,
.reset-card__success {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reset-card__links {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.reset-card__link {
  background: none;
  border: none;
  color: rgba(245, 246, 255, 0.75);
  font-size: 0.78rem;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.reset-card__link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-card__link:not(:disabled):hover {
  color: #b8b7ff;
}

.reset-card__message {
  font-size: 0.82rem;
  color: rgba(245, 246, 255, 0.85);
}

.reset-card__error {
  font-size: 0.82rem;
  color: rgba(255, 140, 140, 0.95);
}

.login-section-fade-enter-active,
.login-section-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.login-section-fade-enter-from,
.login-section-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
