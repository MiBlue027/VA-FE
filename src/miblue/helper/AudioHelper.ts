export default class AudioHelper {
    static async play(audioBlob: Blob): Promise<void> {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        return new Promise((resolve, reject) => {
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                resolve();
            };

            audio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                reject(new Error("Failed to play audio."));
            };

            audio.play().catch((err) => {
                URL.revokeObjectURL(audioUrl);
                reject(err);
            });
        });
    }
}