<script setup>
import { RouterView } from "vue-router";
import ThreeLogo from "@/components/ThreeLogo.vue";
</script>

<template div="app">
  <!-- <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </div>
  </header> -->

  <ThreeLogo />
  <main class="app__content">
    <RouterView />
  </main>
</template>

<style>
#app {
  background: radial-gradient(circle at 15% 20%, rgba(68, 63, 233, 0.14), transparent 52%),
    radial-gradient(circle at 80% 0%, rgba(233, 30, 99, 0.18), transparent 56%), #05060f;
}
header {
  line-height: 1.5;
  max-height: 100vh;
  position: fixed;
}

.app__content {
  position: relative;
  z-index: 1;
}
</style>
