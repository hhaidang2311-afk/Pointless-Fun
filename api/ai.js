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
    let response = null;

    for (const model of current.models) {
      const endpoint = `https:/` + `/${host}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const resFetch = await fetch(endpoint, {
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

      if (resFetch.ok) {
        response = resFetch;
        break;
      }
    }

    if (!response) {
      return res.status(500).json({ error: 'AI đang quá tải, thử lại sau vài giây nhé!' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(jsonStr);
              const text = parsed.candidates?.at(0)?.content?.parts?.at(0)?.text;
              if (text) res.write(text);
            } catch (e) {}
          }
        }
      }
    }

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Lỗi kết nối' });
    } else {
      res.end();
    }
  }
};
