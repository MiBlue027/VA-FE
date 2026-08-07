<script setup lang="ts">
import { ref } from "vue";
import Live2D from "../components/Live2D.vue";
import {AgenticService} from "../service/AgenticService.ts";
import {F5TTSService} from "../service/F5TTSService.ts";

const live2dRef = ref();
const inputQuestion = ref("");
const isLoading = ref(false);
const isUseStreamTTS = false;

const agenticSvc = new AgenticService({
    webhookUrl: "http://localhost:5678/webhook/agent"
})

const f5ttsSvc = new F5TTSService({
    ttsBaseUrl: "http://localhost:9881"
    , singleResEndpoint: "/tts"
    , wsBaseUrl: "ws://localhost:9881"
    , streamResEndpoint: "ws_tts"
    , live2dRef: live2dRef
})

async function SubmitQuestion() {
    if (isLoading.value) {
        return;
    }

    const question = inputQuestion.value.trim()
    if (!question) {
        alert("Masukkan pertanyaan terlebih dahulu!");
        return;
    }

    isLoading.value = true;

    try {
        console.log("Question:", question);

        const answer = await agenticSvc.AskQuestion(question, 1)

        console.log("Answer from webhook:", answer);

        if (isUseStreamTTS){
            await f5ttsSvc.StreamTTS(answer);
        }
        else {
            await f5ttsSvc.ChunkTTS(answer);
        }

    } catch (error) {
        console.error("Failed to process:", error);
    } finally {
        isLoading.value = false;
    }
}
</script>


<template>

    <div class="tts-container">

        <input
                v-model="inputQuestion"
                type="text"
                placeholder="Masukkan pertanyaan..."
                :disabled="isLoading"
                @keyup.enter="SubmitQuestion"
        />

        <button
                @click="SubmitQuestion"
                :disabled="isLoading"
        >
            {{ isLoading ? "Processing..." : "Tanya" }}
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

button:disabled,
input:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

</style>