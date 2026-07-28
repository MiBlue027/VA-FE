<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

const PIXI = (window as any).PIXI;
const Live2DModel = PIXI.live2d.Live2DModel;

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const props = withDefaults(
        defineProps<{
            modelUrl?: string;
        }>(),
        {
            modelUrl: "/assets/Live2DAsset/Resources/Haru/Haru.model3.json",
        }
);

let app: any = null;
let model: any = null;

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array | null = null;
let audio: HTMLAudioElement | null = null;
let lipSyncRegistered = false;

// simpan object URL aktif supaya bisa di-revoke
let currentObjectUrl: string | null = null;

async function initLive2D() {
    if (!canvasRef.value || !containerRef.value) return;
    app = new PIXI.Application({
        view: canvasRef.value,
        resizeTo: containerRef.value,
        backgroundAlpha: 0,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        antialias: true,
    });
    model = await Live2DModel.from(props.modelUrl, {
        autoInteract: false
    });
    console.log(model.internalModel);
    console.log(model);
    app.stage.addChild(model);
    fitModel();
    window.addEventListener("resize", fitModel);
}

function fitModel() {
    if (!app || !model) return;

    model.anchor.set(0.5, 1);
    const targetHeight = app.screen.height * 0.95;

    const scale = targetHeight / model.height;

    model.scale.set(scale);

    model.position.set(
            app.screen.width / 2,
            app.screen.height
    );
}

onMounted(async () => {
    try {
        await initLive2D();
    } catch (err) {
        console.error("Live2D Error:", err);
    }
});

onBeforeUnmount(() => {
    window.removeEventListener("resize", fitModel);
    revokeCurrentObjectUrl();
    if (model) {
        model.destroy({
            children: true,
            texture: true,
            baseTexture: true,
        });
    }
    if (app) {
        app.destroy(true);
    }
});

function revokeCurrentObjectUrl() {
    if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
    }
}

/**
 * playVoice sekarang menerima Blob (hasil TTS langsung),
 * tapi tetap backward-compatible kalau ada yang kirim string URL.
 */
async function playVoice(source: Blob | string) {

    if (!audioContext) {
        audioContext = new AudioContext();
    }

    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

    if (audio) {
        audio.pause();
    }

    // bersihkan object URL lama sebelum bikin yang baru
    revokeCurrentObjectUrl();

    let url: string;
    if (source instanceof Blob) {
        url = URL.createObjectURL(source);
        currentObjectUrl = url;
    } else {
        url = source;
    }

    audio = new Audio(url);

    const source_ = audioContext.createMediaElementSource(audio);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;

    source_.connect(analyser);
    analyser.connect(audioContext.destination);

    dataArray = new Uint8Array(analyser.frequencyBinCount);

    let currentMouthOpen = 0;
    let currentMouthForm = 0;

    const ATTACK = 0.5;
    const DECAY = 0.15;

    // --- pengaturan senyum ---
    const SMILE_BASE = 0.7;
    const SMILE_VARIATION = 0.2;

    if (!lipSyncRegistered && model) {

        lipSyncRegistered = true;

        model.internalModel.on("beforeModelUpdate", () => {

            if (!analyser || !dataArray) return;

            if (!audio || audio.paused) {
                currentMouthOpen += (0 - currentMouthOpen) * DECAY;
                currentMouthForm += (SMILE_BASE - currentMouthForm) * DECAY;

                model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", currentMouthOpen);
                model.internalModel.coreModel.setParameterValueById("ParamMouthForm", currentMouthForm);
                return;
            }

            analyser.getByteFrequencyData(dataArray);

            const len = dataArray.length;
            const lowEnd = Math.floor(len * 0.35);

            let lowSum = 0, lowCount = 0;
            let highSum = 0, highCount = 0;
            let rmsSum = 0;

            for (let i = 0; i < len; i++) {
                const v = dataArray[i] / 255;
                rmsSum += v * v;

                if (i < lowEnd) {
                    lowSum += v;
                    lowCount++;
                } else {
                    highSum += v;
                    highCount++;
                }
            }

            const rms = Math.sqrt(rmsSum / len);

            let targetMouthOpen = Math.sqrt(rms) * 1.3;
            targetMouthOpen = Math.min(Math.max(targetMouthOpen, 0), 1);

            const lowAvg = lowCount ? lowSum / lowCount : 0;
            const highAvg = highCount ? highSum / highCount : 0;
            const total = lowAvg + highAvg;

            let freqOffset = 0;
            if (total > 0.01) {
                freqOffset = (highAvg - lowAvg) / total;
            }

            let targetMouthForm = SMILE_BASE + freqOffset * SMILE_VARIATION;
            targetMouthForm = Math.min(Math.max(targetMouthForm, SMILE_BASE - SMILE_VARIATION), 1);

            const openRate = targetMouthOpen > currentMouthOpen ? ATTACK : DECAY;
            const formRate = 0.2;

            currentMouthOpen += (targetMouthOpen - currentMouthOpen) * openRate;
            currentMouthForm += (targetMouthForm - currentMouthForm) * formRate;

            model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", currentMouthOpen);
            model.internalModel.coreModel.setParameterValueById("ParamMouthForm", currentMouthForm);
        });

    }

    await audio.play();

    audio.onended = () => {
        model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
        model.internalModel.coreModel.setParameterValueById("ParamMouthForm", SMILE_BASE);
        revokeCurrentObjectUrl();
    };
}


defineExpose({
    playVoice
});

</script>

<template>
    <div ref="containerRef" class="live2d-container">
        <canvas ref="canvasRef"></canvas>
    </div>
</template>

<style scoped>
.live2d-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
}

canvas {
    width: 100%;
    height: 100%;
    display: block;
}
</style>