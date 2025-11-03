<template>
  <div ref="container" class="three-logo" aria-hidden="true"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  AmbientLight,
  Clock,
  Color,
  DirectionalLight,
  Group,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  MeshStandardMaterial,
  DirectionalLightHelper,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import logoModelUrl from "@/assets/models/logo.glb";

const container = ref(null);

let renderer;
let scene;
let camera;
let animationFrameId;
let logoGroup;
const clock = new Clock();

const target = new Vector3(0, 0, 0);

function initRenderer() {
  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0xffffff, 0);
}

function initScene() {
  scene = new Scene();
  scene.background = null;

  const ambient = new AmbientLight(0xffffff);
  scene.add(ambient);

  const keyLight = new DirectionalLight(0xffffff, 20);
  keyLight.position.set(4, 2, 3);
  scene.add(keyLight);

  const fillLight = new DirectionalLight(0xffffff, 10);
  fillLight.position.set(-4, -3, -6);
  scene.add(fillLight);

  const helper = new DirectionalLightHelper(keyLight, 5);
  scene.add(helper);
}

function initCamera(width, height) {
  camera = new PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 6);
  // camera.lookAt(target);
}

function resizeRenderer() {
  if (!renderer || !camera) return;

  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  if (logoGroup) {
    logoGroup.rotation.y = elapsed * 0.4;
    logoGroup.rotation.x = Math.sin(elapsed * 0.6) * 0.08;
  }

  renderer.render(scene, camera);
}

function disposeScene() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  window.removeEventListener("resize", resizeRenderer);

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss?.();
    renderer.domElement?.remove();
  }
  if (scene) {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (child.material?.dispose) {
          child.material.dispose();
        }
      }
    });
  }
}

onMounted(() => {
  if (!container.value) return;
  initRenderer();
  initScene();
  initCamera(window.innerWidth || 1, window.innerHeight || 1);

  container.value.appendChild(renderer.domElement);
  renderer.domElement.style.background = "transparent";
  resizeRenderer();
  window.addEventListener("resize", resizeRenderer);

  const loader = new GLTFLoader();
  loader.load(
    logoModelUrl,
    (gltf) => {
      const baseMaterial = new MeshStandardMaterial({
        color: 0xe0b3ff,
        metalness: 1,
        roughness: 0,
        emissive: 0xffffff,
        emissiveIntensity: 0,
      });

      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.material?.dispose?.();
          child.material = baseMaterial.clone();
        }
      });

      logoGroup = new Group();
      logoGroup.add(gltf.scene);
      gltf.scene.position.set(0, 0, 0);
      scene.add(logoGroup);
      animate();
    },
    undefined,
    () => {
      animate();
    }
  );
});

onBeforeUnmount(() => {
  disposeScene();
});
</script>

<style scoped>
.three-logo {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  width: 100vw;
  height: 100vh;
}

.three-logo canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
