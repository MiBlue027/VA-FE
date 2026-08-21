<script setup lang="ts">

import { VoiceState, type VoiceStateType } from "../Constant/VoiceConstant.ts";

defineProps<{
    voiceState: VoiceStateType
    voiceErrorMessage: string
    inputQuestion: string
    isRecording: boolean
    isLoading: boolean
}>()

const emit = defineEmits<{
    submit: []
    toggleVoice: []
    updateInputQuestion: [value: string]
}>()

</script>

<template>
    <div class="chat-input-area">
        <div
            v-if="voiceState === VoiceState.ERROR"
            class="voice-error-banner"
        >
            {{ voiceErrorMessage }}
        </div>

        <div class="input-wrapper">

            <textarea
                    :value="inputQuestion"
                    :placeholder="isRecording ? 'Mendengarkan...' : 'Type your message...'"
                    :disabled="isLoading"
                    rows="1"
                    @input="emit(
                    'updateInputQuestion',
                        ($event.target as HTMLTextAreaElement).value
                    )"
                    @keydown.enter.exact.prevent="emit('submit')"
            ></textarea>

            <!-- Voice -->
            <button
                class="input-action voice-action"
                :class="voiceState"
                :disabled="isLoading"
                @click="emit('toggleVoice')"
                aria-label="Toggle voice input"
            >
                <span
                    class="voice-pulse small"
                    v-if="isRecording"
                ></span>

                <svg viewBox="0 0 24 24" fill="none">
                    <rect
                        v-if="!isRecording"
                        x="9"
                        y="3"
                        width="6"
                        height="11"
                        rx="3"
                        stroke="currentColor"
                        stroke-width="1.6"
                    />

                    <path
                        v-if="!isRecording"
                        d="M5 11a7 7 0 0 0 14 0M12 18v3"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                    />

                    <rect
                        v-else
                        x="8"
                        y="8"
                        width="8"
                        height="8"
                        rx="1.5"
                        fill="currentColor"
                    />
                </svg>
            </button>

            <!-- Send -->
            <button
                class="input-action send-action"
                :disabled="isLoading || !inputQuestion.trim()"
                @click="emit('submit')"
                aria-label="Send message"
            >
                <svg viewBox="0 0 24 24" fill="none">
                    <path
                        d="M4 12l16-7-6.5 16-2.5-7-7-2z"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linejoin="round"
                        stroke-linecap="round"
                    />
                </svg>
            </button>

        </div>

        <span class="input-hint">
            Enter to send · Drag left edge to resize
        </span>

    </div>
</template>

<style scoped>

.chat-input-area {
    padding: 14px 16px 16px 22px;

    border-top: 1px solid rgba(255, 255, 255, 0.06);
}


/* Voice error */

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


/* Input */

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


/* Textarea */

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


/* Buttons */

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


/* Voice */

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


/* Voice pulse */

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


/* Send */

.send-action {
    background: #6366f1;

    color: white;
}

.send-action:hover:not(:disabled) {
    background: #4f46e5;

    transform: translateY(-1px);
}


/* Disabled */

.send-action:disabled,
.input-action:disabled {
    opacity: 0.35;

    cursor: not-allowed;
}


/* Hint */

.input-hint {
    display: block;

    margin-top: 8px;
    padding-left: 4px;

    font-size: 10px;

    color: #52525b;
}

</style>