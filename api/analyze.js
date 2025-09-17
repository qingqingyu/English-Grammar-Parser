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
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount < 5 || wordCount > 500) {
      res.status(400).json({ 
        error: `文本长度不符合要求，需要5-500个单词，当前${wordCount}个单词` 
      });
      return;
    }

    // 设置 Server-Sent Events 头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });
    const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 15000);
    // 在结束前 clearInterval(heartbeat)

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
    // 记录API调用开始
    console.log('🚀 开始调用第三方API...');
    console.log('📡 API地址:', 'https://www.chataiapi.com');
    console.log('🔑 API密钥是否存在:', !!apiKey);
    console.log('📝 请求参数:', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt.substring(0, 100) + '...' }], // 只显示前100字符
      stream: true,
      temperature: 0.3,
      max_tokens: 5000,
    });

    const startTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-1.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        stream: true,
        temperature: 0.3,
        max_tokens: 5000,
      }),
    });

    const responseTime = Date.now() - startTime;
    
    // 记录响应信息
    console.log('⏱️  响应时间:', responseTime + 'ms');
    console.log('📊 响应状态码:', response.status);
    console.log('📋 响应状态文本:', response.statusText);
    console.log('🌐 响应头信息:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('❌ API请求失败!');
      console.error('📄 错误状态:', response.status, response.statusText);
      
      // 尝试读取错误响应体
      try {
        const errorText = await response.text();
        console.error('📝 错误详情:', errorText);
      } catch (e) {
        console.error('💥 无法读取错误响应:', e.message);
      }
      
      throw new Error(`第三方API error: ${response.status} - ${response.statusText}`);
    }

    console.log('✅ API请求成功，开始处理流式响应...');
    
    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('text/event-stream')) {
      const body = await response.text(); // 打印前200字符即可
      console.error('Unexpected upstream content-type:', ct, 'body(head):', body.slice(0,200));
      throw new Error('上游未返回SSE，无法流式解析');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('🏁 流式响应结束');
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        break;
      }

      const chunk = decoder.decode(value);
      console.log('📦 收到数据块长度:', chunk.length);
      // console.log('📦 数据块内容:', chunk); // 如果需要看具体内容可以取消注释
      
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line === 'data: [DONE]') {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          return;
        }
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
          } catch (e) {
            console.warn('Upstream JSON parse failed, line(head):', line.slice(0,200));
          }
        } else if (line.trim()) {
          console.log('Upstream non-data line(head):', line.slice(0,200));
        }
      }
    }
  } catch (error) {
    console.error('💥 API调用出现异常:');
    console.error('🔍 错误类型:', error.constructor.name);
    console.error('📝 错误消息:', error.message);
    console.error('📚 错误堆栈:', error.stack);
    
    // 检查网络连接问题
    if (error.code === 'ENOTFOUND') {
      console.error('🌐 DNS解析失败，API地址可能不存在');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔒 连接被拒绝，API服务可能不可用');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏰ 请求超时');
    }
    
    console.log('🔄 切换到模拟响应模式...');
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
}