export const Chunker = {
    chunk(text: string, maxWords: number = 10): string[] {
        if (!text.trim()) return [];

        text = text.replace(/\s+/g, " ").trim();

        const chunks: string[] = [];
        const sentences = text
                .split(/(?<=[.!?])\s+/)
                .filter(Boolean);

        for (const sentence of sentences) {

            const words = sentence.split(/\s+/);

            if (words.length <= maxWords) {
                chunks.push(sentence.trim());
                continue;
            }

            const totalChunks = Math.ceil(words.length / maxWords);
            const baseSize = Math.floor(words.length / totalChunks);
            const remainder = words.length % totalChunks;

            let start = 0;

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {

                let size = baseSize + (chunkIndex < remainder ? 1 : 0);
                let end = start + size;

                if (chunkIndex < totalChunks - 1) {

                    const minEnd = start + Math.max(1, Math.floor(size / 2));

                    for (let i = end - 1; i >= minEnd; i--) {
                        if (words[i].endsWith(",")) {
                            end = i + 1;
                            break;
                        }
                    }
                }

                chunks.push(
                        words.slice(start, end)
                                .join(" ")
                                .trim()
                );

                start = end;
            }
        }

        return chunks;
    }
};