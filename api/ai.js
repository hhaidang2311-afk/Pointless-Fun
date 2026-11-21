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
      short: { maxTokens: 120, note: ' (Trả lời siêu ngắn gọn, tự nhiên đúng 1-2 câu).' },
      medium: { maxTokens: 280, note: ' (Trả lời tự nhiên khoảng 3-4 câu, mạch lạc, đúng trọng tâm).' },
      long: { maxTokens: 550, note: ' (Trả lời chi tiết, tự nhiên và cuốn hút khoảng 1-2 đoạn ngắn).' }
    };

    const current = lengthConfig[length] || lengthConfig.short;
    const apiKey = encodeURIComponent((process.env.GEMINI_API_KEY || '').trim());
    const host = ['generativelanguage', 'googleapis', 'com'].join('.');
    const endpoint = `https:/` + `/${host}/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

    const systemRule = 'Viết tiếng Việt tự nhiên như người thật, bám sát 100% chi tiết người dùng nhập. Tự xác định cách xưng hô phù hợp đúng với đối tượng và mối quan hệ trong ngữ cảnh (tuyệt đối không mặc định xưng "em" nếu không phải cấp dưới/học sinh, không dùng văn mẫu sáo rỗng).';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemRule }]
        },
        contents: [{ parts: [{ text: prompt + current.note }] }],
        generationConfig: {
          maxOutputTokens: current.maxTokens,
          temperature: 0.9
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
};
