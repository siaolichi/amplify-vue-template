<template>
  <div class="dashboard">
    <WarningCard v-if="showSuccessCard" @on-click="onClickCard" />

    <div class="dashboard__container">
      <section class="profile" :aria-busy="loadingProfile">
        <div class="profile__avatar-wrap">
          <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="User avatar" class="profile__avatar" />
          <div v-else class="profile__avatar profile__avatar--fallback">{{ avatarInitial }}</div>
        </div>

        <div class="profile__content">
          <div class="profile__header">
            <h2 class="profile__title">個人檔案</h2>
            <div class="profile__actions">
              <button v-if="!isEditing" type="button" class="profile__button" @click="startEditing" :disabled="loadingProfile || savingProfile">
                編輯
              </button>
              <template v-else>
                <button type="button" class="profile__button" @click="saveProfile" :disabled="savingProfile">
                  {{ savingProfile ? "儲存中..." : "儲存" }}
                </button>
                <button type="button" class="profile__button profile__button--ghost" @click="cancelEditing" :disabled="savingProfile">
                  取消
                </button>
              </template>
              <button type="button" class="profile__button profile__button--ghost" @click="handleLogout" :disabled="loadingLogout || savingProfile">
                {{ loadingLogout ? "登出中..." : "登出" }}
              </button>
            </div>
          </div>

          <div class="profile__fields">
            <label class="profile__field">
              <span>暱稱</span>
              <input v-if="isEditing" v-model.trim="draftProfile.nickname" type="text" placeholder="暱稱" />
              <p v-else>{{ profile.nickname || "-" }}</p>
            </label>

            <label class="profile__field">
              <span>興趣</span>
              <input v-if="isEditing" v-model.trim="draftProfile.interest" type="text" placeholder="興趣愛好" />
              <p v-else>{{ profile.interest || "-" }}</p>
            </label>

            <label class="profile__field">
              <span>專長</span>
              <input v-if="isEditing" v-model.trim="draftProfile.expertise" type="text" placeholder="專長" />
              <p v-else>{{ profile.expertise || "-" }}</p>
            </label>

            <label class="profile__field">
              <span>個性</span>
              <input v-if="isEditing" v-model.trim="draftProfile.personality" type="text" placeholder="個性特質" />
              <p v-else>{{ profile.personality || "-" }}</p>
            </label>
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
});

const draftProfile = ref({
  nickname: "",
  interest: "",
  expertise: "",
  personality: "",
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
    return "同步資料中...";
  }
  if (cardCollection.value.length) {
    return `目前擁有 ${cardCollection.value.length} 個物件`;
  }
  return collectionStatus.value || "還沒有同步任何物件。";
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
    };

    profile.value = nextProfile;
    draftProfile.value = {
      nickname: nextProfile.nickname,
      interest: nextProfile.interest,
      expertise: nextProfile.expertise,
      personality: nextProfile.personality,
    };
  } catch (error) {
    profileError.value = error?.message ?? "Ū���򥻸�ƥ���";
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

    profile.value = {
      ...profile.value,
      ...next,
    };

    isEditing.value = false;
    profileMessage.value = "角色資料更新成功";
  } catch (error) {
    errorMessage.value = error?.message ?? "更新角色資料時發生錯誤，請稍後再試。";
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
    errorMessage.value = error?.message ?? "登出時發生錯誤，請稍後再試。";
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
    collectionError.value = error?.message ?? "讀取物件資料時發生錯誤，請稍後再試。";
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

  if (typeof entry === "string" || typeof entry === "number") {
    const title = String(entry).trim();
    if (!title) return null;
    return finalizeCard(
      {
        id: `card-${index + 1}`,
        title,
      },
      index
    );
  }

  if (typeof entry !== "object") return null;

  const id =
    entry.id ??
    entry.tokenId ??
    entry.tokenID ??
    entry.slug ??
    entry.key ??
    entry.uuid ??
    entry.code ??
    `card-${index + 1}`;

  const title = entry.title ?? entry.name ?? entry.cardName ?? entry.displayName ?? entry.label ?? entry.nickname ?? `Card ${index + 1}`;

  const description =
    entry.description ?? entry.story ?? entry.flavorText ?? entry.detail ?? entry.summary ?? entry.text ?? "";

  const image = entry.image ?? entry.imageUrl ?? entry.imageURL ?? entry.art ?? entry.artwork ?? entry.thumbnail ?? "";

  const mintedSource =
    entry.mintedAt ?? entry.createdAt ?? entry.timestamp ?? entry.mintTime ?? entry.minted_at ?? entry.date;

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

.profile {
  background: rgba(14, 18, 35, 0.9);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 26px 60px rgba(8, 12, 28, 0.45);
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr 2fr;
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
}
</style>
