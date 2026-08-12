<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from "vue";
import Live2D from "../components/Live2D.vue";
import { AgenticService } from "../service/AgenticService.ts";
import { F5TTSService } from "../service/F5TTSService.ts";
import Live2DBackground from "../components/Live2DBackground.vue";
import ChatBox from "../components/ChatBox.vue";

const live2dRef = ref();
const inputQuestion = ref("");
const isLoading = ref(false);
const isUseStreamTTS = false;

const isChatOpen = ref(false);
const chatMessagesRef = ref<HTMLElement | null>(null);

interface ChatMessage {
    role: CHAT_MESSAGE_ROLE_TYPE
    content: string;
}

const CHAT_MESSAGE_ROLE = {
    USER: "user"
    , ASSISTANT: "assistant"
} as const

type CHAT_MESSAGE_ROLE_TYPE = typeof CHAT_MESSAGE_ROLE[keyof typeof CHAT_MESSAGE_ROLE]

const messages = ref<ChatMessage[]>([]);

//region LIVE2D FRAMING (configurable — tune here or wire up to a backend config later)

// fitHeightRatio: how much of the canvas height the model fills at zoom 1.
// zoom: extra multiplier on top of that.
// anchorX: 0-1 horizontal placement.
// verticalAnchorOffset: 0 = full body, feet flush with the bottom (no crop).
//                        >0 crops that fraction of the model's height off the
//                        bottom (e.g. 0.15 for a closer upper-body framing).
// This scales/crops at the PIXI/canvas level, not via CSS transforms, so it
// never turns pixelated when you push zoom up.
const live2dConfig = ref({
    zoom: 1.8,
    fitHeightRatio: 0.98,
    anchorX: 0.5,
    verticalAnchorOffset: 0.5,
});

//endregion

//region BACKGROUND (swappable from a backend)

// Two stacked image layers so switching backgrounds can crossfade instead
// of popping. Call SetBackgroundImage(url) — e.g. after fetching a scene
// config from the backend — to swap it at runtime. Pass null to go back to
// the plain gradient background.
const backgroundLayers = ref<[string | null, string | null]>([null, null]);
const activeBackgroundLayer = ref<0 | 1>(0);

function SetBackgroundImage(url: string | null) {
    const nextLayer = activeBackgroundLayer.value === 0 ? 1 : 0;
    backgroundLayers.value[nextLayer] = url;
    activeBackgroundLayer.value = nextLayer;
}

//endregion

//region SIDEBAR RESIZE

const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 640;
const SIDEBAR_EDGE_OFFSET = 16;

const sidebarWidth = ref(420);
const isResizingSidebar = ref(false);

function StartSidebarResize(event: MouseEvent) {
    isResizingSidebar.value = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", HandleSidebarResize);
    window.addEventListener("mouseup", StopSidebarResize);

    event.preventDefault();
}

function HandleSidebarResize(event: MouseEvent) {
    if (!isResizingSidebar.value) return;

    const proposedWidth = window.innerWidth - event.clientX - SIDEBAR_EDGE_OFFSET;
    sidebarWidth.value = Math.min(
            MAX_SIDEBAR_WIDTH,
            Math.max(MIN_SIDEBAR_WIDTH, proposedWidth)
    );
}

function StopSidebarResize() {
    isResizingSidebar.value = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    window.removeEventListener("mousemove", HandleSidebarResize);
    window.removeEventListener("mouseup", StopSidebarResize);
}

onBeforeUnmount(() => {
    window.removeEventListener("mousemove", HandleSidebarResize);
    window.removeEventListener("mouseup", StopSidebarResize);
    recognition?.abort();
    if (voiceErrorTimeout) clearTimeout(voiceErrorTimeout);
});

// Keeps the Live2D avatar visually centered in whatever space remains.
// This changes the canvas container's box size (via margin), which the
// Live2D component now watches with a ResizeObserver, so the model
// re-fits correctly instead of only its legs staying visible.
const avatarAreaStyle = computed(() => {
    if (!isChatOpen.value) return {};

    return {
        marginRight: `${sidebarWidth.value + SIDEBAR_EDGE_OFFSET * 2}px`,
    };
});

const sidebarStyle = computed(() => ({
    width: `${sidebarWidth.value}px`,
}));

//endregion

//region VOICE INPUT (STT via Web Speech API)

// Minimal typings
type SpeechRecognitionInstance = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onstart: (() => void) | null;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    onend: (() => void) | null;
};

type VoiceState = "idle" | "listening" | "error";

const voiceState = ref<VoiceState>("idle");
const voiceErrorMessage = ref("");
const isRecording = computed(() => voiceState.value === "listening");

let recognition: SpeechRecognitionInstance | null = null;
let voiceErrorTimeout: ReturnType<typeof setTimeout> | null = null;

function BuildRecognition(): SpeechRecognitionInstance | null {
    const SpeechRecognitionCtor: any =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
        SetVoiceError("Browser ini tidak mendukung voice input (Speech Recognition).");
        return null;
    }

    const recog: SpeechRecognitionInstance = new SpeechRecognitionCtor();
    recog.lang = "id-ID";
    recog.continuous = false;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    // Only flip the UI to "listening" once the engine actually confirms it
    // started (mic permission granted, capture running). Previously the UI
    // was set to "recording" optimistically the instant the button was
    // clicked, so it could show "Listening..." even when the browser was
    // still waiting on a permission prompt, or never really started —
    // which is why the state looked indistinguishable/stuck.
    recog.onstart = () => {
        voiceState.value = "listening";
        voiceErrorMessage.value = "";
    };

    recog.onresult = (event) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                final += transcript;
            } else {
                interim += transcript;
            }
        }

        inputQuestion.value = final || interim;
    };

    recog.onerror = (event) => {
        console.error("Speech recognition error:", event.error);

        const messages: Record<string, string> = {
            "not-allowed": "Izin mikrofon ditolak. Aktifkan akses mikrofon di browser.",
            "no-speech": "Tidak ada suara terdeteksi. Coba lagi.",
            "audio-capture": "Mikrofon tidak ditemukan.",
            network: "Koneksi bermasalah saat memproses suara.",
        };

        SetVoiceError(messages[event.error] ?? "Terjadi kesalahan pada voice input.");
    };

    recog.onend = () => {
        // A fresh recognition instance is created on every toggle (see
        // ToggleVoiceInput), so once this one ends it's discarded rather
        // than reused — reusing a single SpeechRecognition instance across
        // multiple start() calls is what silently stopped STT from working
        // in some browsers after the first attempt.
        recognition = null;

        if (voiceState.value === "listening") {
            voiceState.value = "idle";
        }

        if (inputQuestion.value.trim()) {
            SubmitQuestion();
        }
    };

    return recog;
}

function SetVoiceError(message: string) {
    voiceState.value = "error";
    voiceErrorMessage.value = message;

    if (voiceErrorTimeout) clearTimeout(voiceErrorTimeout);
    voiceErrorTimeout = setTimeout(() => {
        if (voiceState.value === "error") voiceState.value = "idle";
        voiceErrorMessage.value = "";
    }, 3500);
}

function ToggleVoiceInput() {
    if (voiceState.value === "listening") {
        recognition?.stop();
        return;
    }

    recognition?.abort();
    recognition = BuildRecognition();
    if (!recognition) return;

    inputQuestion.value = "";

    try {
        recognition.start();
    } catch (err) {
        console.error("Failed to start recognition:", err);
        SetVoiceError("Tidak bisa memulai voice input. Coba lagi.");
    }
}

//endregion


//region CHAT
const agenticSvc = new AgenticService({
    webhookUrl: "http://localhost:5678/webhook/agent",
});

const f5ttsSvc = new F5TTSService({
    ttsBaseUrl: "http://localhost:9881",
    singleResEndpoint: "/tts",
    wsBaseUrl: "ws://localhost:9881",
    streamResEndpoint: "ws_tts",
    live2dRef: live2dRef,
});

async function scrollChatToBottom() {
    await nextTick();
    const el = chatMessagesRef.value;
    if (el) el.scrollTop = el.scrollHeight;
}

async function SubmitQuestion() {
    if (isLoading.value) return;

    const question = inputQuestion.value.trim();
    if (!question) {
        alert("Input the question first");
        return;
    }

    messages.value.push({ role: CHAT_MESSAGE_ROLE.USER, content: question });
    inputQuestion.value = "";
    await scrollChatToBottom();

    isLoading.value = true;

    try {
        const answer = await agenticSvc.AskQuestion(question, 1);
        if (isUseStreamTTS) {
            let revealed = false;

            await f5ttsSvc.StreamTTS(answer, () => {
                if (revealed) return;
                revealed = true;

                messages.value.push({ role: CHAT_MESSAGE_ROLE.ASSISTANT, content: answer });
                scrollChatToBottom();
            });
            if (!revealed) {
                messages.value.push({ role: CHAT_MESSAGE_ROLE.ASSISTANT, content: answer });
                await scrollChatToBottom();
            }
        } else {
            await f5ttsSvc.ChunkTTS(answer, (chunkText) => {
                const assistantMessage = { role: CHAT_MESSAGE_ROLE.ASSISTANT, content: "" };
                assistantMessage.content += (assistantMessage.content ? " " : "") + chunkText;
                messages.value.push(assistantMessage);
                scrollChatToBottom();
            });
        }
    } catch (error) {
        console.error("Failed to process:", error);
        messages.value.push({
            role: "assistant",
            content: "Sorry, an error occurred while processing your question. Please contact your administrator",
        });
        await scrollChatToBottom();
    } finally {
        isLoading.value = false;
    }
}
//endregion

defineExpose({
    SetBackgroundImage,
});
</script>

<template>
    <div class="va-container">

        <!-- ==================== MAIN AVATAR AREA ==================== -->
        <main class="avatar-area">

            <Live2DBackground :layers="[null, null]" :active-layer="0"/>

            <!-- Header -->
            <header class="va-header">
                <div class="assistant-status">
                    <span class="status-dot"></span>

                    <div class="status-info">
                        <span class="assistant-name">Virtual Assistant</span>
                        <span class="assistant-state">
                            {{ isLoading ? "Thinking..." : "Online" }}
                        </span>
                    </div>
                </div>
            </header>


            <!-- Live2D — fills the whole avatar area edge-to-edge so the
                 model is genuinely anchored to the bottom of the viewport
                 instead of sitting in a padded, centered box that reads
                 as "floating". Framing (size/crop/position) is entirely
                 controlled by live2dConfig, forwarded as props. -->
            <div class="live2d-wrapper" :style="avatarAreaStyle">
                <Live2D
                        ref="live2dRef"
                        :zoom="live2dConfig.zoom"
                        :fit-height-ratio="live2dConfig.fitHeightRatio"
                        :anchor-x="live2dConfig.anchorX"
                        :vertical-anchor-offset="live2dConfig.verticalAnchorOffset"
                />
            </div>


            <div class="action-btn-container">
                <!-- ==================== FLOATING VOICE BUTTON ==================== -->
                <!-- Moved off the avatar's centerline into a corner FAB so it no
                     longer reads as something the avatar is floating above. -->
                <Transition name="voice-button">
                    <div v-if="!isChatOpen" class="floating-voice-wrap">
                        <span
                                class="voice-tooltip"
                                :class="voiceState"
                                v-if="voiceState !== 'idle'"
                        >
                            {{ voiceState === "listening" ? "Mendengarkan..." : voiceErrorMessage }}
                        </span>

                        <button
                                class="floating-voice-button"
                                :class="voiceState"
                                @click="ToggleVoiceInput"
                                aria-label="Voice input"
                        >
                            <span class="voice-pulse" v-if="isRecording"></span>

                            <svg viewBox="0 0 24 24" fill="none" class="voice-icon-svg">
                                <rect v-if="!isRecording" x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.6" />
                                <path v-if="!isRecording" d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                                <rect v-else x="8" y="8" width="8" height="8" rx="1.5" fill="currentColor" />
                            </svg>
                        </button>
                    </div>
                </Transition>

                <button
                        class="chat-toggle"
                        :class="{ active: isChatOpen }"
                        @click="isChatOpen = !isChatOpen"
                        :aria-label="isChatOpen ? 'Tutup chat' : 'Buka chat'"
                >
                    <svg v-if="!isChatOpen" class="chat-toggle-icon" viewBox="0 0 24 24" fill="none">
                        <path
                                d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 3.5v-3.5H5.5C4.67 17 4 16.33 4 15.5v-10z"
                                stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"
                        />
                    </svg>
                    <svg v-else class="chat-toggle-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>

                    <span class="chat-toggle-label"> Chat </span>
                </button>
            </div>


            <!-- ==================== CHAT SIDEBAR ==================== -->
            <Transition name="sidebar">
                <aside
                        v-if="isChatOpen"
                        class="chat-sidebar"
                        :style="sidebarStyle"
                >

                    <!-- Resize handle -->
                    <div
                            class="resize-handle"
                            :class="{ active: isResizingSidebar }"
                            @mousedown="StartSidebarResize"
                    >
                        <span class="resize-grip"></span>
                    </div>

                    <!-- Sidebar Header -->
                    <div class="chat-header">
                        <div>
                            <h2>Conversation</h2>
                            <span>{{ messages.length }} messages</span>
                        </div>

                        <button
                                class="close-chat-button"
                                @click="isChatOpen = false"
                                aria-label="Close chat"
                        >
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                            </svg>
                        </button>
                    </div>


                    <!-- Chat Messages -->
                    <ChatBox :messages="messages" :is-loading="isLoading"/>


                    <!-- Chat Input -->
                    <div class="chat-input-area">
                        <div v-if="voiceState === 'error'" class="voice-error-banner">
                            {{ voiceErrorMessage }}
                        </div>

                        <div class="input-wrapper">

                            <textarea
                                    v-model="inputQuestion"
                                    :placeholder="isRecording ? 'Mendengarkan...' : 'Type your message...'"
                                    :disabled="isLoading"
                                    rows="1"
                                    @keydown.enter.exact.prevent="SubmitQuestion"
                            ></textarea>

                            <!-- Voice -->
                            <button
                                    class="input-action voice-action"
                                    :class="voiceState"
                                    :disabled="isLoading"
                                    @click="ToggleVoiceInput"
                                    aria-label="Toggle voice input"
                            >
                                <span class="voice-pulse small" v-if="isRecording"></span>
                                <svg viewBox="0 0 24 24" fill="none">
                                    <rect v-if="!isRecording" x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.6" />
                                    <path v-if="!isRecording" d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                                    <rect v-else x="8" y="8" width="8" height="8" rx="1.5" fill="currentColor" />
                                </svg>
                            </button>

                            <!-- Send -->
                            <button
                                    class="input-action send-action"
                                    :disabled="isLoading || !inputQuestion.trim()"
                                    @click="SubmitQuestion"
                                    aria-label="Send message"
                            >
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M4 12l16-7-6.5 16-2.5-7-7-2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" />
                                </svg>
                            </button>

                        </div>

                        <span class="input-hint">Enter to send · Drag left edge to resize</span>
                    </div>

                </aside>
            </Transition>

        </main>

    </div>
</template>


<style scoped>

* {
    box-sizing: border-box;
}


/* =========================================================
   MAIN
   ========================================================= */

.va-container {
    width: 100%;
    height: 100vh;
    overflow: hidden;

    background: #09090b;

    color: #f4f4f5;

    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}


.avatar-area {
    position: relative;

    width: 100%;
    height: 100%;

    overflow: hidden;
}


/* =========================================================
   BACKGROUND
   ========================================================= */

/* Base gradient, always present underneath everything. */
.bg-base {
    position: absolute;
    inset: 0;
    z-index: 0;

    background:
            radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.14), transparent 45%),
            radial-gradient(circle at 80% 85%, rgba(139, 92, 246, 0.10), transparent 50%),
            linear-gradient(180deg, #0c0c10 0%, #09090b 55%, #060608 100%);
}

/* Swappable backend-driven scene image. Two layers crossfade so a new
   image never pops in abruptly — call SetBackgroundImage(url) to swap. */
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

/* Keeps foreground UI legible no matter what the backend image looks
   like: darkens the edges and the lower portion where the header,
   sidebar and mic live. */
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


/* =========================================================
   HEADER
   ========================================================= */

.va-header {
    position: absolute;

    top: 0;
    left: 0;

    z-index: 20;

    width: 100%;

    padding: 24px 28px;

    display: flex;
    align-items: center;
    justify-content: space-between;
}


.assistant-status {
    display: flex;
    align-items: center;

    gap: 12px;

    padding: 10px 14px;

    border: 1px solid rgba(255, 255, 255, 0.07);

    border-radius: 14px;

    background: rgba(15, 15, 18, 0.55);

    backdrop-filter: blur(16px);
}


.status-dot {
    width: 8px;
    height: 8px;

    border-radius: 50%;

    background: #4ade80;

    box-shadow:
            0 0 0 4px rgba(74, 222, 128, 0.08),
            0 0 12px rgba(74, 222, 128, 0.5);

    animation: pulse-dot 2.4s infinite ease-in-out;
}


@keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
}


.status-info {
    display: flex;
    flex-direction: column;

    gap: 2px;
}


.assistant-name {
    font-size: 13px;
    font-weight: 600;
}


.assistant-state {
    font-size: 11px;

    color: #a1a1aa;
}


.action-btn-container {
    position: absolute;
    right: 28px;
    bottom: 28px;

    z-index: 15;

    display: flex;
    align-items: center;
    gap: 12px;
}

/* Chat toggle — a clearly-labelled pill button instead of a bare burger icon */
.chat-toggle {
    display: flex;
    align-items: center;

    gap: 8px;

    height: 54px;

    padding: 0 18px 0 16px;

    border: 1px solid rgba(255, 255, 255, 0.08);

    border-radius: 14px;

    background: rgba(15, 15, 18, 0.6);

    color: #e4e4e7;

    font-size: 13px;
    font-weight: 600;

    cursor: pointer;

    backdrop-filter: blur(16px);

    transition:
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease,
            color 0.2s ease;
}


.chat-toggle-icon {
    width: 18px;
    height: 18px;

    flex-shrink: 0;
}


.chat-toggle:hover {
    background: rgba(255, 255, 255, 0.10);

    transform: translateY(-1px);
}


.chat-toggle.active {
    background: #4f46e5;

    border-color: #4f46e5;

    color: white;
}


.chat-toggle.active:hover {
    background: #4338ca;
}


/* =========================================================
   LIVE2D — edge-to-edge so the model is genuinely anchored to
   the real bottom of the viewport (no padded box = no "floating").
   All sizing/cropping/position lives in the component's props.
   ========================================================= */

.live2d-wrapper {
    position: absolute;
    inset: 0;
    z-index: 4;

    transition: margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}


/* =========================================================
   FLOATING VOICE — moved to a bottom-right corner FAB so it no
   longer sits directly beneath the avatar's centerline.
   ========================================================= */

.floating-voice-wrap {
    position: relative;

    display: flex;
    flex-direction: column;
    align-items: flex-end;

    gap: 10px;
}


.voice-tooltip {
    padding: 7px 12px;

    border-radius: 10px;

    background: rgba(20, 20, 24, 0.85);

    border: 1px solid rgba(255, 255, 255, 0.08);

    color: #e4e4e7;

    font-size: 12px;
    font-weight: 500;

    white-space: nowrap;

    backdrop-filter: blur(12px);
}


.voice-tooltip.listening {
    border-color: rgba(239, 68, 68, 0.35);
    color: #fca5a5;
}


.voice-tooltip.error {
    border-color: rgba(245, 158, 11, 0.4);
    color: #fcd34d;
}


.floating-voice-button {
    position: relative;

    width: 60px;
    height: 60px;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1px solid rgba(255, 255, 255, 0.08);

    border-radius: 50%;

    background: rgba(20, 20, 24, 0.72);

    color: #c4b5fd;

    backdrop-filter: blur(18px);

    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);

    cursor: pointer;

    transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease;
}


.floating-voice-button:hover {
    transform: translateY(-2px);

    background: rgba(35, 35, 40, 0.85);
}


.voice-icon-svg {
    width: 20px;
    height: 20px;
}


.floating-voice-button.listening {
    border-color: rgba(239, 68, 68, 0.4);

    background: rgba(80, 20, 25, 0.8);

    color: #fca5a5;
}


.floating-voice-button.error {
    border-color: rgba(245, 158, 11, 0.4);

    background: rgba(70, 45, 10, 0.8);

    color: #fcd34d;
}


.voice-pulse {
    position: absolute;
    inset: 0;

    border-radius: 50%;

    background: rgba(239, 68, 68, 0.35);

    animation: voice-pulse-anim 1.4s infinite ease-out;
}


.voice-pulse.small {
    left: 50%;
    top: 50%;

    width: 34px;
    height: 34px;

    inset: auto;

    transform: translate(-50%, -50%);
}


@keyframes voice-pulse-anim {
    0% {
        transform: scale(1);
        opacity: 0.55;
    }
    100% {
        transform: scale(1.6);
        opacity: 0;
    }
}


/* =========================================================
   SIDEBAR
   ========================================================= */

.chat-sidebar {
    position: absolute;

    top: 16px;
    right: 16px;
    bottom: 16px;

    z-index: 30;

    min-width: 320px;
    max-width: 640px;

    display: flex;
    flex-direction: column;

    overflow: hidden;

    border: 1px solid rgba(255, 255, 255, 0.08);

    border-radius: 24px;

    background: rgba(14, 14, 18, 0.88);

    backdrop-filter: blur(30px);

    box-shadow:
            -20px 0 60px rgba(0, 0, 0, 0.25),
            0 20px 60px rgba(0, 0, 0, 0.35);
}


/* Drag handle on the sidebar's left edge for resizing */
.resize-handle {
    position: absolute;

    top: 0;
    left: 0;
    bottom: 0;

    z-index: 40;

    width: 10px;

    display: flex;
    align-items: center;
    justify-content: center;

    cursor: col-resize;

    touch-action: none;
}


.resize-handle::after {
    content: "";

    position: absolute;

    left: 4px;
    top: 0;
    bottom: 0;

    width: 1px;

    background: rgba(255, 255, 255, 0.06);

    transition: background 0.2s ease;
}


.resize-grip {
    width: 4px;
    height: 36px;

    border-radius: 4px;

    background: rgba(255, 255, 255, 0.10);

    transition: background 0.2s ease, transform 0.2s ease;
}


.resize-handle:hover .resize-grip,
.resize-handle.active .resize-grip {
    background: #818cf8;

    transform: scaleX(1.4);
}


.resize-handle:hover::after,
.resize-handle.active::after {
    background: rgba(129, 140, 248, 0.35);
}


/* =========================================================
   CHAT HEADER
   ========================================================= */

.chat-header {
    min-height: 78px;

    padding: 18px 20px 18px 26px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}


.chat-header h2 {
    margin: 0 0 4px;

    font-size: 15px;

    font-weight: 600;
}


.chat-header span {
    font-size: 11px;

    color: #71717a;
}


.close-chat-button {
    display: flex;
    align-items: center;
    justify-content: center;

    width: 36px;
    height: 36px;

    border: 0;

    border-radius: 10px;

    background: rgba(255, 255, 255, 0.05);

    color: #a1a1aa;

    cursor: pointer;

    transition: 0.2s;
}


.close-chat-button svg {
    width: 16px;
    height: 16px;
}


.close-chat-button:hover {
    color: white;

    background: rgba(255, 255, 255, 0.10);
}


/* =========================================================
   MESSAGES
   ========================================================= */

.chat-messages {
    flex: 1;

    min-height: 0;

    overflow-y: auto;

    padding: 24px 18px 24px 26px;

    display: flex;
    flex-direction: column;

    gap: 18px;

    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
}


.chat-empty {
    flex: 1;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-direction: column;

    text-align: center;

    padding: 30px;

    color: #71717a;
}


.empty-icon {
    width: 54px;
    height: 54px;

    display: flex;
    align-items: center;
    justify-content: center;

    margin-bottom: 18px;

    border-radius: 16px;

    background: rgba(255, 255, 255, 0.05);

    font-size: 22px;

    color: #a78bfa;
}


.chat-empty h3 {
    margin: 0 0 8px;

    color: #e4e4e7;

    font-size: 15px;
}


.chat-empty p {
    max-width: 220px;

    margin: 0;

    font-size: 12px;

    line-height: 1.6;
}


/* =========================================================
   MESSAGE
   ========================================================= */

.message {
    display: flex;

    gap: 10px;

    max-width: 90%;
}


.message.user {
    align-self: flex-end;

    flex-direction: row-reverse;
}


.message-avatar {
    flex-shrink: 0;

    width: 28px;
    height: 28px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    background: rgba(255, 255, 255, 0.06);

    color: #a1a1aa;

    font-size: 10px;

    font-weight: 600;
}


.message.user .message-avatar {
    background: rgba(99, 102, 241, 0.18);

    color: #c4b5fd;
}


.message-content {
    padding: 10px 13px;

    border-radius: 14px;

    background: rgba(255, 255, 255, 0.05);

    color: #d4d4d8;

    font-size: 13px;

    line-height: 1.55;

    word-break: break-word;
}


.message.user .message-content {
    background: #4f46e5;

    color: white;

    border-bottom-right-radius: 4px;
}


.message.assistant .message-content {
    border-bottom-left-radius: 4px;
}


/* =========================================================
   TYPING
   ========================================================= */

.typing-indicator {
    display: flex;

    align-items: center;

    gap: 4px;

    height: 38px;

    padding: 0 14px;

    border-radius: 14px;

    background: rgba(255, 255, 255, 0.05);
}


.typing-indicator span {
    width: 5px;
    height: 5px;

    border-radius: 50%;

    background: #71717a;

    animation: typing 1.2s infinite ease-in-out;
}


.typing-indicator span:nth-child(2) {
    animation-delay: 0.15s;
}


.typing-indicator span:nth-child(3) {
    animation-delay: 0.3s;
}


@keyframes typing {
    0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.4;
    }
    30% {
        transform: translateY(-4px);
        opacity: 1;
    }
}


/* =========================================================
   CHAT INPUT
   ========================================================= */

.chat-input-area {
    padding: 14px 16px 16px 22px;

    border-top: 1px solid rgba(255, 255, 255, 0.06);
}


.voice-error-banner {
    margin-bottom: 10px;
    padding: 8px 12px;

    border-radius: 10px;

    border: 1px solid rgba(245, 158, 11, 0.35);

    background: rgba(245, 158, 11, 0.1);

    color: #fcd34d;

    font-size: 11.5px;
    line-height: 1.4;
}


.input-wrapper {
    display: flex;
    align-items: flex-end;

    gap: 8px;

    padding: 8px;

    border: 1px solid rgba(255, 255, 255, 0.08);

    border-radius: 16px;

    background: rgba(255, 255, 255, 0.035);

    transition:
            border-color 0.2s ease,
            background 0.2s ease;
}


.input-wrapper:focus-within {
    border-color: rgba(129, 140, 248, 0.45);

    background: rgba(255, 255, 255, 0.05);
}


.input-wrapper textarea {
    flex: 1;

    min-width: 0;

    max-height: 100px;

    resize: none;

    border: 0;

    outline: none;

    padding: 8px 6px;

    background: transparent;

    color: #f4f4f5;

    font-family: inherit;

    font-size: 13px;

    line-height: 1.5;
}


.input-wrapper textarea::placeholder {
    color: #52525b;
}


.input-action {
    position: relative;

    flex-shrink: 0;

    width: 34px;
    height: 34px;

    border: 0;

    border-radius: 10px;

    display: flex;
    align-items: center;
    justify-content: center;

    cursor: pointer;

    transition:
            background 0.2s ease,
            transform 0.2s ease,
            color 0.2s ease;
}


.input-action svg {
    width: 16px;
    height: 16px;
}


.voice-action {
    background: rgba(255, 255, 255, 0.05);

    color: #a1a1aa;
}


.voice-action:hover {
    background: rgba(255, 255, 255, 0.10);

    color: white;
}


.voice-action.listening {
    background: rgba(239, 68, 68, 0.18);

    color: #f87171;
}


.voice-action.error {
    background: rgba(245, 158, 11, 0.18);

    color: #fbbf24;
}


.send-action {
    background: #6366f1;

    color: white;
}


.send-action:hover:not(:disabled) {
    background: #4f46e5;

    transform: translateY(-1px);
}


.send-action:disabled,
.input-action:disabled {
    opacity: 0.35;

    cursor: not-allowed;
}


.input-hint {
    display: block;

    margin-top: 8px;
    padding-left: 4px;

    font-size: 10px;

    color: #52525b;
}


/* =========================================================
   SIDEBAR TRANSITION
   ========================================================= */

.sidebar-enter-active,
.sidebar-leave-active {
    transition:
            transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.25s ease;
}


.sidebar-enter-from,
.sidebar-leave-to {
    transform: translateX(30px);

    opacity: 0;
}


/* =========================================================
   VOICE TRANSITION
   ========================================================= */

.voice-button-enter-active,
.voice-button-leave-active {
    transition:
            opacity 0.2s ease,
            transform 0.2s ease;
}


.voice-button-enter-from,
.voice-button-leave-to {
    opacity: 0;

    transform: translateY(10px);
}


/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (max-width: 900px) {

    .live2d-wrapper {
        margin-right: 0 !important;
    }

    .chat-sidebar {
        min-width: min(320px, calc(100vw - 16px));
        max-width: calc(100vw - 16px);
    }
}


@media (max-width: 600px) {

    .va-header {
        padding: 16px;
    }

    .assistant-status {
        padding: 8px 11px;
    }

    .chat-toggle-label {
        display: none;
    }

    .chat-toggle {
        width: 44px;
        padding: 0;

        justify-content: center;
    }

    .chat-sidebar {
        top: 8px;
        right: 8px;
        bottom: 8px;

        width: calc(100vw - 16px) !important;

        border-radius: 20px;
    }

    .resize-handle {
        display: none;
    }

    .action-btn-container {
        right: 16px;
        bottom: 20px;
    }

    .floating-voice-wrap {
        right: auto;
        bottom: auto;
    }

    .floating-voice-button {
        width: 52px;
        height: 52px;
    }
}
</style>