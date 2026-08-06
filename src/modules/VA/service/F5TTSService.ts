import type {F5TtsReqDto} from "../dto/F5TtsDto.ts";
import Http from "../../../miblue/helper/HttpHelper.ts";
import {HttpConstant} from "../../../app/constants/HttpConstant.ts";
import type {Ref} from "vue";
import {Chunker} from "../../../miblue/helper/Chunker.ts";

export interface F5TTSService_Config {
    ttsBaseUrl: string
    singleResEndpoint: string
    wsBaseUrl: string
    streamResEndpoint: string
    live2dRef: Ref<any>
}

class F5TTSService {
    private config: F5TTSService_Config
    private TTSReference = {
        refAudio: "I:/Project/Virtual-Assistant-Project/VA-FE/public/assets/audio/VO_Sangonomiya_Kokomi_Chat_-_Fish.wav"
        , refText: "Respect must be given to the will of every creature. Each fish in the ocean swims in its own direction."
    }

    constructor(config: F5TTSService_Config) {
        this.config = config
    }

    public async GetTTS(text: string) {

        const request: F5TtsReqDto = this.MakeF5TTSReq(text)

        return await Http.post<Blob>(
                this.config.ttsBaseUrl
                , this.config.singleResEndpoint
                , request
                , undefined
                , HttpConstant.RESPONSE_TYPE.BLOB
        );
    }

    public async ChunkTTS(text: string) {
        const chunks = Chunker.chunk(text);

        const audioQueue: Blob[] = [];
        let producerFinished = false;

        const producer = async () => {
            for (const chunk of chunks) {
                const audio = await this.GetTTS(chunk);
                audioQueue.push(audio);
            }
            producerFinished = true;
        };

        const consumer = async () => {
            while (
                    !producerFinished ||
                    audioQueue.length > 0
                    ) {
                if (audioQueue.length === 0) {
                    await new Promise(resolve =>
                            setTimeout(resolve, 50)
                    );
                    continue;
                }

                const audio = audioQueue.shift();
                if (audio) {
                    await this.config.live2dRef.value.playVoice(audio);
                }
            }
        };

        await Promise.all([
            producer(),
            consumer()
        ]);
    }

    public async StreamTTS(text: string): Promise<void> {
        return new Promise((resolve, reject) => {

            const ttsWsUrl = this.config.wsBaseUrl + this.config.streamResEndpoint
            const socket = new WebSocket(ttsWsUrl);

            const audioQueue: Blob[] = [];
            let isPlaying = false;
            let isFinished = false;

            const PlayNext = async () => {
                if (isPlaying) {
                    return;
                }
                if (audioQueue.length === 0) {
                    if (isFinished) {
                        socket.close();
                        resolve();
                    }
                    return;
                }
                const audio = audioQueue.shift();
                if (!audio) {
                    return;
                }
                isPlaying = true;

                try {
                    await this.config.live2dRef.value.playVoice(audio);
                } catch (error) {
                    socket.close();
                    reject(error);
                    return;
                } finally {
                    isPlaying = false;
                }
                await PlayNext();
            };

            socket.onopen = () => {
                const request: F5TtsReqDto = this.MakeF5TTSReq(text)
                socket.send(JSON.stringify(request));
            };

            socket.onmessage = async (
                    event: MessageEvent
            ) => {
                if (event.data instanceof Blob) {
                    const audio = new Blob(
                            [event.data],
                            {
                                type: "audio/wav"
                            }
                    );

                    audioQueue.push(audio);

                    if (!isPlaying) {
                        await PlayNext();
                    }

                    return;
                }
            };

            socket.onerror = (
                    error
            ) => {
                console.error(
                        "TTS WebSocket error:",
                        error
                );
                reject(error);
            };

            socket.onclose = () => {
                isFinished = true;
                if (!isPlaying) {
                    PlayNext();
                }
            };
        });
    }

    private MakeF5TTSReq(text: string): F5TtsReqDto {
        return {
            ref_audio: this.TTSReference.refAudio
            , ref_text: this.TTSReference.refText
            , gen_text: text
        }
    }
}