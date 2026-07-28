<script setup lang="ts">
import { ref } from "vue";
import Live2D from "../components/Live2D.vue";
import Http from "../../../miblue/helper/HttpHelper.ts";
import type { F5TtsReqDto } from "../dto/F5TtsDto.ts";
import {HttpConstant} from "../../../app/constants/HttpConstant.ts";

const live2dRef = ref();
const inputText = ref("");

const baseTTSUrl = "http://localhost:9881";

async function GetTTS() {
    if (!inputText.value.trim()) {
        alert("Masukkan text terlebih dahulu!");
        return;
    }

    const request: F5TtsReqDto = {
        ref_audio:
                "I:/Project/Virtual-Assistant-Project/VA-FE/public/assets/audio/VO_Sangonomiya_Kokomi_Chat_-_Fish.wav",
        ref_text:
                "Respect must be given to the will of every creature. Each fish in the ocean swims in its own direction.",
        gen_text: inputText.value,
    };

    try {
        const response = await Http.post<Blob>(
            baseTTSUrl
            , "/tts"
            , request
            , undefined
            , HttpConstant.RESPONSE_TYPE.BLOB
        );

        const blob: Blob = response instanceof Blob ? response : response;

        await live2dRef.value.playVoice(blob);

    } catch (error) {
        console.error("Failed to generate/play TTS:", error);
    }
}
</script>

<template>
    <div class="tts-container">

        <input
                v-model="inputText"
                type="text"
                placeholder="Masukkan text..."
                @keyup.enter="GetTTS"
        />

        <button @click="GetTTS">
            Generate & Play
        </button>

    </div>

    <Live2D ref="live2dRef" />
</template>

<style scoped>
.tts-container {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

input {
    width: 400px;
    padding: 10px;
}

button {
    padding: 10px 20px;
    cursor: pointer;
}
</style>