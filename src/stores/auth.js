import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  confirmSignIn,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { generateClient } from "aws-amplify/data";

const dataClient = generateClient();

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const nextStep = ref(null);
  let removeAuthListener;

  const isAuthenticated = computed(() => Boolean(user.value));

  async function initialize() {
    startAuthListener();
    loading.value = true;
    try {
      const currentUser = await getCurrentUser();
      user.value = currentUser;
      await ensureCollectionForUser(currentUser);
    } catch (err) {
      user.value = null;
      // Not signed in is expected on first load; don't surface as an error
      if (import.meta?.env?.DEV && err?.name !== "AuthError") {
        console.debug("Amplify auth initialization warning:", err);
      }
    } finally {
      loading.value = false;
    }
  }

  async function login({ email, password }) {
    loading.value = true;
    error.value = null;
    nextStep.value = null;

    try {
      const normalizedEmail = email?.trim?.() ?? "";
      if (!normalizedEmail) {
        throw new Error("需要提供 Email 才能登入。");
      }
      const response = await signIn({ username: normalizedEmail, password });
      nextStep.value = response.nextStep;

      if (response.isSignedIn) {
        user.value = response.user;
        await ensureCollectionForUser(response.user);
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
      throw new Error("Challenge response is required to complete sign in.");
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await confirmSignIn({ challengeResponse });
      nextStep.value = response.nextStep;

      if (response.isSignedIn) {
        user.value = response.user;
        await ensureCollectionForUser(response.user);
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

  async function register({ email, password }) {
    startAuthListener();
    loading.value = true;
    error.value = null;
    nextStep.value = null;

    try {
      const normalizedEmail = email?.trim?.() ?? "";
      if (!normalizedEmail) {
        throw new Error("需要提供 Email 才能註冊。");
      }
      const result = await signUp({
        username: normalizedEmail,
        password,
        options: {
          userAttributes: {
            email: normalizedEmail,
            nickname: "",
          },
          autoSignIn: true,
        },
      });

      nextStep.value = result.nextStep;

      if (result.isSignUpComplete && result.userId) {
        // Attempt auto sign-in for Gen 2 returns boolean; rely on initialize afterwards
        try {
          const currentUser = await getCurrentUser();
          await ensureCollectionForUser(currentUser);
          user.value = currentUser;
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
        throw new Error("需要提供 Email 才能完成註冊。");
      }
      const result = await confirmSignUp({ username: normalizedEmail, confirmationCode });
      nextStep.value = null;
      return result;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function initiatePasswordReset(email) {
    loading.value = true;
    error.value = null;

    try {
      const normalizedEmail = email?.trim?.() ?? "";
      if (!normalizedEmail) {
        throw new Error("需要提供 Email 才能重設密碼。");
      }
      const result = await resetPassword({ username: normalizedEmail });
      nextStep.value = result.nextStep;
      return result;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function completePasswordReset({ email, confirmationCode, newPassword }) {
    loading.value = true;
    error.value = null;

    try {
      const normalizedEmail = email?.trim?.() ?? "";
      if (!normalizedEmail) {
        throw new Error("需要提供 Email 才能完成重設密碼。");
      }
      if (!confirmationCode?.trim?.()) {
        throw new Error("需要提供驗證碼才能完成重設密碼。");
      }
      if (!newPassword) {
        throw new Error("需要提供新密碼才能完成重設密碼。");
      }

      await confirmResetPassword({
        username: normalizedEmail,
        confirmationCode: confirmationCode.trim(),
        newPassword,
      });
      nextStep.value = null;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  const errorMessage = computed(() => error.value?.message ?? "");

  async function ensureCollectionForUser(currentUser) {
    const userId = currentUser?.userId;
    if (!userId) return;

    try {
      const { data: collections } = await dataClient.models.Collection.list({
        filter: (collection) => collection.user.eq(userId),
        limit: 1,
      });

      if (collections?.length == 0) {
        const data = await dataClient.models.Collection.create({
          user: userId,
          property: JSON.stringify({ name: "Mira's room" }),
        });

        console.log(data);
      }
    } catch (err) {
      if (import.meta?.env?.DEV) {
        console.debug("確保使用者收藏資料時發生錯誤：", err);
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
            await ensureCollectionForUser(currentUser);
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
    initiatePasswordReset,
    completePasswordReset,
    startAuthListener,
  };
});
