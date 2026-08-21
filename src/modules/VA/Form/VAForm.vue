<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from "vue";
import Live2D from "../components/Live2D.vue";
import { AgenticService } from "../service/AgenticService.ts";
import { F5TTSService } from "../service/F5TTSService.ts";
import Live2DBackground from "../components/Live2DBackground.vue";
import ChatBox from "../components/ChatBox.vue";
import HeaderStatus from "../components/HeaderStatus.vue";
import VoiceInputBtn from "../components/VoiceInputBtn.vue";
import ChatOpenCloseBtn from "../components/ChatOpenCloseBtn.vue";
import UserInput from "../components/UserInput.vue";
import {UseVAService} from "../service/VAService.ts";
import {UseVoiceInput} from "../service/STTService.ts";

const live2dRef = ref();
const inputQuestion = ref("");

const isChatOpen = ref(false);
const chatMessagesRef = ref<HTMLElement | null>(null);


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
});

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

const { voiceState, voiceErrorMessage, isRecording, ToggleVoiceInput } = UseVoiceInput({
    inputQuestion,
    onFinalTranscript: HandleSubmit,
});

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

const { messages, isLoading, SubmitQuestion } = UseVAService({
    agenticSvc,
    f5ttsSvc,
    onMessagesChanged: ScrollChatToBottom,
});

async function ScrollChatToBottom() {
    await nextTick();
    const el = chatMessagesRef.value;
    if (el) el.scrollTop = el.scrollHeight;
}

async function HandleSubmit() {
    const question = inputQuestion.value.trim();
    if (!question) {
        alert("Input the question first");
        return;
    }
    inputQuestion.value = "";
    await SubmitQuestion(question);
}


</script>

<template>
    <div class="va-container">
        <main class="avatar-area">

            <Live2DBackground :layers="['/assets/background/VA-BG1.webp', null]" :active-layer="0"/>

            <HeaderStatus :is-loading="isLoading"/>

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
                <Transition name="voice-button">
                    <VoiceInputBtn :voice-state="voiceState" :voice-error-message="voiceErrorMessage" :is-recording="isRecording" @toggle="ToggleVoiceInput"/>
                </Transition>

                <ChatOpenCloseBtn :is-chat-open="isChatOpen" @toggle="isChatOpen = !isChatOpen"/>
            </div>

            <Transition name="sidebar">
                <aside
                    v-if="isChatOpen"
                    class="chat-sidebar"
                    :style="sidebarStyle"
                >
                    <div
                        class="resize-handle"
                        :class="{ active: isResizingSidebar }"
                        @mousedown="StartSidebarResize"
                    >
                        <span class="resize-grip"></span>
                    </div>

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
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32">
                                <path d="M0 0h32v32H0z" fill="none" />
                                <path fill="currentColor" d="M16 2C8.2 2 2 8.2 2 16s6.2 14 14 14s14-6.2 14-14S23.8 2 16 2m0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12s-5.4 12-12 12" />
                                <path fill="currentColor" d="M21.4 23L16 17.6L10.6 23L9 21.4l5.4-5.4L9 10.6L10.6 9l5.4 5.4L21.4 9l1.6 1.6l-5.4 5.4l5.4 5.4z" />
                            </svg>

                        </button>
                    </div>

                    <ChatBox :messages="messages" :is-loading="isLoading"/>

                    <UserInput
                        :voice-state="voiceState"
                        :voice-error-message="voiceErrorMessage"
                        :input-question="inputQuestion"
                        :is-recording="isRecording"
                        :is-loading="isLoading"
                        @submit="HandleSubmit"
                        @toggle-voice="ToggleVoiceInput"
                        @update-input-question="inputQuestion = $event"
                    />
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

    font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
}

.avatar-area {
    position: relative;

    width: 100%;
    height: 100%;

    overflow: hidden;
}


/* =========================================================
   ACTION BUTTONS
   ========================================================= */

.action-btn-container {
    position: absolute;
    right: 28px;
    bottom: 28px;

    z-index: 15;

    display: flex;
    align-items: center;
    gap: 12px;
}


/* =========================================================
   LIVE2D
   ========================================================= */

.live2d-wrapper {
    position: absolute;
    inset: 0;

    z-index: 4;

    transition:
            margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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

    width: 32px;
    height: 32px;
    padding: 0;

    border: none;
    border-radius: 50%;
    background: transparent;

    color: #a1a1aa;
    cursor: pointer;

    transition: background 0.15s ease, color 0.15s ease;
}

.close-chat-button svg {
    width: 18px;
    height: 18px;
    display: block;
}

.close-chat-button:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #f4f4f5;
}

/* =========================================================
   SIDEBAR RESIZE
   ========================================================= */

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

    transition:
            background 0.2s ease,
            transform 0.2s ease;
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
   VOICE BUTTON TRANSITION
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
}

</style>