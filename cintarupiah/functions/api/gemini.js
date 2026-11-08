// Cloudflare Pages Function -> tersedia di alamat /api/gemini
// API key disimpan sebagai Secret: Pages > Settings > Variables and Secrets > GEMINI_API_KEY

const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json" }
    });

export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json().catch(() => ({}));
        const pesanUser = String(body.pesan || "").slice(0, 1000);

        if (!pesanUser) return json({ error: "Pesan kosong." }, 400);
        if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY belum diatur di Cloudflare." }, 500);

        const MODEL = env.GEMINI_MODEL || "gemini-2.5-flash";
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

        const promptSistem =
            "Kamu adalah 'Bli Rupiah AI', asisten dari Bank Indonesia Bali yang ramah, " +
            "paham edukasi Cinta Bangga Paham Rupiah, 3D (Dilihat, Diraba, Diterawang), dan QRIS Bali. " +
            "Jawab singkat dan jelas dalam bahasa Indonesia, dengan sapaan khas Bali. " +
            "Jangan gunakan format markdown.";

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": env.GEMINI_API_KEY
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: promptSistem }] },
                contents: [{ role: "user", parts: [{ text: pesanUser }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API error:", JSON.stringify(data));
            return json({ error: (data.error && data.error.message) || "Gemini API menolak permintaan." }, 502);
        }

        const jawabanAI =
            data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("");

        if (!jawabanAI) {
            console.error("Respons kosong:", JSON.stringify(data));
            return json({ error: "Gemini tidak mengembalikan jawaban." }, 502);
        }

        return json({ reply: jawabanAI });
    } catch (err) {
        console.error("Function error:", err);
        return json({ error: "Gagal memproses pesan ke Gemini API." }, 500);
    }
}
