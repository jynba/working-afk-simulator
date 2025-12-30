<template>
  <div class="live2d-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  modelUrl: {
    type: String,
    required: true,
  },
  mouseX: {
    type: Number,
    required: true,
  },
  mouseY: {
    type: Number,
    required: true,
  },
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
let app: any | null = null;
let live2dModel: any | null = null;



const init = async () => {
  const PIXI = (window as any).PIXI;
  if (!PIXI) {
    console.error("PIXI is not available.");
    return;
  }

  app = new PIXI.Application({
    view: canvasRef.value,
    autoStart: true,
    backgroundAlpha: 0,
    resizeTo: canvasRef.value?.parentElement || undefined
  });

  await loadModel(props.modelUrl);
};

const loadModel = async (url: string) => {
  const PIXI = (window as any).PIXI;
  if (!app || !PIXI || !PIXI.live2d) return;

  app.stage.removeChildren();

  try {
    live2dModel = await PIXI.live2d.Live2DModel.from(url);
    app.stage.addChild(live2dModel);

    // Adjust scale and position to fit the container
    const container = canvasRef.value?.parentElement;
    if (container && live2dModel) {
      const scale = Math.min(container.clientWidth / live2dModel.width, container.clientHeight / live2dModel.height) * 0.7;
      live2dModel.scale.set(scale);
      live2dModel.x = (container.clientWidth - live2dModel.width * scale) / 2 - 26;
      live2dModel.y = (container.clientHeight - live2dModel.height * scale) / 2 - 70;
    }

    live2dModel.on('hit', (hitAreas: string[]) => {
      if (hitAreas.includes('Body')) {
        live2dModel.motion('TapBody');
      }
    });
  } catch (error) {
    console.error('Failed to load Live2D model:', error);
  }
};

onMounted(() => {
  // A simple check to see if PIXI is available, with a small delay.
  const checkPIXI = () => {
    if ((window as any).PIXI && (window as any).PIXI.live2d) {
      init();
    } else {
      setTimeout(checkPIXI, 100);
    }
  };
  checkPIXI();
});

onUnmounted(() => {
  if (app) {
    app.destroy(true, { children: true, texture: true, baseTexture: true });
  }
});

watch(() => props.modelUrl, (newUrl) => {
  if (newUrl && app) {
    loadModel(newUrl);
  }
});

watch([() => props.mouseX, () => props.mouseY], ([x, y]) => {
  if (live2dModel && live2dModel.internalModel?.coreModel) {
    const coreModel = live2dModel.internalModel.coreModel;

    // Get window dimensions
    const viewX = window.innerWidth / 2;
    const viewY = window.innerHeight / 2;

    // Calculate distance from center and map to -1 to 1 range
    const tX = (x - viewX) / viewX;
    const tY = (y - viewY) / viewY;

    // Define a multiplier for sensitivity
    const angleMultiplier = 30;
    const eyeMultiplier = 1;

    // Update model parameters
    coreModel.setParameterValueById('ParamAngleX', tX * angleMultiplier);
    coreModel.setParameterValueById('ParamAngleY', -tY * angleMultiplier);
    coreModel.setParameterValueById('ParamEyeBallX', tX * eyeMultiplier);
    coreModel.setParameterValueById('ParamEyeBallY', -tY * eyeMultiplier);
  }
});

</script>

<style scoped>
.live2d-container {
  width: 100%;
  height: 100%;
}

canvas {
  width: 100%;
  height: 100%;
  /* -webkit-app-region: drag; */
  /* Enable window dragging only on the model */
  pointer-events: auto;
  /* Re-enable pointer events for the canvas itself */
}
</style>
