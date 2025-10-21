import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  confirmSignIn,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
  confirmSignUp,
} from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const nextStep = ref(null)
  let removeAuthListener

  const isAuthenticated = computed(() => Boolean(user.value))

  async function initialize() {
    startAuthListener()
    loading.value = true
    try {
      const currentUser = await getCurrentUser()
      user.value = currentUser
    } catch (err) {
      user.value = null
      // Not signed in is expected on first load; don't surface as an error
      if (import.meta?.env?.DEV && err?.name !== 'AuthError') {
         
        console.debug('Amplify auth initialization warning:', err)
      }
    } finally {
      loading.value = false
    }
  }

  async function login({ email, password }) {
    loading.value = true
    error.value = null
    nextStep.value = null

    try {
      const normalizedEmail = email?.trim?.() ?? ''
      if (!normalizedEmail) {
        throw new Error('需要提供 Email 才能登入。')
      }
      const response = await signIn({ username: normalizedEmail, password })
      nextStep.value = response.nextStep

      if (response.isSignedIn) {
        user.value = response.user
      }

      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function completeSignIn(challengeResponse) {
    if (!challengeResponse) {
      throw new Error('Challenge response is required to complete sign in.')
    }

    loading.value = true
    error.value = null

    try {
      const response = await confirmSignIn({ challengeResponse })
      nextStep.value = response.nextStep

      if (response.isSignedIn) {
        user.value = response.user
      }

      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    error.value = null

    try {
      await signOut()
      user.value = null
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  async function register({ email, password }) {
    startAuthListener()
    loading.value = true
    error.value = null
    nextStep.value = null

    try {
      const normalizedEmail = email?.trim?.() ?? ''
      if (!normalizedEmail) {
        throw new Error('需要提供 Email 才能註冊。')
      }
      const result = await signUp({
        username: normalizedEmail,
        password,
        options: {
          userAttributes: {
            email: normalizedEmail,
          },
          autoSignIn: true,
        },
      })

      nextStep.value = result.nextStep

      if (result.isSignUpComplete && result.userId) {
        // Attempt auto sign-in for Gen 2 returns boolean; rely on initialize afterwards
        try {
          const currentUser = await getCurrentUser()
          user.value = currentUser
        } catch (autoSignInError) {
          if (import.meta?.env?.DEV) {
             
            console.debug('Auto sign-in failed after registration:', autoSignInError)
          }
        }
      }

      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function confirmRegistration({ email, confirmationCode }) {
    loading.value = true
    error.value = null

    try {
      const normalizedEmail = email?.trim?.() ?? ''
      if (!normalizedEmail) {
        throw new Error('需要提供 Email 才能完成註冊。')
      }
      const result = await confirmSignUp({ username: normalizedEmail, confirmationCode })
      nextStep.value = null
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  const errorMessage = computed(() => error.value?.message ?? '')

  function startAuthListener() {
    if (removeAuthListener) return

    removeAuthListener = Hub.listen('auth', async ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
        case 'autoSignIn':
        case 'tokenRefresh':
          try {
            const currentUser = await getCurrentUser()
            user.value = currentUser
          } catch {
            user.value = null
          }
          break
        case 'signedOut':
        case 'userDeleted':
          user.value = null
          break
        default:
          break
      }
    })
  }

  return {
    user,
    loading,
    error,
    errorMessage,
    nextStep,
    isAuthenticated,
    initialize,
    login,
    logout,
    clearError,
    completeSignIn,
    register,
    confirmRegistration,
    startAuthListener,
  }
})
