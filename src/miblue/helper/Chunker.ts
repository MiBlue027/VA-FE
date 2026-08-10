export const Chunker = {
    Chunk(text: string, minWords: number = 8): string[] {
        if (!text.trim()) return [];

        text = text.replace(/\s+/g, " ").trim();

        // batas atas toleransi sebelum kalimat panjang dipaksa dipecah
        const maxWords = Math.round(minWords * 1.6);

        const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

        // 1. Pecah ke kalimat utuh dulu (tidak ada kata terpotong)
        const sentences = text
                .split(/(?<=[.!?])\s+/)
                .filter(Boolean);

        // 2. Kalau satu kalimat sendirian sudah lebih panjang dari maxWords,
        //    baru dipecah di titik koma/titik-koma/konjungsi (tetap per-kata utuh)
        const splitLongSentence = (sentence: string): string[] => {
            const words = sentence.split(/\s+/);

            if (words.length <= maxWords) {
                return [sentence];
            }

            const parts: string[] = [];
            let start = 0;

            while (start < words.length) {
                const remaining = words.length - start;

                if (remaining <= maxWords) {
                    parts.push(words.slice(start).join(" "));
                    break;
                }

                const searchEnd = Math.min(start + maxWords, words.length - 1);
                const searchStart = start + Math.max(1, Math.floor(minWords * 0.6));

                let cut = -1;

                // prioritas 1: koma / titik koma, dicari dari yang paling dekat maxWords
                for (let i = searchEnd; i >= searchStart; i--) {
                    if (/[,;]$/.test(words[i])) {
                        cut = i + 1;
                        break;
                    }
                }

                // prioritas 2: konjungsi umum, potong SEBELUM kata itu
                if (cut === -1) {
                    const conjunctions = /^(dan|tapi|tetapi|atau|karena|sehingga|namun|serta|meski|meskipun|walaupun)$/i;
                    for (let i = searchEnd; i >= searchStart; i--) {
                        if (conjunctions.test(words[i])) {
                            cut = i;
                            break;
                        }
                    }
                }

                // fallback terakhir: potong tepat di minWords (tetap per-kata utuh, tidak elegan tapi jarang kepakai)
                if (cut === -1) {
                    cut = start + minWords;
                }

                parts.push(words.slice(start, cut).join(" "));
                start = cut;
            }

            return parts;
        };

        let pieces: string[] = [];
        for (const sentence of sentences) {
            pieces.push(...splitLongSentence(sentence));
        }

        // 3. Gabung piece2 (kalimat pendek / hasil split) sampai mencapai minWords
        const chunks: string[] = [];
        let buffer = "";
        let bufferWords = 0;

        for (const piece of pieces) {
            const pieceWords = wordCount(piece);

            if (buffer === "") {
                buffer = piece;
                bufferWords = pieceWords;
            } else if (bufferWords < minWords) {
                buffer += " " + piece;
                bufferWords += pieceWords;
            } else {
                chunks.push(buffer.trim());
                buffer = piece;
                bufferWords = pieceWords;
            }

            if (bufferWords >= maxWords) {
                chunks.push(buffer.trim());
                buffer = "";
                bufferWords = 0;
            }
        }

        if (buffer.trim()) {
            chunks.push(buffer.trim());
        }

        // 4. Kalau chunk TERAKHIR kependekan (misal cuma 3 kata), gabung ke chunk sebelumnya
        if (chunks.length > 1) {
            const lastWords = wordCount(chunks[chunks.length - 1]);
            const minAcceptable = Math.max(5, Math.floor(minWords / 2));

            if (lastWords < minAcceptable) {
                const last = chunks.pop() as string;
                chunks[chunks.length - 1] += " " + last;
            }
        }

        return chunks;
    }
};