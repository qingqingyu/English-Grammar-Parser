// api/analyze.js - Vercel 无服务器函数
export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 获取文本参数
    let text;
    if (req.method === 'GET') {
      text = req.query.text;
    } else {
      text = req.body.text;
    }

    if (!text) {
      res.status(400).json({ error: '缺少文本参数' });
      return;
    }

    // 验证文本长度
    const wordCount = text.trim().split(/\\s+/).length;
    if (wordCount < 5 || wordCount > 500) {
      res.status(400).json({ 
        error: `文本长度不符合要求，需要5-500个单词，当前${wordCount}个单词` 
      });
      return;
    }

    // 设置 Server-Sent Events 头
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // 构建 AI Prompt
    const prompt = buildGrammarAnalysisPrompt(text);

    // 调用 OpenAI API 进行流式分析
    await streamAnalysis(prompt, res);

  } catch (error) {
    console.error('Analysis error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: '分析服务暂时不可用',
        details: error.message 
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\\n\\n`);
      res.end();
    }
  }
}

// 构建语法分析的 Prompt
function buildGrammarAnalysisPrompt(text) {
  return `请你当我的英语老师。我给你一段英文，你帮我分析这段英文的句式和语法。请用中文回答。

规则：
- 请按照以下格式逐句分析：

1. 句子：[原句]
2. 语法结构：[解释句子的语法和结构]
3. 高级词汇（B1以上）：[列出B1级别以上的词汇/短语，同义词和例句]
4. 整体理解：[解释句子的含义]
5. 知识要点：
   - 专业术语：[如有，提供准确定义，解释其在该领域的重要性]
   - 文化典故：[如有，说明其历史背景和含义]
   - 历史背景：[如相关，解释其如何影响文本的理解]
   - 隐喻象征：[如有，分析其深层含义]
6. 只提供核心分析内容，不要添加任何引导语、过渡语或结束语

要分析的英文文本：
${text}`;
}

// 流式分析函数
async function streamAnalysis(prompt, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    // 如果没有 API 密钥，使用模拟响应
    await simulateAnalysis(prompt, res);
    return;
  }

  try {
    const response = await fetch('https://www.chataiapi.com', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        stream: true,
        temperature: 0.3,
        max_tokens: 5000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        res.write(`data: ${JSON.stringify({ done: true })}\\n\\n`);
        res.end();
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices[0]?.delta?.content;
            
            if (content) {
              res.write(`data: ${JSON.stringify({ content, done: false })}\\n\\n`);
            }
          } catch (parseError) {
            // 忽略解析错误
          }
        }
      }
    }
  } catch (error) {
    console.error('OpenAI streaming error:', error);
    await simulateAnalysis(prompt, res);
  }
}

// 模拟分析响应（用于测试或无API密钥时）
async function simulateAnalysis(prompt, res) {
  const text = extractTextFromPrompt(prompt);
  const mockAnalysis = generateMockAnalysis(text);
  
  // 模拟打字机效果
  for (let i = 0; i < mockAnalysis.length; i++) {
    const char = mockAnalysis[i];
    res.write(`data: ${JSON.stringify({ content: char, done: false })}\\n\\n`);
    
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  
  res.write(`data: ${JSON.stringify({ done: true })}\\n\\n`);
  res.end();
}

// 从 prompt 中提取文本
function extractTextFromPrompt(prompt) {
  const match = prompt.match(/要分析的英文文本：\\n(.+)$/s);
  return match ? match[1].trim() : 'Sample text';
}

// 生成模拟分析结果
function generateMockAnalysis(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  return `## 语法分析结果

### 1. 句子：${sentences[0] || text}

### 2. 语法结构
这是一个${sentences.length > 1 ? '复合句' : '简单句'}，包含主谓宾结构。

### 3. 高级词汇（B1以上）
- **analysis** /əˈnæləsɪs/ - 分析
- **structure** /ˈstrʌktʃər/ - 结构
- **complex** /ˈkɒmpleks/ - 复杂的

### 4. 整体理解
该句子表达了一个完整的概念，语法结构清晰。

### 5. 知识要点
- **语法特点**：使用了标准的英语语法结构
- **句式特征**：符合英语表达习惯
- **学习建议**：注意时态和语态的使用

*注意：这是一个演示响应。实际分析需要配置 OpenAI API 密钥。*`;
}`;
}