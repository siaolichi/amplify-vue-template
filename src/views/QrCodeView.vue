<template>
  <main class="qr">
    <section class="qr__card">
      <h1 class="qr__title">Dreamlog 註冊</h1>
      <p class="qr__subtitle">使用手機掃描或點擊下方連結前往註冊頁面。</p>
      <a class="qr__image" target="_blank" rel="noopener">
        <img :src="qrSrc" alt="Dreamlog 註冊連結 QR Code" width="280" height="280" />
      </a>
      <p class="qr__timer">{{ countdown }} 秒後將自動返回首頁</p>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import QRCode from "@/assets/images/qrcode.png";

const router = useRouter();

const targetUrl = "https://dreamlog.io/register-2337306cfbf0a1be67d91b55728f7233b71bbc05";
const qrSrc = QRCode;

const countdown = ref(30);
let intervalId;

onMounted(() => {
  intervalId = window.setInterval(() => {
    if (countdown.value <= 1) {
      clearInterval(intervalId);
      router.replace({ name: "home" });
      return;
    }
    countdown.value -= 1;
  }, 1000);
});

onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<style scoped>
.qr {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: clamp(24px, 5vw, 64px);
  background: linear-gradient(135deg, #05060f, #111a2b 45%, #1f0842 100%);
  color: #f5f6ff;
}

.qr__card {
  display: grid;
  gap: 1.5rem;
  padding: clamp(32px, 6vw, 48px);
  border-radius: 24px;
  backdrop-filter: blur(18px);
  background-color: rgba(12, 15, 31, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 28px 72px rgba(8, 12, 28, 0.45);
}

.qr__title {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 2rem);
}

.qr__subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(245, 246, 255, 0.7);
}

.qr__image {
  display: inline-flex;
  justify-content: center;
  border-radius: 16px;
  padding: 12px;
  background: rgba(5, 6, 15, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.qr__image img {
  display: block;
  width: 100%;
  height: auto;
}

.qr__image:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 36px rgba(9, 11, 23, 0.45);
}

.qr__link {
  color: #7cd1ff;
  font-weight: 600;
  word-break: break-all;
}

.qr__link:hover {
  text-decoration: underline;
}

.qr__timer {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(245, 246, 255, 0.7);
}
</style>
