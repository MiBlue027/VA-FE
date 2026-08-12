<script setup lang="ts">

defineProps<{
    layers: [string | null, string | null];
    activeLayer: 0 | 1;
}>();
</script>

<template>
    <div class="assistant-background">
        <div class="bg-base"></div>
        <div
                class="bg-image-layer"
                :class="{ visible: activeLayer === 0 && layers[0] }"
                :style="layers[0] ? { backgroundImage: `url(${layers[0]})` } : {}"
        ></div>
        <div
                class="bg-image-layer"
                :class="{ visible: activeLayer === 1 && layers[1] }"
                :style="layers[1] ? { backgroundImage: `url(${layers[1]})` } : {}"
        ></div>
        <div class="bg-scrim"></div>
        <div class="background-glow glow-one"></div>
        <div class="background-glow glow-two"></div>
        <div class="background-grid"></div>
    </div>
</template>

<style scoped>
.assistant-background {
    position: absolute;
    inset: 0;
    z-index: 0;
}

.bg-base {
    position: absolute;
    inset: 0;
    z-index: 0;

    background:
            radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.14), transparent 45%),
            radial-gradient(circle at 80% 85%, rgba(139, 92, 246, 0.10), transparent 50%),
            linear-gradient(180deg, #0c0c10 0%, #09090b 55%, #060608 100%);
}

.bg-image-layer {
    position: absolute;
    inset: 0;
    z-index: 1;

    background-size: cover;
    background-position: center;

    opacity: 0;

    transition: opacity 0.7s ease;

    pointer-events: none;
}

.bg-image-layer.visible {
    opacity: 1;
}

.bg-scrim {
    position: absolute;
    inset: 0;
    z-index: 2;

    background:
            linear-gradient(180deg, rgba(6, 6, 8, 0.55) 0%, rgba(6, 6, 8, 0.05) 22%, rgba(6, 6, 8, 0.05) 60%, rgba(6, 6, 8, 0.65) 100%),
            radial-gradient(circle at 50% 45%, transparent 35%, rgba(6, 6, 8, 0.35) 100%);

    pointer-events: none;
}

.background-glow {
    position: absolute;
    z-index: 3;

    width: 500px;
    height: 500px;

    border-radius: 50%;

    filter: blur(120px);

    pointer-events: none;

    opacity: 0.12;
}

.glow-one {
    top: 20%;
    left: 25%;

    background: #6366f1;
}

.glow-two {
    right: 20%;
    bottom: 10%;

    background: #8b5cf6;
}

.background-grid {
    position: absolute;
    inset: 0;
    z-index: 3;

    pointer-events: none;

    background-image:
            linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);

    background-size: 48px 48px;

    mask-image: radial-gradient(circle at 50% 40%, black, transparent 75%);
}
</style>