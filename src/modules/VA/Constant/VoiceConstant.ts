export const VoiceState = {
    IDLE: "idle"
    , LISTENING: "listening"
    , ERROR: "error"
} as const

export type VoiceStateType = typeof VoiceState[keyof typeof VoiceState]