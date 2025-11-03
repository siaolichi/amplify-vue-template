<template>
  <main>
    <!-- <div class="video-background__wrapper" v-if="!showWelcomePage">
      <video
        autoplay
        muted
        playsinline
        class="video-bg"
        @ended="onVideoEnded"
        @play="!showWelcomePage"
      >
        <source
          src="https://s3.eu-central-1.amazonaws.com/dreamlog.io/Dreamlog+Intro+2.mp4"
          type="video/mp4"
        />
      </video>
    </div> -->
    <!-- <div v-if="!showWelcomePage" class="video-background__skip">
      <div class="video-background__skip-button" @click="onClickSkip">SKIP<br />INTRO</div>
    </div> -->
    <TheWelcome v-if="showWelcomePage" />
  </main>
</template>

<script setup>
import { ref } from "vue";
import TheWelcome from "../components/TheWelcome.vue";

const showWelcomePage = ref(true);

function onVideoEnded() {
  showWelcomePage.value = true;
}

function onClickSkip() {
  showWelcomePage.value = true;
}
</script>

<style lang="scss">
main {
  width: 100%;
  height: 100%;
}
.video-background {
  &__wrapper {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }
  &__skip {
    position: fixed;
    right: 100px;
    bottom: 100px;
    cursor: pointer;
    width: 100px;
    height: 100px;
    z-index: 4;
    &-button {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      border-radius: 50%;
      background-color: white;
    }
  }
}

.video-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  min-width: 100%;
  min-height: 100%;
  transform: translate(-50%, -50%);
  object-fit: cover;
  z-index: -1;
}
</style>
