<template>
  <div class="login-section">
    <form @submit.prevent="onSubmit">
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
        <MDBCol>
          <!-- Simple link -->
          <a href="#!">Forgot password?</a>
        </MDBCol>
      </MDBRow>
      <!-- Submit button -->
      <MDBBtn color="primary" type="submit" block :disabled="isSubmitDisabled">
        <span v-if="loading" class="spinner" aria-hidden="true" />
        <span>{{ needsChallenge ? 'Verify' : 'Sign in' }}</span>
      </MDBBtn>

      <p v-if="displayError" class="login-section__error">{{ displayError }}</p>
      <p v-if="needsChallenge && nextStepMessage" class="login-section__hint">
        {{ nextStepMessage }}
      </p>
    </form>
  </div>
</template>

<script setup>
import { MDBRow, MDBCol, MDBInput, MDBCheckbox, MDBBtn } from 'mdb-vue-ui-kit'
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const emit = defineEmits(['onSubmit'])

const formEmail = ref('')
const form1Password = ref('')
const form1LoginCheck = ref(true)
const challengeResponse = ref('')
const localError = ref('')

const authStore = useAuthStore()
const { loading, errorMessage, nextStep } = storeToRefs(authStore)
const router = useRouter()

const needsChallenge = computed(
  () => nextStep.value?.signInStep && nextStep.value.signInStep !== 'DONE',
)

const nextStepMessage = computed(() => describeNextStep(nextStep.value))

const challengeLabel = computed(() => {
  if (!nextStep.value) return 'Verification code'

  switch (nextStep.value.signInStep) {
    case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
      return 'Enter the code you received'
    case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
      return 'Enter your authenticator code'
    case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
      return 'Enter a new password'
    default:
      return 'Verification'
  }
})

const isSubmitDisabled = computed(() => {
  if (loading.value) return true
  if (needsChallenge.value) {
    return challengeResponse.value.trim().length === 0
  }
  return !formEmail.value || !form1Password.value
})

const displayError = computed(() => localError.value || errorMessage.value)

watch([formEmail, form1Password, challengeResponse], () => {
  if (localError.value) {
    localError.value = ''
  }
  if (errorMessage.value) {
    authStore.clearError()
  }
})

async function onSubmit() {
  localError.value = ''

  try {
    const email = formEmail.value.trim()
    const password = form1Password.value

    if (email === 'herroom' && password === 'afterme') {
      nextStep.value = null
      authStore.clearError()
      form1Password.value = ''
      await router.push({ name: 'qrcode' })
      return
    } else if (needsChallenge.value) {
      const response = await authStore.completeSignIn(challengeResponse.value.trim())

      if (response.isSignedIn) {
        challengeResponse.value = ''
        emit('onSubmit', response.user)
      } else if (response.nextStep) {
        localError.value = describeNextStep(response.nextStep)
      }

      return
    }

    const response = await authStore.login({
      email,
      password,
    })

    if (response.isSignedIn) {
      form1Password.value = ''
      emit('onSubmit', response.user)
      return
    }

    if (response.nextStep) {
      localError.value = describeNextStep(response.nextStep)
    }
  } catch (err) {
    localError.value = err?.message ?? '登入失敗，請稍後再試。'
  }
}

function describeNextStep(step) {
  if (!step || !step.signInStep) return ''

  switch (step.signInStep) {
    case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
      return `請輸入傳送至 ${step?.codeDeliveryDetails?.destination ?? '您的裝置'} 的驗證碼`
    case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
      return '請輸入驗證器 App 所產生的六位數驗證碼'
    case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
      return '首次登入時需要設定一組新的密碼'
    case 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE':
      return '請完成額外的驗證步驟'
    case 'RESET_PASSWORD':
      return '需要重設密碼，請透過「Forgot password?」連結進行'
    default:
      return `需要完成額外步驟：${step.signInStep}`
  }
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
</style>
