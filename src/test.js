// Node.js 18+ 版本（支持原生 fetch）
async function testStreamAPI() {
    const apiKey = 'sk-MDbHHqwRpz8xHcwEoQL4CgGqyEhY94pzFEL8bIXKZ23XOx3F';
    const prompt = '你好，请介绍一下自己';
  
    console.log('🔄 正在请求 API...\n');
  
    try {
      const response = await fetch('https://www.chataiapi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-1.5-pro',
          messages: [
            { role: 'user', content: prompt }
          ],
          stream: true,
          temperature: 0.3,
          max_tokens: 5000,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      console.log('📝 AI 回复：\n');
  
      // 读取流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
  
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
  
        // 解码数据块
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
  
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // 去掉 'data: '
  
            if (data === '[DONE]') {
              console.log('\n\n✅ 完成！');
              break;
            }
  
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              
              if (content) {
                process.stdout.write(content); // 实时打印（不换行）
                fullContent += content;
              }
            } catch (e) {
              // 跳过无法解析的行
            }
          }
        }
      }
  
      console.log(`\n总字符数: ${fullContent.length}`);
  
    } catch (error) {
      console.error('❌ 错误:', error.message);
    }
  }
  
  // 运行
  testStreamAPI();