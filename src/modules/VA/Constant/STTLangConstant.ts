export const STTLang = {
    IND: "id-Id"
    , EN: "en"
    , EN_US: "en-US"
    , CMN_CN: "cmn-CN"
} as const

export type STTLangType = typeof STTLang[keyof typeof STTLang]