<script setup lang="ts">
defineProps<{
    isChatOpen: boolean;
}>();

const emit = defineEmits<{
    (e: "toggle"): void;
}>();
</script>

<template>
    <button
            class="chat-toggle"
            :class="{ active: isChatOpen }"
            @click="emit('toggle')"
            :aria-label="isChatOpen ? 'Close chat' : 'Open chat'"
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
</template>

<style scoped>
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

@media (max-width: 600px) {
    .chat-toggle-label {
        display: none;
    }

    .chat-toggle {
        width: 44px;
        padding: 0;

        justify-content: center;
    }
}
</style>