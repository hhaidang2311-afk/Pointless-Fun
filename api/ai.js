module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const prompt = (body && body.prompt) || '';
    const length = (body && body.length) || 'short'; // 'short', 'medium', hoặc 'long'

    if (!prompt) {
      return res.status(400).json({ error: 'Thiếu nội dung yêu cầu' });
    }

    // Phân luồng thông minh theo độ dài người dùng chọn
    const configMap = {
      short: {
        models: ['gemini-3.5-flash-lite', 'gemini-3.8-flash'],
        maxTokens: 120,
        budget: 0,
        note: ' (Yêu cầu: Trả lời siêu ngắn gọn, súc tích đúng 1-2 câu).'
      },
      medium: {
        models: ['gemini-3.5-flash-lite', 'gemini-3.8-flash'],
        maxTokens: 280,
        budget: 0,
        note: ' (Yêu cầu: Trả lời độ dài trung bình khoảng 3-4 câu, mạch lạc, đủ ý).'
      },
      long: {
        models: ['gemini-3.8-flash', 'gemini-3.5-flash-lite'],
        maxTokens: 600,
        budget: 512,
        note: ' (Yêu cầu: Trả lời chi tiết, trau chuốt và sâu sắc khoảng 1-2 đoạn ngắn).'
      }
    };

    const current = configMap[length] || configMap.short;
    const apiKey = encodeURIComponent((process.env.GEMINI_API_KEY || '').trim());
    const host = ['generativelanguage', 'googleapis', 'com'].join('.');
    let lastError = 'AI đang bận suy nghĩ, thử lại nhé!';

    for (const model of current.models) {
      const endpoint = `https:/` + `/${host}/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt + current.note }] }],
          generationConfig: {
            maxOutputTokens: current.maxTokens,
            temperature: 0.85,
            thinkingConfig: { thinkingBudget: current.budget }
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
