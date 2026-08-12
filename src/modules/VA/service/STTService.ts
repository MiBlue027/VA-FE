import { ref, computed, onBeforeUnmount } from "vue";
import type { Ref } from "vue";
import type {VoiceStateType} from "../Constant/VoiceConstant.ts";

// Minimal typings
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


/**
 * Wraps the Web Speech API. `inputQuestion` is the same ref the textarea is
 * bound to, so interim/final transcripts flow straight into it. `onAutoSubmit`
 * is called once recognition ends if there's text sitting in the box, mirroring
 * the original "stop talking -> auto submit" behaviour.
 */
export function UseVoiceInput(inputQuestion: Ref<string>, onAutoSubmit: () => void) {
    const voiceState = ref<VoiceStateType>("idle");
    const voiceErrorMessage = ref("");
    const isRecording = computed(() => voiceState.value === "listening");

    let recognition: SpeechRecognitionInstance | null = null;
    let voiceErrorTimeout: ReturnType<typeof setTimeout> | null = null;

    function BuildRecognition(): SpeechRecognitionInstance | null {
        const SpeechRecognitionCtor: any =
                (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognitionCtor) {
            SetVoiceError("Browser ini tidak mendukung voice input (Speech Recognition).");
            return null;
        }

        const recog: SpeechRecognitionInstance = new SpeechRecognitionCtor();
        recog.lang = "id-ID";
        recog.continuous = false;
        recog.interimResults = true;
        recog.maxAlternatives = 1;

        // Only flip the UI to "listening" once the engine actually confirms it
        // started (mic permission granted, capture running). See original
        // component for the reasoning behind avoiding an optimistic state flip.
        recog.onstart = () => {
            voiceState.value = "listening";
            voiceErrorMessage.value = "";
        };

        recog.onresult = (event) => {
            let interim = "";
            let final = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            inputQuestion.value = final || interim;
        };

        recog.onerror = (event) => {
            console.error("Speech recognition error:", event.error);

            const messages: Record<string, string> = {
                "not-allowed": "Izin mikrofon ditolak. Aktifkan akses mikrofon di browser.",
                "no-speech": "Tidak ada suara terdeteksi. Coba lagi.",
                "audio-capture": "Mikrofon tidak ditemukan.",
                network: "Koneksi bermasalah saat memproses suara.",
            };

            SetVoiceError(messages[event.error] ?? "Terjadi kesalahan pada voice input.");
        };

        recog.onend = () => {
            // A fresh recognition instance is created on every toggle (see
            // ToggleVoiceInput), so once this one ends it's discarded rather
            // than reused — reusing a single SpeechRecognition instance across
            // multiple start() calls is what silently stopped STT from working
            // in some browsers after the first attempt.
            recognition = null;

            if (voiceState.value === "listening") {
                voiceState.value = "idle";
            }

            if (inputQuestion.value.trim()) {
                onAutoSubmit();
            }
        };

        return recog;
    }

    function SetVoiceError(message: string) {
        voiceState.value = "error";
        voiceErrorMessage.value = message;

        if (voiceErrorTimeout) clearTimeout(voiceErrorTimeout);
        voiceErrorTimeout = setTimeout(() => {
            if (voiceState.value === "error") voiceState.value = "idle";
            voiceErrorMessage.value = "";
        }, 3500);
    }

    function ToggleVoiceInput() {
        if (voiceState.value === "listening") {
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

    return {
        voiceState,
        voiceErrorMessage,
        isRecording,
        ToggleVoiceInput,
    };
}