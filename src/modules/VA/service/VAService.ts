import { ref } from "vue";
import type { AgenticService } from "./AgenticService.ts";
import type { F5TTSService } from "./F5TTSService.ts";
import { CHAT_MESSAGE_ROLE, type IChatMessage } from "../Constant/ChatMessage.ts";

interface UseVAServiceOptions {
    agenticSvc: AgenticService;
    f5ttsSvc: F5TTSService;
    useStreamTTS?: boolean;
    onMessagesChanged?: () => void | Promise<void>;
}

export function UseVAService(options: UseVAServiceOptions) {
    const { agenticSvc, f5ttsSvc } = options;

    const messages = ref<IChatMessage[]>([]);
    const isLoading = ref(false);

    async function NotifyMessagesChanged() {
        if (options.onMessagesChanged) await options.onMessagesChanged();
    }

    async function SubmitQuestion(question: string) {
        const trimmed = question.trim();
        if (isLoading.value || !trimmed) return;

        messages.value.push({ role: CHAT_MESSAGE_ROLE.USER, content: trimmed });
        await NotifyMessagesChanged();

        isLoading.value = true;

        try {
            const answer = await agenticSvc.AskQuestion(trimmed, 1);

            if (options.useStreamTTS) {
                let revealed = false;

                await f5ttsSvc.StreamTTS(answer, () => {
                    if (revealed) return;
                    revealed = true;
                    messages.value.push({ role: CHAT_MESSAGE_ROLE.ASSISTANT, content: answer });
                    NotifyMessagesChanged();
                });

                if (!revealed) {
                    messages.value.push({ role: CHAT_MESSAGE_ROLE.ASSISTANT, content: answer });
                    await NotifyMessagesChanged();
                }
            } else {
                await f5ttsSvc.ChunkTTS(answer, (chunkText) => {
                    messages.value.push({ role: CHAT_MESSAGE_ROLE.ASSISTANT, content: chunkText });
                    NotifyMessagesChanged();
                });
            }
        } catch (error) {
            console.error("Failed to process:", error);
            messages.value.push({
                role: CHAT_MESSAGE_ROLE.ASSISTANT,
                content: "Sorry, an error occurred while processing your question. Please contact your administrator",
            });
            await NotifyMessagesChanged();
        } finally {
            isLoading.value = false;
        }
    }

    return { messages, isLoading, SubmitQuestion };
}