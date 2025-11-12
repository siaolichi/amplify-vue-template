<template>
  <div class="login">
    <section class="login__card">
      <h1 class="login__title">登入 Dreamlog</h1>
      <p class="login__subtitle">
        MiraMirage 離開了，但他留下了線索給我們。<br />
        在這件作品中，ChatPT扮演說書人的角色。<br />
        透過與說書人的聊天過程，我們可以找到他登入時的帳號與密碼，一起進入夢域誌這個虛擬的新世界裡。
      </p>

      <transition name="login__fade" mode="out-in">
        <form v-if="!showReset" key="form" class="login__form" @submit.prevent="onSubmit">
          <label class="login__field">
            <span>Email/Username</span>
            <input
              v-model.trim="formEmail"
              placeholder="輸入你的 Email 或使用者名稱"
              autocomplete="email"
              :disabled="needsChallenge || loading"
              required
            />
          </label>

          <label v-if="!needsChallenge" class="login__field">
            <span>Password</span>
            <input
              v-model="form1Password"
              type="password"
              placeholder="輸入密碼"
              autocomplete="current-password"
              :disabled="loading"
              required
            />
          </label>

          <label v-else class="login__field">
            <span>{{ challengeLabel }}</span>
            <input
              v-model.trim="challengeResponse"
              type="text"
              placeholder="輸入驗證資訊"
              :disabled="loading"
              required
            />
          </label>

          <div class="login__actions">
            <label class="login__remember">
              <input type="checkbox" v-model="form1LoginCheck" :disabled="loading" />
              <span>記住我</span>
            </label>
            <button type="button" class="login__link" @click="toggleReset" :disabled="loading">忘記密碼？</button>
          </div>

          <button type="submit" class="login__submit" :disabled="isSubmitDisabled">
            <span v-if="loading" class="login__spinner" aria-hidden="true" />
            <span>{{ needsChallenge ? "驗證" : "登入" }}</span>
          </button>

          <p v-if="displayError" class="login__error">{{ displayError }}</p>
          <p v-if="needsChallenge && nextStepMessage" class="login__hint">{{ nextStepMessage }}</p>
        </form>

        <div v-else key="reset" class="login__reset">
          <h2 class="login__reset-title">重設密碼</h2>
          <p class="login__hint">
            {{
              resetStep === "request"
                ? "輸入註冊時使用的 Email 以接收驗證碼。"
                : resetStep === "verify"
                ? "請輸入驗證碼與新的密碼以完成重設。"
                : "密碼已更新，請使用新密碼登入。"
            }}
          </p>

          <form
            class="login__form"
            @submit.prevent="resetStep === 'verify' ? handleResetConfirm() : handleResetRequest()"
          >
            <label class="login__field">
              <span>Email</span>
              <input
                v-model.trim="resetEmail"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                :disabled="loading || resetStep === 'success'"
                required
              />
            </label>

            <template v-if="resetStep === 'verify'">
              <label class="login__field">
                <span>驗證碼</span>
                <input
                  v-model.trim="resetCode"
                  type="text"
                  inputmode="numeric"
                  placeholder="例如：123456"
                  autocomplete="one-time-code"
                  :disabled="loading"
                  required
                />
              </label>
              <label class="login__field">
                <span>新的密碼</span>
                <input
                  v-model="resetNewPassword"
                  type="password"
                  placeholder="輸入新的密碼"
                  autocomplete="new-password"
                  :disabled="loading"
                  required
                />
              </label>
            </template>

            <div v-if="resetStep === 'verify'" class="login__reset-actions">
              <button type="button" class="login__link" @click="resendResetCode" :disabled="loading">
                重新寄送驗證碼
              </button>
              <button type="button" class="login__link" @click="useDifferentEmail" :disabled="loading">
                使用其他 Email
              </button>
            </div>

            <button
              v-if="resetStep !== 'success'"
              type="submit"
              class="login__submit"
              :disabled="resetStep === 'request' ? isResetRequestDisabled : isResetConfirmDisabled"
            >
              <span v-if="loading" class="login__spinner" aria-hidden="true" />
              <span>{{ resetStep === "request" ? "寄送驗證碼" : "更新密碼" }}</span>
            </button>

            <button v-else type="button" class="login__submit" @click="closeResetPanel">返回登入</button>
          </form>

          <p v-if="resetMessage && resetStep !== 'success'" class="login__success">{{ resetMessage }}</p>
          <p v-if="resetError" class="login__error">{{ resetError }}</p>
          <button type="button" class="login__link login__link--back" @click="closeResetPanel" :disabled="loading">
            返回登入
          </button>
        </div>
      </transition>
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
  if (!nextStep.value) return "驗證資訊";

  switch (nextStep.value.signInStep) {
    case "CONFIRM_SIGN_IN_WITH_SMS_CODE":
      return "輸入傳送至裝置的驗證碼";
    case "CONFIRM_SIGN_IN_WITH_TOTP_CODE":
      return "請輸入驗證器 App 的六位數密碼";
    case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
      return "請設定新的密碼";
    default:
      return "驗證";
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
    resetFlowToRequest();
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
    }

    if (needsChallenge.value) {
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
      return "需要重設密碼，請透過「忘記密碼？」進行";
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
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.login__remember {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: rgba(245, 246, 255, 0.75);
}

.login__remember input {
  width: 16px;
  height: 16px;
  accent-color: #7a63ff;
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

.login__success {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(135, 231, 189, 0.92);
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

.login__link--back {
  align-self: center;
  margin-top: 8px;
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

.login__reset {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.login__reset-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #f5f6ff;
}

.login__reset-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.login__fade-enter-active,
.login__fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.login__fade-enter-from,
.login__fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 540px) {
  .login__actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .login__reset-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .login__link--back {
    align-self: stretch;
    text-align: center;
  }
}
</style>
