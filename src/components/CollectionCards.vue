<template>
  <div class="card-grid" role="list">
    <article v-for="card in cardCollection" :key="card.id" class="card-grid__item" role="listitem">
      <div class="card-grid__frame">
        <div v-if="card.image" class="card-grid__image">
          <img :src="card.image" :alt="`${card.title} image`" loading="lazy" />
        </div>
        <div class="card-grid__body">
          <h3 class="card-grid__title">{{ card.title }}</h3>
          <p v-if="card.description" class="card-grid__description">
            {{ card.description }}
          </p>
          <p v-if="card.mintedAt" class="card-grid__minted">Minted at {{ card.mintedAt }}</p>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
defineProps({
  cardCollection: {
    type: Array,
    default: () => [],
  },
});
</script>

<style scoped lang="scss">
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

.card-grid__title {
  font-size: 1.05rem;
  font-weight: 700;
}

.card-grid__description {
  font-size: 0.9rem;
  color: rgba(245, 246, 255, 0.78);
  line-height: 1.6;
}

.card-grid__minted {
  font-size: 0.8rem;
  color: rgba(245, 246, 255, 0.6);
}

@media (max-width: 720px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}
</style>
