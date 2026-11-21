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

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    const models = ['gemini-3.8-flash', 'gemini-3.8-flash-lite', 'gemini-3.5-flash'];
    let lastError = 'AI đang bận suy nghĩ, thử lại nhé!';

    for (const model of models) {
      const url = new URL('https://' + 'generativelanguage.googleapis.com' + `/v1beta/models/${model}:generateContent`);
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const reply = data.candidates?.at(0)?.content?.parts?.at(0)?.text || 'AI đang bận suy nghĩ, thử lại nhé!';
        return res.status(200).json({ reply });
      }
      lastError = data.error?.message || JSON.stringify(data);
    }

    return res.status(500).json({ error: lastError });
  } catch (error) {
    return res.status(500).json({ error: error.cause?.message || error.message || 'Lỗi kết nối' });
  }
};
