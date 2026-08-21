import { ref, computed, onBeforeUnmount, type Ref } from "vue";
import {VoiceState, type VoiceStateType} from "../Constant/VoiceConstant.ts";
import {STTLang} from "../Constant/STTLangConstant.ts";

type SpeechRecognitionInstance = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onstart: (() => void) | null;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    onend: (() => void) | null;
};

interface UseVoiceInputOptions {
    inputQuestion: Ref<string>;
    onFinalTranscript?: () => void;
    lang?: string;
    errorClearDelayMs?: number;
}

export function UseVoiceInput(options: UseVoiceInputOptions) {
    const { inputQuestion, onFinalTranscript, lang = STTLang.IND, errorClearDelayMs = 3500 } = options;

    const voiceState = ref<VoiceStateType>(VoiceState.IDLE);
    const voiceErrorMessage = ref("");
    const isRecording = computed(() => voiceState.value === VoiceState.LISTENING);

    let recognition: SpeechRecognitionInstance | null = null;
    let voiceErrorTimeout: ReturnType<typeof setTimeout> | null = null;

    function BuildRecognition(): SpeechRecognitionInstance | null {
        const SpeechRecognitionCtor: any =
                (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognitionCtor) {
            SetVoiceError("This browser is not support Speech Recognition.");
            return null;
        }

        const recog: SpeechRecognitionInstance = new SpeechRecognitionCtor();
        recog.lang = lang;
        recog.continuous = false;
        recog.interimResults = true;
        recog.maxAlternatives = 1;

        recog.onstart = () => {
            voiceState.value = VoiceState.LISTENING;
            voiceErrorMessage.value = "";
        };

        recog.onresult = (event) => {
            let interim = "";
            let final = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) final += transcript;
                else interim += transcript;
            }

            inputQuestion.value = final || interim;
        };

        recog.onerror = (event) => {
            console.error("Speech recognition error:", event.error);

            const errorMessages: Record<string, string> = {
                "not-allowed": "Microphone permission denied. Enable microphone access in your browser.",
                "no-speech": "No speech detected. Please try again.",
                "audio-capture": "No microphone found.",
                network: "Network connection issue while processing audio.",
                default: "An error occurred with the voice input.",
            };

            SetVoiceError(errorMessages[event.error] ?? "An error occurred with the voice input");
        };

        recog.onend = () => {
            recognition = null;

            if (voiceState.value === VoiceState.LISTENING) voiceState.value = VoiceState.IDLE;

            if (inputQuestion.value.trim()) onFinalTranscript?.();
        };

        return recog;
    }

    function SetVoiceError(message: string) {
        voiceState.value = VoiceState.ERROR;
        voiceErrorMessage.value = message;

        if (voiceErrorTimeout) clearTimeout(voiceErrorTimeout);
        voiceErrorTimeout = setTimeout(() => {
            if (voiceState.value === VoiceState.ERROR) voiceState.value = VoiceState.IDLE;
            voiceErrorMessage.value = "";
        }, errorClearDelayMs);
    }

    function ToggleVoiceInput() {
        if (voiceState.value === VoiceState.LISTENING) {
            recognition?.stop();
            return;
        }

        recognition?.abort();
        recognition = BuildRecognition();
        if (!recognition) return;

        inputQuestion.value = "";

        try {
            recognition.start();
        } catch (err) {
            console.error("Failed to start recognition:", err);
            SetVoiceError("Can't start the voice input, please try again");
        }
    }

    onBeforeUnmount(() => {
        recognition?.abort();
        if (voiceErrorTimeout) clearTimeout(voiceErrorTimeout);
    });

    return { voiceState, voiceErrorMessage, isRecording, ToggleVoiceInput };
}