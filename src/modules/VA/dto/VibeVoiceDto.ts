import type {VibeVoice_VoiceListType} from "../Constant/VibeVoice_VoiceList.ts";

export type VibeVoiceReqDto = {
    text: string
    , voice: VibeVoice_VoiceListType
    , cfg: number
    , steps: number
}