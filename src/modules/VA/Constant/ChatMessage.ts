export const CHAT_MESSAGE_ROLE = {
    USER: "user",
    ASSISTANT: "assistant",
} as const;

export type ChatMessageRoleType = typeof CHAT_MESSAGE_ROLE[keyof typeof CHAT_MESSAGE_ROLE];

export interface IChatMessage {
    role: ChatMessageRoleType;
    content: string;
}