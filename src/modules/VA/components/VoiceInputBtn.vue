<script setup lang="ts">

import {VoiceState, type VoiceStateType} from "../Constant/VoiceConstant.ts";

defineProps<{
    voiceState: VoiceStateType;
    voiceErrorMessage: string;
    isRecording: boolean;
}>();

const emit = defineEmits<{
    (e: "toggle"): void;
}>();
</script>

<template>
    <!-- Corner FAB so it doesn't read as something the avatar is floating above. -->
    <div class="floating-voice-wrap">
        <span
                class="voice-tooltip"
                :class="voiceState"
                v-if="voiceState !== 'idle'"
        >
            {{ voiceState === VoiceState.LISTENING ? "Listening..." : voiceErrorMessage }}
        </span>

        <button
                class="floating-voice-button"
                :class="voiceState"
                @click="emit('toggle')"
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
</template>

<style scoped>
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

@media (max-width: 600px) {
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