<template>
  <div class="collection" aria-labelledby="collection-title" :aria-busy="loadingCards">
    <div class="collection__header">
      <div>
        <h2 id="collection-title" class="collection__title">夢境收藏庫</h2>
        <p class="collection__subtitle">物件收藏</p>
      </div>
      <p class="collection__status">{{ collectionHint }}</p>
    </div>

    <LoadingIndicator v-if="loadingCards" message="同步中..." />
    <template v-else>
      <p v-if="collectionError" class="collection__error" role="alert">
        {{ collectionError }}
      </p>
      <CollectionCards v-else :card-collection="cardCollection" />
    </template>
  </div>
</template>

<script setup>
import CollectionCards from "@/components/CollectionCards.vue";
import LoadingIndicator from "@/components/LoadingIndicator.vue";

defineProps({
  loadingCards: {
    type: Boolean,
    default: false,
  },
  collectionHint: {
    type: String,
    default: "",
  },
  collectionError: {
    type: String,
    default: "",
  },
  cardCollection: {
    type: Array,
    default: () => [],
  },
});
</script>

<style scoped lang="scss">
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

@media (max-width: 960px) {
  .collection__header {
    align-items: flex-start;
  }
}

@media (max-width: 720px) {
  .collection {
    padding: clamp(24px, 6vw, 32px);
  }
}
</style>
