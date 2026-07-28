export const VibeVoice_VoiceList = {
    EN_EMMA_WOMAN: "en-Emma_woman"
} as const

export type VibeVoice_VoiceListType = typeof VibeVoice_VoiceList[keyof typeof VibeVoice_VoiceList]