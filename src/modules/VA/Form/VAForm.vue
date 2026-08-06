<script setup lang="ts">
import { ref } from "vue";
import Live2D from "../components/Live2D.vue";
import Http from "../../../miblue/helper/HttpHelper.ts";
import type { F5TtsReqDto } from "../dto/F5TtsDto.ts";
import { HttpConstant } from "../../../app/constants/HttpConstant.ts";
import type {N8nAgentReq, N8nAgentRes} from "../dto/N8nDto.ts";
import {Chunker} from "../../../miblue/helper/Chunker.ts";

const live2dRef = ref();
const inputQuestion = ref("");
const isLoading = ref(false);

const webhookUrl = "http://localhost:5678/webhook-test/ab366f67-73c0-4b4d-8fd2-7f59766860c5";
const baseTTSUrl = "http://localhost:9881";

async function AskQuestion(): Promise<string> {
    const request: N8nAgentReq = {
        question: inputQuestion.value
        , usersId: 1
    }

    const response: N8nAgentRes = await Http.post<any>(webhookUrl, "", request);

    if (response?.answer != null){
        return response.answer
    }

    throw new Error("Failed to get response from agent");
}

async function GetTTS(text: string) {

    const request: F5TtsReqDto = {
        ref_audio: "I:/Project/Virtual-Assistant-Project/VA-FE/public/assets/audio/VO_Sangonomiya_Kokomi_Chat_-_Fish.wav",
        ref_text: "Respect must be given to the will of every creature. Each fish in the ocean swims in its own direction.",
        gen_text: text,
    };

    const response = await Http.post<Blob>(
            baseTTSUrl,
            "/tts",
            request,
            undefined,
            HttpConstant.RESPONSE_TYPE.BLOB
    );
    // await live2dRef.value.playVoice(response);
    return response
}


// async function SubmitQuestion() {
//
//     if (!inputQuestion.value.trim()) {
//         alert("Masukkan pertanyaan terlebih dahulu!");
//         return;
//     }
//
//     if (isLoading.value) {
//         return;
//     }
//
//     isLoading.value = true;
//
//     try {
//
//         console.log("Question:", inputQuestion.value);
//
//         // 1. Kirim pertanyaan ke webhook
//         const answer = await AskQuestion();
//
//         console.log("Answer from webhook:", answer);
//
//         // 2. Hasil jawaban dikirim ke TTS
//         await GetTTS(answer);
//
//     } catch (error) {
//
//         console.error(
//                 "Failed to process question:",
//                 error
//         );
//
//     } finally {
//
//         isLoading.value = false;
//
//     }
// }


const ttsWebSocketUrl = "ws://localhost:9881/ws_tts";

async function StreamTTS(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(ttsWebSocketUrl);
        const audioQueue: Blob[] = [];
        let isPlaying = false;
        let isFinished = false;

        const PlayNext = async () => {
            if (isPlaying) {
                return;
            }

            if (audioQueue.length === 0) {
                if (isFinished) {
                    socket.close();
                    resolve();
                }
                return;
            }

            const audio = audioQueue.shift();

            if (!audio) {
                return;
            }

            isPlaying = true;

            try {
                // Pakai playVoice supaya lipsync Live2D ikut jalan
                await live2dRef.value.playVoice(audio);
            } catch (error) {
                socket.close();
                reject(error);
                return;
            } finally {
                isPlaying = false;
            }

            await PlayNext();
        };

        socket.onopen = () => {
            const request: F5TtsReqDto = {
                ref_audio: "I:/Project/Virtual-Assistant-Project/VA-FE/public/assets/audio/VO_Sangonomiya_Kokomi_Chat_-_Fish.wav",
                ref_text: "Respect must be given to the will of every creature. Each fish in the ocean swims in its own direction.",
                gen_text: text,
            };

            socket.send(
                    JSON.stringify(request)
            );
        };

        socket.onmessage = async (
                event: MessageEvent
        ) => {
            if (event.data instanceof Blob) {
                const audio = new Blob(
                        [event.data],
                        {
                            type: "audio/wav"
                        }
                );

                audioQueue.push(audio);

                if (!isPlaying) {
                    await PlayNext();
                }

                return;
            }
        };

        socket.onerror = (
                error
        ) => {
            console.error(
                    "TTS WebSocket error:",
                    error
            );

            reject(error);
        };

        socket.onclose = () => {
            isFinished = true;

            if (!isPlaying) {
                PlayNext();
            }
        };
    });
}

async function SubmitQuestionWebSocket() {
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

        // const answer = await AskQuestion();
        const answer = inputQuestion.value;

        console.log("Answer from webhook:", answer);

        await StreamTTS(answer);

    } catch (error) {
        console.error(
                "Failed to process question:",
                error
        );
    } finally {
        isLoading.value = false;
    }
}

async function SubmitQuestionChunker() {
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

        // const answer = await AskQuestion();
        const answer = inputQuestion.value

        console.log("Answer from webhook:", answer);

        const chunks = Chunker.chunk(answer);

        const audioQueue: Blob[] = [];
        let producerFinished = false;

        const producer = async () => {
            for (const chunk of chunks) {
                const audio = await GetTTS(chunk);

                audioQueue.push(audio);
            }

            producerFinished = true;
        };

        const consumer = async () => {
            while (
                    !producerFinished ||
                    audioQueue.length > 0
                    ) {
                if (audioQueue.length === 0) {
                    await new Promise(resolve =>
                            setTimeout(resolve, 50)
                    );

                    continue;
                }

                const audio = audioQueue.shift();

                if (audio) {
                    await live2dRef.value.playVoice(
                            audio
                    );
                }
            }
        };

        await Promise.all([
            producer(),
            consumer()
        ]);

    } catch (error) {
        console.error(
                "Failed to process question:",
                error
        );
    } finally {
        isLoading.value = false;
    }
}

async function SubmitQuestion() {
    // Pilih WebSocket
    // await SubmitQuestionWebSocket();

    // Pilih Chunker
    await SubmitQuestionChunker();
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