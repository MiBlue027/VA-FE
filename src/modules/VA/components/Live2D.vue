<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";

const PIXI = (window as any).PIXI;
const Live2DModel = PIXI.live2d.Live2DModel;

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

/**
 * All framing knobs live here so the parent can tune "how big, how
 * cropped, where" from the outside without touching this file.
 *
 * - fitHeightRatio: at zoom = 1, the model's rendered height as a
 *   fraction of the canvas height. 0.98 ~= almost fills the canvas.
 * - zoom: multiplier on top of fitHeightRatio. >1 makes the model
 *   bigger (crops more), <1 makes it smaller (shows more headroom).
 * - anchorX: 0-1, horizontal position of the model's center line
 *   within the canvas (0.5 = centered).
 * - verticalAnchorOffset: 0-1, fraction of the model's rendered
 *   height that gets pushed below the bottom edge of the canvas.
 *   0 = feet exactly touch the bottom (full body, no crop).
 *   e.g. 0.18 crops off roughly the shins/feet for a closer, "upper
 *   body" framing. This crop happens at the PIXI/canvas level (real
 *   clipping against the render target), never via a CSS transform,
 *   so the model stays pixel-crisp at any zoom instead of looking
 *   blurry/pixelated the way a CSS `scale()` on the canvas would.
 */
const props = withDefaults(
        defineProps<{
            modelUrl?: string;
            zoom?: number;
            fitHeightRatio?: number;
            anchorX?: number;
            verticalAnchorOffset?: number;
        }>(),
        {
            modelUrl: "/assets/Live2DAsset/Resources/Haru/Haru.model3.json",
            zoom: 1,
            fitHeightRatio: 0.98,
            anchorX: 0.5,
            verticalAnchorOffset: 0,
        }
);

let app: any = null;
let model: any = null;
let naturalHeight = 0; // model's rendered height at scale = 1, captured once on load

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array<ArrayBuffer>| null = null;
let audio: HTMLAudioElement | null = null;
let lipSyncRegistered = false;

// simpan object URL aktif supaya bisa di-revoke
let currentObjectUrl: string | null = null;

// --- resize / zoom plumbing -------------------------------------------------
let resizeObserver: ResizeObserver | null = null;
let dprMediaQuery: MediaQueryList | null = null;

async function InitLive2D() {
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
        autoInteract: false,
    });

    // Capture the model's natural (unscaled) height once, before we
    // ever touch model.scale. Every future fit is derived from this,
    // so repeated resizes never compound rounding/scale error.
    naturalHeight = model.height;

    app.stage.addChild(model);

    HandleContainerResize();

    resizeObserver = new ResizeObserver(() => HandleContainerResize());
    resizeObserver.observe(containerRef.value);

    // Fallback for environments without a well-behaved ResizeObserver.
    window.addEventListener("resize", HandleContainerResize);

    WatchDevicePixelRatio();
}

/**
 * Resizes the renderer to match the container's *actual* current box
 * (not just window size — this also fires when the container shrinks
 * because a sidebar opened, etc.) and re-fits the model inside it.
 */
function HandleContainerResize() {
    if (!app || !containerRef.value) return;

    const { clientWidth, clientHeight } = containerRef.value;
    if (!clientWidth || !clientHeight) return;

    app.renderer.resize(clientWidth, clientHeight);
    fitModel();
}

/**
 * Browser/OS zoom changes devicePixelRatio without reliably firing a
 * window "resize" event in every browser. Watching a matchMedia query
 * tied to the current dpr is the standard way to catch that and keep
 * the canvas rendering at native resolution (otherwise the model
 * looks soft/pixelated after zooming).
 */
function WatchDevicePixelRatio() {
    dprMediaQuery?.removeEventListener("change", OnDevicePixelRatioChange);
    dprMediaQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprMediaQuery.addEventListener("change", OnDevicePixelRatioChange, { once: true });
}

function OnDevicePixelRatioChange() {
    if (app) {
        app.renderer.resolution = window.devicePixelRatio || 1;
        HandleContainerResize();
    }
    // matchMedia listeners are one-shot per query instance; re-arm for the next zoom step.
    WatchDevicePixelRatio();
}

function fitModel() {
    if (!app || !model || !naturalHeight) return;

    const screenW = app.screen.width;
    const screenH = app.screen.height;
    if (!screenW || !screenH) return;

    model.anchor.set(props.anchorX, 1);

    const scale = (screenH * props.fitHeightRatio * props.zoom) / naturalHeight;
    model.scale.set(scale);

    const renderedHeight = naturalHeight * scale;
    const verticalOffsetPx = renderedHeight * props.verticalAnchorOffset;

    // anchor.y = 1 means position.y is where the model's *feet* sit.
    // Pushing that point verticalOffsetPx below the canvas bottom (screenH)
    // is what crops the lower body, cleanly clipped by the canvas edge.
    model.position.set(screenW * props.anchorX, screenH + verticalOffsetPx);
}

// Re-fit whenever a framing prop changes, so the parent can live-tune
// zoom/crop/position (e.g. from a settings panel or backend config).
watch(
        () => [props.zoom, props.fitHeightRatio, props.anchorX, props.verticalAnchorOffset],
        () => fitModel()
);

onMounted(async () => {
    try {
        await InitLive2D();
    } catch (err) {
        console.error("Live2D Error:", err);
    }
});

onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;

    dprMediaQuery?.removeEventListener("change", OnDevicePixelRatioChange);
    dprMediaQuery = null;

    window.removeEventListener("resize", HandleContainerResize);

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
async function PlayVoice(source: Blob | string): Promise<void> {

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

    dataArray = new Uint8Array(
        new ArrayBuffer(analyser.frequencyBinCount)
    );

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

    return new Promise<void>((resolve, reject) => {
        if (!audio) {
            reject(new Error("Audio element not initialized"));
            return;
        }

        audio.onended = () => {
            model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
            model.internalModel.coreModel.setParameterValueById("ParamMouthForm", SMILE_BASE);
            revokeCurrentObjectUrl();
            resolve();
        };

        audio.onerror = (e) => {
            revokeCurrentObjectUrl();
            reject(e);
        };

        audio.play().catch(reject);
    });
}

defineExpose({
    playVoice: PlayVoice,
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