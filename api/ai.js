module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const prompt = body && body.prompt;

    if (!prompt) {
      return res.status(400).json({ error: 'Thiếu nội dung yêu cầu' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chưa nhận được GEMINI_API_KEY trên Vercel' });
    }

    const response = await fetch(
      `https://googleapis.com{apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Lỗi từ Google AI' });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI đang bận suy nghĩ, thử lại nhé!';
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Lỗi server nội bộ' });
  }
};
