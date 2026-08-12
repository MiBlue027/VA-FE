export const CHAT_MESSAGE_ROLE = {
    USER: "user",
    ASSISTANT: "assistant",
} as const;

export type ChatMessageRole = typeof CHAT_MESSAGE_ROLE[keyof typeof CHAT_MESSAGE_ROLE];

export interface ChatMessage {
    role: ChatMessageRole;
    content: string;
}