<template>
  <div class="dashboard">
    <WarningCard v-if="showSuccessCard" @on-click="onClickCard" />

    <div class="dashboard__container">
      <div class="dashboard__main">
        <section class="profile" :aria-busy="loadingProfile || savingProfile">
          <div class="profile__avatar-wrap">
            <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="User avatar" class="profile__avatar" />
            <div v-else class="profile__avatar profile__avatar--fallback">{{ avatarInitial }}</div>
          </div>

          <div class="profile__content">
            <div class="profile__header">
              <h2 class="profile__title">個人檔案</h2>
              <div class="profile__actions">
                <button
                  v-if="!isEditing"
                  type="button"
                  class="profile__button"
                  @click="startEditing"
                  :disabled="loadingProfile || savingProfile"
                >
                  編輯資料
                </button>
                <template v-else>
                  <button type="button" class="profile__button" @click="saveProfile" :disabled="savingProfile">
                    {{ savingProfile ? "儲存中..." : "儲存" }}
                  </button>
                  <button
                    type="button"
                    class="profile__button profile__button--ghost"
                    @click="cancelEditing"
                    :disabled="savingProfile"
                  >
                    取消
                  </button>
                </template>
                <button
                  type="button"
                  class="profile__button profile__button--ghost"
                  @click="handleLogout"
                  :disabled="loadingLogout || savingProfile"
                >
                  {{ loadingLogout ? "登出中..." : "登出" }}
                </button>
              </div>
            </div>

            <div class="profile__fields">
              <label class="profile__field">
                <span>暱稱</span>
                <input v-if="isEditing" v-model.trim="draftProfile.nickname" type="text" placeholder="輸入暱稱" />
                <p v-else>{{ profile.nickname || "-" }}</p>
              </label>

              <label class="profile__field">
                <span>興趣</span>
                <input v-if="isEditing" v-model.trim="draftProfile.interest" type="text" placeholder="例如：攝影、旅遊" />
                <p v-else>{{ profile.interest || "-" }}</p>
              </label>

              <label class="profile__field">
                <span>專長</span>
                <input v-if="isEditing" v-model.trim="draftProfile.expertise" type="text" placeholder="例如：前端開發" />
                <p v-else>{{ profile.expertise || "-" }}</p>
              </label>

              <label class="profile__field">
                <span>個性</span>
                <input v-if="isEditing" v-model.trim="draftProfile.personality" type="text" placeholder="例如：冷靜、果斷" />
                <p v-else>{{ profile.personality || "-" }}</p>
              </label>
            </div>

            <div class="appearance" :aria-busy="loadingProfile || savingProfile">
              <div class="appearance__header">
                <h3 class="appearance__title">角色外觀描述</h3>
                <p class="appearance__subtitle">在這裡描述角色的髮型、服裝、配件、特徵與整體氣質。</p>
              </div>

              <label class="appearance__field" for="appearance-description">
                <span class="appearance__label">外觀內容</span>
                <textarea
                  v-if="isEditing"
                  id="appearance-description"
                  v-model.trim="draftProfile.appearance"
                  class="appearance__textarea"
                  placeholder="例如：銀白短髮、深藍長袍、左眼有疤痕、背著黑色長弓..."
                  :disabled="savingProfile"
                  maxlength="1000"
                />
                <p v-else class="appearance__preview">{{ profile.appearance || "-" }}</p>
              </label>

              <div v-if="isEditing" class="appearance__meta">
                <p class="appearance__count">{{ (draftProfile.appearance || "").length }}/1000</p>
              </div>
            </div>

            <div class="dashboard__messages" aria-live="polite">
              <p v-if="profileMessage" class="dashboard__hint">{{ profileMessage }}</p>
              <p v-if="profileError" class="dashboard__error" role="alert">{{ profileError }}</p>
            </div>
          </div>
        </section>

        <Collections
          :loading-cards="loadingCards"
          :collection-hint="collectionHint"
          :collection-error="collectionError"
          :card-collection="cardCollection"
        />
      </div>

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
const errorMessage = ref("");
const loadingLogout = ref(false);

const authStore = useAuthStore();
const router = useRouter();

const loadingProfile = ref(true);
const savingProfile = ref(false);
const isEditing = ref(false);

const profileMessage = ref("");
const profileError = ref("");

const profile = ref({
  avatarUrl: "",
  nickname: "",
  interest: "",
  expertise: "",
  personality: "",
  appearance: "",
});

const draftProfile = ref({
  nickname: "",
  interest: "",
  expertise: "",
  personality: "",
  appearance: "",
});

const loadingCards = ref(true);
const loadingDashboard = computed(() => loadingProfile.value || loadingCards.value);

const cardCollection = ref([]);
const collectionError = ref("");
const collectionStatus = ref("");

const avatarInitial = computed(() => {
  const source = (profile.value.nickname || "U").trim();
  return source ? source.charAt(0).toUpperCase() : "U";
});

const collectionHint = computed(() => {
  if (loadingDashboard.value) {
    return "載入收藏中...";
  }
  if (cardCollection.value.length) {
    return `目前共有 ${cardCollection.value.length} 張卡片`;
  }
  return collectionStatus.value || "目前沒有可顯示的收藏";
});

onMounted(() => {
  loadProfile();
  loadCardCollection();
});

async function loadProfile() {
  loadingProfile.value = true;
  profileError.value = "";

  try {
    const attributes = await fetchUserAttributes();

    const nextProfile = {
      avatarUrl: attributes?.picture ?? attributes?.["custom:avatarUrl"] ?? "",
      nickname: attributes?.nickname ?? "",
      interest: attributes?.["custom:interest"] ?? "",
      expertise: attributes?.["custom:expertise"] ?? "",
      personality: attributes?.["custom:personality"] ?? "",
      appearance: attributes?.["custom:appearance"] ?? "",
    };

    profile.value = nextProfile;
    draftProfile.value = {
      nickname: nextProfile.nickname,
      interest: nextProfile.interest,
      expertise: nextProfile.expertise,
      personality: nextProfile.personality,
      appearance: nextProfile.appearance,
    };
  } catch (error) {
    const fallbackMessage = error?.message ?? "讀取使用者資料失敗，請稍後再試。";
    profileError.value = fallbackMessage;
    if (import.meta?.env?.DEV) {
      console.debug("Failed to load profile:", error);
    }
  } finally {
    loadingProfile.value = false;
  }
}

function startEditing() {
  profileMessage.value = "";
  profileError.value = "";
  draftProfile.value = {
    nickname: profile.value.nickname,
    interest: profile.value.interest,
    expertise: profile.value.expertise,
    personality: profile.value.personality,
    appearance: profile.value.appearance,
  };
  isEditing.value = true;
}

function cancelEditing() {
  isEditing.value = false;
  draftProfile.value = {
    nickname: profile.value.nickname,
    interest: profile.value.interest,
    expertise: profile.value.expertise,
    personality: profile.value.personality,
    appearance: profile.value.appearance,
  };
}

async function saveProfile() {
  savingProfile.value = true;
  profileError.value = "";
  profileMessage.value = "";

  try {
    const next = {
      nickname: draftProfile.value.nickname.trim(),
      interest: draftProfile.value.interest.trim(),
      expertise: draftProfile.value.expertise.trim(),
      personality: draftProfile.value.personality.trim(),
      appearance: draftProfile.value.appearance.trim(),
    };

    await updateUserAttribute({
      userAttribute: {
        attributeKey: "nickname",
        value: next.nickname,
      },
    });

    await updateUserAttribute({
      userAttribute: {
        attributeKey: "custom:interest",
        value: next.interest,
      },
    });

    await updateUserAttribute({
      userAttribute: {
        attributeKey: "custom:expertise",
        value: next.expertise,
      },
    });

    await updateUserAttribute({
      userAttribute: {
        attributeKey: "custom:personality",
        value: next.personality,
      },
    });

    await updateUserAttribute({
      userAttribute: {
        attributeKey: "custom:appearance",
        value: next.appearance,
      },
    });

    profile.value = {
      ...profile.value,
      ...next,
    };

    isEditing.value = false;
    profileMessage.value = "個人資料已更新。";
  } catch (error) {
    errorMessage.value = error?.message ?? "更新個人資料失敗，請稍後再試。";
    console.error("Failed to save profile:", error);
  } finally {
    savingProfile.value = false;
  }
}

async function handleLogout() {
  if (!authStore?.logout || loadingLogout.value) return;

  loadingLogout.value = true;
  profileMessage.value = "";
  profileError.value = "";

  try {
    await authStore.logout();
    router.push({ name: "home" });
  } catch (error) {
    errorMessage.value = error?.message ?? "登出失敗，請稍後再試。";
  } finally {
    loadingLogout.value = false;
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
    collectionError.value = error?.message ?? "載入收藏失敗，請稍後再試。";
    if (import.meta?.env?.DEV) {
      console.debug("Failed to load collection:", error);
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
    return { cards: [], status: "找不到可用的卡片資料模型" };
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
      encounteredErrors.push(error?.message ?? `讀取 ${modelName} 模型資料失敗`);
    }
  }

  if (aggregatedCards.length) {
    const cards = dedupeCards(aggregatedCards);
    const status =
      modelsWithData.size > 1
        ? `已從 ${modelsWithData.size} 個模型整合收藏`
        : `已從 ${[...modelsWithData][0] ?? candidateModels[0]} 取得收藏`;
    return { cards, status };
  }

  if (encounteredErrors.length) {
    throw new Error(encounteredErrors[0]);
  }

  return {
    cards: [],
    status: "尚無收藏資料",
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

  return [];
}

function createCard(entry, index) {
  if (entry == null || typeof entry !== "object") return null;

  const id =
    entry.id ??
    entry.tokenId ??
    entry.tokenID ??
    entry.slug ??
    entry.key ??
    entry.uuid ??
    entry.code ??
    `card-${index + 1}`;

  const property = parseProperty(entry.property);
  const title = property.name ?? entry.title ?? `Card ${index + 1}`;
  const description = property.description ?? entry.description ?? "";
  const image = property.image ?? entry.image ?? "";
  const mintedSource = property.minted_at ?? entry.createdAt ?? entry.date;

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

function parseProperty(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return {};
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

.dashboard__main {
  display: grid;
  gap: 16px;
}

.profile {
  background: rgba(14, 18, 35, 0.9);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 26px 60px rgba(8, 12, 28, 0.45);
  padding: 20px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
}

.profile__avatar-wrap {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.profile__avatar {
  width: 250px;
  height: 250px;
  border-radius: 30px;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.14);
  background: rgba(5, 6, 15, 0.72);
}

.profile__avatar--fallback {
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 3rem;
  font-weight: 700;
}

.profile__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.profile__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.profile__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.profile__button {
  padding: 10px 14px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, rgba(233, 30, 99, 0.85), rgba(121, 63, 233, 0.92));
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.profile__button--ghost {
  background: rgba(5, 6, 15, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.profile__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.profile__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.profile__field {
  display: grid;
  gap: 6px;
}

.profile__field span {
  font-size: 0.82rem;
  color: rgba(245, 246, 255, 0.72);
}

.profile__field input {
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(5, 6, 15, 0.72);
  color: #f5f6ff;
}

.profile__field p {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(5, 6, 15, 0.45);
  min-height: 40px;
  display: flex;
  align-items: center;
}

.appearance {
  display: flex;
  flex-direction: column;
  min-height: 360px;
}

.appearance__header {
  padding: 10px 0;
}

.appearance__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
}

.appearance__field {
  display: grid;
  gap: 6px;
  flex-grow: 1;
  grid-template-rows: 1.2rem 1fr;
}

.appearance__label {
  font-size: 0.82rem;
  color: rgba(245, 246, 255, 0.72);
}

.appearance__textarea {
  width: 100%;
  min-height: 320px;
  resize: vertical;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(5, 6, 15, 0.72);
  color: #f5f6ff;
  padding: 12px 14px;
  line-height: 1.5;
}

.appearance__preview {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(5, 6, 15, 0.45);
  min-height: 120px;
  white-space: pre-wrap;
  line-height: 1.5;
}

.appearance__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.appearance__count {
  margin: 0;
  color: rgba(245, 246, 255, 0.72);
  font-size: 0.82rem;
}

.dashboard__messages {
  min-height: 24px;
  display: grid;
  gap: 6px;
}

.dashboard__hint {
  font-size: 0.9rem;
  color: rgba(245, 246, 255, 0.85);
}

.dashboard__error {
  font-size: 0.9rem;
  color: rgba(255, 140, 140, 0.95);
}

@media (max-width: 960px) {
  .profile {
    grid-template-columns: 1fr;
  }

  .profile__avatar-wrap {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .profile__fields {
    grid-template-columns: 1fr;
  }

  .dashboard {
    padding: 16px;
  }

  .dashboard__container {
    padding: 12px;
  }
}
</style>
