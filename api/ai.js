module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const prompt = (body && body.prompt) || '';

    if (!prompt) {
      return res.status(400).json({ error: 'Thiếu nội dung yêu cầu' });
    }

    // Đánh giá độ khó của yêu cầu
    const isComplex = prompt.length > 60 || /bói|tư vấn|phân tích|giải thích|chi tiết/i.test(prompt);

    // Câu khó ưu tiên bản 3.8-flash xịn trước; câu bình thường ưu tiên bản 3.5-flash-lite nhanh & tiết kiệm trước
    const models = isComplex
      ? ['gemini-3.8-flash', 'gemini-3.5-flash-lite']
      : ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];

    const apiKey = encodeURIComponent((process.env.GEMINI_API_KEY || '').trim());
    const host = ['generativelanguage', 'googleapis', 'com'].join('.');
    let lastError = 'AI đang bận suy nghĩ, thử lại nhé!';

    for (const model of models) {
      const endpoint = `https:/` + `/${host}/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: isComplex
                ? prompt + ' (Trả lời sáng tạo, sâu sắc nhưng súc tích trong khoảng 3-4 câu).'
                : prompt + ' (Trả lời siêu ngắn gọn 1-2 câu hài hước, vô tri).'
            }]
          }],
          generationConfig: {
            maxOutputTokens: isComplex ? 350 : 120,
            temperature: 0.9,
            thinkingConfig: { thinkingBudget: isComplex ? 512 : 0 }
          }
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
