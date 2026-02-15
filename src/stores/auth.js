import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { confirmSignIn, getCurrentUser, signIn, signOut, signUp, confirmSignUp } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useCollectionStore } from "./collection";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const nextStep = ref(null);
  const collectionStore = useCollectionStore();

  let removeAuthListener;

  const isAuthenticated = computed(() => Boolean(user.value));

  async function initialize() {
    startAuthListener();
    loading.value = true;
    try {
      const currentUser = await getCurrentUser();
      user.value = currentUser;
      await ensureUserCollection(currentUser);
    } catch (err) {
      user.value = null;
      if (import.meta?.env?.DEV && err?.name !== "AuthError") {
        console.debug("Amplify auth initialization warning:", err);
      }
    } finally {
      loading.value = false;
    }
  }

  async function login({ email }) {
    loading.value = true;
    error.value = null;
    nextStep.value = null;

    try {
      const normalizedEmail = email?.trim?.() ?? "";
      if (!normalizedEmail) {
        throw new Error("Email is required for sign in.");
      }

      const response = await signIn({
        username: normalizedEmail,
        options: {
          authFlowType: "USER_AUTH",
          preferredChallenge: "EMAIL_OTP",
        },
      });

      nextStep.value = response.nextStep;

      if (response.isSignedIn) {
        const currentUser = await getCurrentUser();
        user.value = currentUser;
        await ensureUserCollection(currentUser);
      }

      return response;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function completeSignIn(challengeResponse) {
    if (!challengeResponse) {
      throw new Error("Verification code is required.");
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await confirmSignIn({ challengeResponse });
      // nextStep.value = response.nextStep;

      if (response.isSignedIn) {
        const currentUser = await getCurrentUser();
        user.value = currentUser;
        await ensureUserCollection(currentUser);
      }

      return response;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    loading.value = true;
    error.value = null;

    try {
      await signOut();
      user.value = null;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearError() {
    error.value = null;
  }

  async function register({ email }) {
    startAuthListener();
    loading.value = true;
    error.value = null;
    nextStep.value = null;

    try {
      const normalizedEmail = email?.trim?.() ?? "";
      if (!normalizedEmail) {
        throw new Error("Email is required for registration.");
      }

      const result = await signUp({
        username: normalizedEmail,
        options: {
          userAttributes: {
            email: normalizedEmail,
            nickname: "",
          },
          autoSignIn: true,
        },
      });

      nextStep.value = result.nextStep;

      if (result.isSignUpComplete) {
        try {
          const currentUser = await getCurrentUser();
          user.value = currentUser;
          await ensureUserCollection(currentUser);
        } catch (autoSignInError) {
          if (import.meta?.env?.DEV) {
            console.debug("Auto sign-in failed after registration:", autoSignInError);
          }
        }
      }

      return result;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function confirmRegistration({ email, confirmationCode }) {
    loading.value = true;
    error.value = null;

    try {
      const normalizedEmail = email?.trim?.() ?? "";
      if (!normalizedEmail) {
        throw new Error("Email is required for confirmation.");
      }
      if (!confirmationCode?.trim?.()) {
        throw new Error("Verification code is required.");
      }

      const result = await confirmSignUp({
        username: normalizedEmail,
        confirmationCode: confirmationCode.trim(),
      });

      nextStep.value = null;

      try {
        const currentUser = await getCurrentUser();
        user.value = currentUser;
        await ensureUserCollection(currentUser);
      } catch {
        user.value = null;
      }

      return result;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  const errorMessage = computed(() => error.value?.message ?? "");

  async function ensureUserCollection(currentUser) {
    try {
      await collectionStore.ensureCollectionForUser(currentUser);
    } catch (err) {
      if (import.meta?.env?.DEV) {
        console.debug("Failed to ensure Collection for user:", err);
      }
    }
  }

  function startAuthListener() {
    if (removeAuthListener) return;

    removeAuthListener = Hub.listen("auth", async ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
        case "autoSignIn":
        case "tokenRefresh":
          try {
            const currentUser = await getCurrentUser();
            user.value = currentUser;
            await ensureUserCollection(currentUser);
          } catch {
            user.value = null;
          }
          break;
        case "signedOut":
        case "userDeleted":
          user.value = null;
          break;
        default:
          break;
      }
    });
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
  };
});

