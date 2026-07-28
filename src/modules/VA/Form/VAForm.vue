<script setup lang="ts">
import { ref } from "vue";
import Live2D from "../components/Live2D.vue";

const live2dRef = ref();

function play() {
    live2dRef.value.playVoice("/assets/audio/VO_Sangonomiya_Kokomi_Chat_-_Fish.wav");
}
</script>

<template>
    <button @click="play">
        Play
    </button>

    <Live2D ref="live2dRef"/>
</template>

<style scoped>

</style>