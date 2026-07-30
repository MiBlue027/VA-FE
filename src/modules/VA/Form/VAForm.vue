<script setup lang="ts">
import { ref } from "vue";
import Live2D from "../components/Live2D.vue";
import Http from "../../../miblue/helper/HttpHelper.ts";
import type { F5TtsReqDto } from "../dto/F5TtsDto.ts";
import { HttpConstant } from "../../../app/constants/HttpConstant.ts";

const live2dRef = ref();
const inputQuestion = ref("");
const isLoading = ref(false);

const webhookUrl =
        "http://localhost:5678/webhook-test/ab366f67-73c0-4b4d-8fd2-7f59766860c5";

const baseTTSUrl = "http://localhost:9881";


/**
 * Kirim pertanyaan ke Webhook
 * lalu ambil hasil jawaban dari webhook
 */
async function AskQuestion(): Promise<string> {

    const response = await Http.post<any>(
            webhookUrl,
            "",
            {
                message: inputQuestion.value,
                users_id: 1
            }
    );

    console.log("Webhook response:", response);

    if (response?.output) {
        return response.output;
    }

    if (Array.isArray(response) && response.length > 0) {
        if (response[0]?.output) {
            return response[0].output;
        }

        if (response[0]?.output) {
            return response[0].output;
        }

        if (response[0]?.text) {
            return response[0].text;
        }
    }

    throw new Error("Response webhook tidak memiliki hasil jawaban.");
}


/**
 * Kirim hasil jawaban webhook ke TTS
 */
async function GetTTS(text: string) {

    const request: F5TtsReqDto = {
        ref_audio:
                "I:/Project/Virtual-Assistant-Project/VA-FE/public/assets/audio/VO_Sangonomiya_Kokomi_Chat_-_Fish.wav",

        ref_text:
                "Respect must be given to the will of every creature. Each fish in the ocean swims in its own direction.",

        gen_text: text,
    };

    const response = await Http.post<Blob>(
            baseTTSUrl,
            "/tts",
            request,
            undefined,
            HttpConstant.RESPONSE_TYPE.BLOB
    );

    const blob: Blob = response instanceof Blob
            ? response
            : response;

    await live2dRef.value.playVoice(blob);
}


/**
 * Flow utama:
 *
 * Pertanyaan
 *    ↓
 * Webhook n8n
 *    ↓
 * Jawaban
 *    ↓
 * F5 TTS
 *    ↓
 * Live2D
 */
async function SubmitQuestion() {

    if (!inputQuestion.value.trim()) {
        alert("Masukkan pertanyaan terlebih dahulu!");
        return;
    }

    if (isLoading.value) {
        return;
    }

    isLoading.value = true;

    try {

        console.log("Question:", inputQuestion.value);

        // 1. Kirim pertanyaan ke webhook
        const answer = await AskQuestion();

        console.log("Answer from webhook:", answer);

        // 2. Hasil jawaban dikirim ke TTS
        await GetTTS(answer);

    } catch (error) {

        console.error(
                "Failed to process question:",
                error
        );

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