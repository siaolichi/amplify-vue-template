<template>
  <div class="dashboard" :style="{ backgroundImage: `url(${bgImage})` }">
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
      <div class="collection" aria-labelledby="collection-title" :aria-busy="loadingCards">
        <div class="collection__header">
          <div>
            <h2 id="collection-title" class="collection__title">夢境收藏庫</h2>
            <p class="collection__subtitle">物件收藏</p>
          </div>
          <p class="collection__status">{{ collectionHint }}</p>
        </div>

        <LoadingIndicator v-if="loadingCards" message="載入收藏中..." />
        <template v-else>
          <p v-if="collectionError" class="collection__error" role="alert">
            {{ collectionError }}
          </p>
          <div v-else class="card-grid" role="list">
            <article v-for="card in cardCollection" :key="card.id" class="card-grid__item" role="listitem">
              <div class="card-grid__frame" :class="`card-grid__frame--${card.rarityClass}`">
                <div v-if="card.image" class="card-grid__image">
                  <img :src="card.image" :alt="`${card.title} 圖像`" loading="lazy" />
                </div>
                <div class="card-grid__body">
                  <span v-if="card.rarity" class="card-grid__rarity">{{ card.rarity }}</span>
                  <h3 class="card-grid__title">{{ card.title }}</h3>
                  <p v-if="card.description" class="card-grid__description">
                    {{ card.description }}
                  </p>
                  <ul v-if="card.traits.length" class="card-grid__traits">
                    <li v-for="trait in card.traits" :key="trait.key" class="card-grid__trait">
                      <span class="card-grid__trait-label">{{ trait.label }}</span>
                      <span class="card-grid__trait-value">{{ trait.value }}</span>
                    </li>
                  </ul>
                  <p v-if="card.mintedAt" class="card-grid__minted">鑄造於 {{ card.mintedAt }}</p>
                </div>
              </div>
            </article>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { fetchUserAttributes, updateUserAttribute } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";

import LoadingIndicator from "@/components/LoadingIndicator.vue";
import WarningCard from "@/components/WarningCard.vue";
import { useAuthStore } from "../stores/auth";
import bgImage from "@/assets/images/logo.png";

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
  const preferred = ["Card", "Cards", "NFTCard", "NftCard", "NftCollection", "Collection"];
  const ordered = [...preferred, ...runtimeModels];
  return ordered.filter((value, index, array) => value && array.indexOf(value) === index);
}

function dedupeCards(cards) {
  const map = new Map();
  cards.forEach((card) => {
    const key = card.id ?? `${card.title}-${card.rarity}`;
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

  const title =
    entry.title ??
    entry.name ??
    entry.cardName ??
    entry.displayName ??
    entry.label ??
    entry.nickname ??
    `物件 ${index + 1}`;

  const rarity = entry.rarity ?? entry.tier ?? entry.rank ?? entry.grade ?? entry.level ?? "";
  const description =
    entry.description ?? entry.story ?? entry.flavorText ?? entry.detail ?? entry.summary ?? entry.text ?? "";

  const image = entry.image ?? entry.imageUrl ?? entry.imageURL ?? entry.art ?? entry.artwork ?? entry.thumbnail ?? "";

  const mintedSource =
    entry.mintedAt ?? entry.createdAt ?? entry.timestamp ?? entry.mintTime ?? entry.minted_at ?? entry.date;

  const cardTraits = entry.traits ?? entry.attributes ?? entry.properties ?? entry.stats ?? entry.features;

  return finalizeCard(
    {
      id,
      title,
      rarity,
      description,
      image,
      mintedAt: formatMintedAt(mintedSource),
      traits: buildTraits(cardTraits),
    },
    index
  );
}

function finalizeCard(card, index) {
  const safeTitle = (card.title ?? "").toString().trim();
  if (!safeTitle) return null;

  const rarityLabel = (card.rarity ?? "").toString().trim();

  return {
    id: card.id ? String(card.id) : `card-${index + 1}`,
    title: safeTitle,
    rarity: rarityLabel,
    rarityClass: mapRarityToClass(rarityLabel),
    description: (card.description ?? "").toString().trim(),
    image: card.image ? String(card.image) : "",
    traits: Array.isArray(card.traits) ? card.traits : [],
    mintedAt: card.mintedAt ? String(card.mintedAt) : "",
  };
}

function buildTraits(source) {
  if (!source && source !== 0) return [];

  if (Array.isArray(source)) {
    return source.map((trait, index) => normalizeTrait(trait, index)).filter(Boolean);
  }

  if (typeof source === "object") {
    return Object.entries(source)
      .map(([label, value], index) => {
        const stringValue = value == null ? "" : String(value).trim();
        if (!stringValue) return null;
        return {
          key: `trait-${label}-${index}`,
          label: label || `特性 ${index + 1}`,
          value: stringValue,
        };
      })
      .filter(Boolean);
  }

  if (typeof source === "string" || typeof source === "number") {
    return String(source)
      .split(/[\n,;|]/)
      .map((fragment) => fragment.trim())
      .filter(Boolean)
      .map((value, index) => ({
        key: `trait-${index}`,
        label: "特性",
        value,
      }));
  }

  return [];
}

function normalizeTrait(trait, index) {
  if (trait == null) return null;

  if (typeof trait === "string" || typeof trait === "number") {
    const value = String(trait).trim();
    if (!value) return null;
    return {
      key: `trait-${index}`,
      label: "特性",
      value,
    };
  }

  if (typeof trait === "object") {
    const label = trait.label ?? trait.trait_type ?? trait.type ?? trait.name ?? trait.category ?? `特性 ${index + 1}`;
    const value =
      trait.value ?? trait.displayValue ?? trait.display_value ?? trait.amount ?? trait.score ?? trait.level;

    if (value == null || value === "") return null;

    return {
      key: String(trait.id ?? trait.key ?? `${label}-${value}-${index}`),
      label: String(label || `特性 ${index + 1}`),
      value: String(value),
    };
  }

  return null;
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

function mapRarityToClass(rarity) {
  const normalized = rarity?.toString().trim().toLowerCase();

  if (!normalized) return "common";
  if (normalized.includes("legendary") || normalized.includes("傳奇")) return "legendary";
  if (normalized.includes("mythic") || normalized.includes("神話")) return "legendary";
  if (normalized.includes("epic") || normalized.includes("史詩")) return "epic";
  if (normalized.includes("rare") || normalized.includes("稀有")) return "rare";
  if (normalized.includes("uncommon") || normalized.includes("罕見")) return "uncommon";

  return "common";
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

.collection {
  background: rgba(12, 15, 28, 0.88);
  border-radius: 36px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 34px 80px rgba(8, 12, 28, 0.45);
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.collection__header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-end;
}

.collection__title {
  font-size: clamp(1.7rem, 3.2vw, 2rem);
  font-weight: 700;
}

.collection__subtitle {
  color: rgba(245, 246, 255, 0.68);
  line-height: 1.6;
}

.collection__status {
  font-size: 0.92rem;
  color: rgba(245, 246, 255, 0.78);
  font-weight: 600;
  letter-spacing: 0.3px;
}

.collection__error {
  font-size: 0.9rem;
  color: rgba(255, 144, 144, 0.96);
  font-weight: 600;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: clamp(18px, 2vw, 26px);
}

.card-grid__item {
  position: relative;
}

.card-grid__frame {
  position: relative;
  padding: 20px;
  border-radius: 26px;
  background: linear-gradient(160deg, rgba(18, 24, 52, 0.92), rgba(11, 14, 28, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 260px;
  backdrop-filter: blur(18px);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.card-grid__frame:hover {
  transform: translateY(-4px);
  box-shadow: 0 26px 60px rgba(12, 14, 28, 0.45);
}

.card-grid__frame--common {
  border-color: rgba(255, 255, 255, 0.12);
}

.card-grid__frame--uncommon {
  border-color: rgba(104, 219, 182, 0.45);
  box-shadow: 0 0 0 1px rgba(104, 219, 182, 0.35);
}

.card-grid__frame--rare {
  border-color: rgba(122, 174, 255, 0.55);
  box-shadow: 0 0 0 1px rgba(122, 174, 255, 0.4);
}

.card-grid__frame--epic {
  border-color: rgba(191, 122, 255, 0.6);
  box-shadow: 0 0 0 1px rgba(191, 122, 255, 0.45);
  background: linear-gradient(160deg, rgba(39, 16, 53, 0.85), rgba(12, 17, 38, 0.92));
}

.card-grid__frame--legendary {
  border-color: rgba(255, 196, 113, 0.7);
  box-shadow: 0 0 0 1px rgba(255, 196, 113, 0.5), 0 18px 50px rgba(255, 196, 113, 0.25);
  background: linear-gradient(160deg, rgba(55, 24, 3, 0.88), rgba(18, 14, 32, 0.92));
}

.card-grid__image {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.card-grid__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card-grid__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-grid__rarity {
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.72rem;
  letter-spacing: 0.4px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.92);
  text-transform: uppercase;
}

.card-grid__title {
  font-size: 1.05rem;
  font-weight: 700;
}

.card-grid__description {
  font-size: 0.9rem;
  color: rgba(245, 246, 255, 0.78);
  line-height: 1.6;
}

.card-grid__traits {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.card-grid__trait {
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(7, 10, 24, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-grid__trait-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(245, 246, 255, 0.56);
}

.card-grid__trait-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(245, 246, 255, 0.92);
}

.card-grid__minted {
  font-size: 0.8rem;
  color: rgba(245, 246, 255, 0.6);
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

  .collection__header {
    align-items: flex-start;
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

  .collection {
    padding: clamp(24px, 6vw, 32px);
  }

  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}
</style>
