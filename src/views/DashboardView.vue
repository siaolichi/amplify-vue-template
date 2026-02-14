<template>
  <div class="dashboard">
    <WarningCard v-if="showSuccessCard" @on-click="onClickCard" />
    <div class="dashboard__container">
      <div class="dashboard__header" :aria-busy="loadingProfile">
        <div class="dashboard__header-title">
          <form class="dashboard__form" @submit.prevent="handleSubmit">
            <label class="sr-only" for="nickname">暱稱</label>
            <input
              id="nickname"
              v-model="nickname"
              class="dashboard__input"
              type="text"
              placeholder="輸入你的暱稱"
              required
              :disabled="saving || loadingProfile"
            />
            <button type="submit" class="dashboard__button" :disabled="!nickname.trim() || saving">
              {{ saving ? "儲存中..." : "儲存暱稱" }}
            </button>
          </form>
          <button type="button" class="dashboard__logout" @click="handleLogout" :disabled="loadingLogout || saving">
            {{ loadingLogout ? "登出中..." : "登出" }}
          </button>
        </div>
      </div>
      <div class="dashboard__messages" aria-live="polite">
        <p v-if="message" class="dashboard__hint">
          {{ message }}
        </p>
        <p v-if="submittedNickname" class="dashboard__hint">
          目前暱稱：<strong>{{ submittedNickname }}</strong>
        </p>
        <p v-if="errorMessage" class="dashboard__error" role="alert">
          {{ errorMessage }}
        </p>
      </div>
      <Collections
        :loading-cards="loadingCards"
        :collection-hint="collectionHint"
        :collection-error="collectionError"
        :card-collection="cardCollection"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { fetchUserAttributes, updateUserAttribute } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";

import Collections from "@/components/Collections.vue";
import WarningCard from "@/components/WarningCard.vue";
import { useAuthStore } from "../stores/auth";

const dataClient = generateClient();

const showSuccessCard = ref(true);
const nickname = ref("");
const submittedNickname = ref("");
const saving = ref(false);
const message = ref("");
const errorMessage = ref("");
const loadingLogout = ref(false);

const authStore = useAuthStore();
const router = useRouter();

const loadingProfile = ref(true);
const loadingCards = ref(true);
const loadingDashboard = computed(() => loadingProfile.value || loadingCards.value);

const cardCollection = ref([]);
const collectionError = ref("");
const collectionStatus = ref("");

const collectionHint = computed(() => {
  if (loadingDashboard.value) {
    return "同步資料中...";
  }
  if (cardCollection.value.length) {
    return `目前擁有 ${cardCollection.value.length} 個物件`;
  }
  return collectionStatus.value || "還沒有同步任何物件。";
});

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
    router.push({ name: "home" });
  } catch (error) {
    errorMessage.value = error?.message ?? "登出時發生錯誤，請稍後再試。";
  } finally {
    loadingLogout.value = false;
  }
}

onMounted(() => {
  loadProfile();
  loadCardCollection();
});

async function loadProfile() {
  loadingProfile.value = true;
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
    loadingProfile.value = false;
  }
}

async function loadCardCollection() {
  loadingCards.value = true;
  collectionError.value = "";
  collectionStatus.value = "";
  cardCollection.value = [];

  try {
    const { cards, status } = await fetchCardsFromData();
    cardCollection.value = cards;
    collectionStatus.value = status;
  } catch (error) {
    collectionError.value = error?.message ?? "讀取物件資料時發生錯誤，請稍後再試。";
    if (import.meta?.env?.DEV) {
      console.debug("讀取物件資料時發生錯誤：", error);
    }
  } finally {
    loadingCards.value = false;
  }
}

function onClickCard() {
  showSuccessCard.value = false;
}

async function fetchCardsFromData() {
  const candidateModels = detectCardModelCandidates();
  if (!candidateModels.length) {
    return { cards: [], status: "尚未定義物件資料模型。" };
  }

  const aggregatedCards = [];
  const modelsWithData = new Set();
  const encounteredErrors = [];

  for (const modelName of candidateModels) {
    const model = dataClient?.models?.[modelName];
    if (!model?.list) continue;

    try {
      const response = await model.list({ limit: 200 });
      if (response?.errors?.length) {
        encounteredErrors.push(response.errors.map((item) => item.message).join(", "));
        continue;
      }

      const normalized = buildNormalizedCards(response?.data ?? []);
      if (normalized.length) {
        modelsWithData.add(modelName);
      }
      aggregatedCards.push(...normalized);
    } catch (error) {
      encounteredErrors.push(error?.message ?? `讀取 ${modelName} 資料時發生未知錯誤。`);
    }
  }

  if (aggregatedCards.length) {
    const cards = dedupeCards(aggregatedCards);
    const status =
      modelsWithData.size > 1
        ? `已從 ${modelsWithData.size} 個資料模型載入物件。`
        : `已從 ${[...modelsWithData][0] ?? candidateModels[0]} 模型載入物件。`;
    return { cards, status };
  }

  if (encounteredErrors.length) {
    throw new Error(encounteredErrors[0]);
  }

  return {
    cards: [],
    status: "還沒有同步任何物件。",
  };
}

function detectCardModelCandidates() {
  const runtimeModels = Object.keys(dataClient?.models ?? {});
  const preferred = ["Collection"];
  const ordered = [...preferred, ...runtimeModels];
  return ordered.filter((value, index, array) => value && array.indexOf(value) === index);
}

function dedupeCards(cards) {
  const map = new Map();
  cards.forEach((card, index) => {
    const key = card.id ?? `${card.title}-${index}`;
    if (!map.has(key)) {
      map.set(key, card);
    }
  });
  return Array.from(map.values());
}

function buildNormalizedCards(payload) {
  if (!payload && payload !== 0) return [];

  if (Array.isArray(payload)) {
    return payload.map((entry, index) => createCard(entry, index)).filter(Boolean);
  }

  if (typeof payload === "object") {
    if (Array.isArray(payload.items)) {
      return buildNormalizedCards(payload.items);
    }

    return Object.values(payload)
      .flatMap((item, index) => {
        if (Array.isArray(item)) {
          return buildNormalizedCards(item);
        }
        return createCard(item, index) ?? [];
      })
      .filter(Boolean);
  }

  if (typeof payload === "string" || typeof payload === "number") {
    return String(payload)
      .split(/[\n,;|]/)
      .map((fragment) => fragment.trim())
      .filter(Boolean)
      .map((fragment, index) => createCard(fragment, index))
      .filter(Boolean);
  }

  return [];
}

function createCard(entry, index) {
  if (entry == null) return null;

  if (typeof entry !== "object") return null;

  const property = JSON.parse(entry.property);

  const id = entry.id ??  `card-${index + 1}`;

  const title = property.name ?? `物件 ${index + 1}`;
  const description = property.description ?? "";

  const image = property.image ?? "";

  const mintedSource = property.minted_at ?? entry.date ;

  return finalizeCard(
    {
      id,
      title,
      description,
      image,
      mintedAt: formatMintedAt(mintedSource),
    },
    index
  );
}

function finalizeCard(card, index) {
  const safeTitle = (card.title ?? "").toString().trim();
  if (!safeTitle) return null;

  return {
    id: card.id ? String(card.id) : `card-${index + 1}`,
    title: safeTitle,
    description: (card.description ?? "").toString().trim(),
    image: card.image ? String(card.image) : "",
    mintedAt: card.mintedAt ? String(card.mintedAt) : "",
  };
}

function formatMintedAt(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "";
  }

  try {
    return date.toLocaleString("zh-TW", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return date.toLocaleString();
  }
}

</script>

<style scoped lang="scss">
.dashboard {
  min-height: 100vh;
  padding: clamp(24px, 6vw, 64px);
}

.dashboard__container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
  gap: 16px;
  padding: 24px;
}

.dashboard__header {
  background: rgba(14, 18, 35, 0.9);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 26px 60px rgba(8, 12, 28, 0.45);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: stretch;
  padding: 16px;
  &-title {
    display: flex;
    justify-content: space-between;
    align-items: center;

    flex-wrap: wrap;
    gap: 16px;
  }
}

.dashboard__form {
  display: inline-flex;
  flex-grow: 1;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
}

.dashboard__input {
  min-width: 220px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(5, 6, 15, 0.72);
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
  padding: 14px 20px;
  border-radius: 18px;
  border: none;
  background: linear-gradient(135deg, rgba(233, 30, 99, 0.85), rgba(121, 63, 233, 0.92));
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
  box-shadow: 0 18px 44px rgba(111, 66, 193, 0.35);
}

.dashboard__logout {
  padding: 12px 18px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(5, 6, 15, 0.45);
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
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.24);
  transform: translateY(-1px);
}

.dashboard__messages {
  min-height: 24px;
  display: grid;
  gap: 6px;
  max-width: 680px;
  padding-left: 24px;
}

.dashboard__hint {
  font-size: 0.9rem;
  color: rgba(245, 246, 255, 0.85);
}

.dashboard__error {
  font-size: 0.9rem;
  color: rgba(255, 140, 140, 0.95);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 960px) {
  .dashboard__header {
    justify-content: stretch;
  }

  .dashboard__logout {
    width: 100%;
    text-align: center;
  }
}

@media (max-width: 720px) {
  .dashboard__form {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard__input {
    width: 100%;
  }

  .dashboard__button {
    width: 100%;
  }
}
</style>









