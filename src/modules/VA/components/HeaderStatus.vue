<script setup lang="ts">
defineProps<{
    isLoading: boolean;
}>();
</script>

<template>
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
</template>

<style scoped>
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

@media (max-width: 600px) {
    .va-header {
        padding: 16px;
    }

    .assistant-status {
        padding: 8px 11px;
    }
}
</style>