module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const prompt = (body && body.prompt) || '';
    const length = (body && body.length) || 'short';

    if (!prompt) {
      return res.status(400).json({ error: 'Thiếu nội dung yêu cầu' });
    }

    const lengthConfig = {
      short: { maxTokens: 120, note: ' (Yêu cầu: Trả lời siêu ngắn gọn, súc tích đúng 1-2 câu).' },
      medium: { maxTokens: 280, note: ' (Yêu cầu: Trả lời độ dài trung bình khoảng 3-4 câu, mạch lạc, đủ ý).' },
      long: { maxTokens: 550, note: ' (Yêu cầu: Trả lời chi tiết, trau chuốt khoảng 1-2 đoạn ngắn).' }
    };

    const current = lengthConfig[length] || lengthConfig.short;
    const apiKey = encodeURIComponent((process.env.GEMINI_API_KEY || '').trim());
    const host = ['generativelanguage', 'googleapis', 'com'].join('.');
    const endpoint = `https:/` + `/${host}/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt + current.note }] }],
        generationConfig: {
          maxOutputTokens: current.maxTokens,
          temperature: 0.85
        }
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'AI đang bận, thử lại sau vài giây nhé!' });
    }

    const reply = data.candidates?.at(0)?.content?.parts?.at(0)?.text || 'AI đang bận suy nghĩ, thử lại nhé!';
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Lỗi kết nối' });
  }
}
