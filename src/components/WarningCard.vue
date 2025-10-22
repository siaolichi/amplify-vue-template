<template>
  <div class="warning-card">
    <MDBCard class="warning-card__card" text="center">
      <MDBCardBody>
        <MDBCardTitle>COMING SOON</MDBCardTitle>
        <MDBCardText> 稍等片刻，夢域誌即將啟動 </MDBCardText>
        <MDBBtn color="primary" type="button" @click="onClick">收到</MDBBtn>
      </MDBCardBody>
    </MDBCard>
  </div>
</template>

<script setup>
import { MDBCard, MDBCardBody, MDBCardTitle, MDBCardText, MDBBtn } from "mdb-vue-ui-kit";

const emit = defineEmits(["onClick"]);

function onClick() {
  emit("onClick");
}
</script>

<style lang="scss" scoped>
.warning-card {
  width: 100vw;
  height: 100vh;
  background-color: rgba($color: black, $alpha: 0.5);
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  color: black;

  &__card {
    z-index: 2;
  }
}
</style>
