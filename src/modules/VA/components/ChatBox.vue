<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import type {ChatMessage} from "../Constant/ChatMessage.ts";

const props = defineProps<{
    messages: ChatMessage[];
    isLoading: boolean;
}>();

const chatMessagesRef = ref<HTMLElement | null>(null);

async function ScrollToBottom() {
    await nextTick();
    const el = chatMessagesRef.value;
    if (el) el.scrollTop = el.scrollHeight;
}

watch(
        () => [props.messages.length, props.isLoading],
        () => {
            ScrollToBottom();
        }
);

defineExpose({
    ScrollToBottom,
});
</script>

<template>
    <div ref="chatMessagesRef" class="chat-messages">

        <!-- Empty state -->
        <div v-if="messages.length === 0" class="chat-empty">
            <div class="empty-icon">✦</div>
            <h3>How can I help?</h3>
            <p>Ask me anything using text or your voice.</p>
        </div>

        <!-- Messages -->
        <div
                v-for="(message, index) in messages"
                :key="index"
                class="message"
                :class="message.role"
        >
            <div class="message-avatar">
                {{ message.role === "user" ? "You" : "AI" }}
            </div>

            <div class="message-content">
                {{ message.content }}
            </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="message assistant">
            <div class="message-avatar">AI</div>

            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>

    </div>
</template>

<style scoped>
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
</style>