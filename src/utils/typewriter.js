// src/utils/typewriter.js - 打字机效果工具类
export class TypewriterRenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      speed: 20, // 打字速度（毫秒）
      showCursor: true, // 是否显示光标
      cursorChar: '|', // 光标字符
      pauseOnPunctuation: 50, // 标点符号后的额外停顿
      ...options
    };
    
    this.isTyping = false;
    this.queue = [];
    this.currentContent = '';
    this.cursorElement = null;
  }

  // 添加内容到队列
  addToQueue(content) {
    this.queue.push(content);
    if (!this.isTyping) {
      this.processQueue();
    }
  }

  // 处理队列
  async processQueue() {
    if (this.queue.length === 0) {
      this.isTyping = false;
      this.hideCursor();
      return;
    }

    this.isTyping = true;
    this.showCursor();

    while (this.queue.length > 0) {
      const content = this.queue.shift();
      await this.typeContent(content);
    }

    this.isTyping = false;
    this.hideCursor();
  }

  // 打字内容
  async typeContent(content) {
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      this.currentContent += char;
      
      // 渲染Markdown内容
      this.renderMarkdown(this.currentContent);
      
      // 计算延迟
      let delay = this.options.speed;
      if (this.isPunctuation(char)) {
        delay += this.options.pauseOnPunctuation;
      }
      
      await this.sleep(delay);
    }
  }

  // 渲染Markdown
  renderMarkdown(content) {
    const html = this.parseMarkdown(content);
    this.container.innerHTML = html;
    
    if (this.options.showCursor && this.isTyping) {
      this.updateCursor();
    }
    
    // 自动滚动
    this.container.scrollTop = this.container.scrollHeight;
  }

  // 简单的Markdown解析
  parseMarkdown(content) {
    let html = content
      // 标题
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      
      // 粗体
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      
      // 斜体
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      
      // 代码
      .replace(/`(.*?)`/g, '<code>$1</code>')
      
      // 列表项
      .replace(/^[\s]*-[\s]+(.*$)/gm, '<li>$1</li>')
      
      // 换行
      .replace(/\n/g, '<br>');

    // 包装连续的列表项
    html = html.replace(/(<li>.*?<\/li>)(\s*<br>\s*<li>.*?<\/li>)*/g, (match) => {
      return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
    });

    return html;
  }

  // 显示光标
  showCursor() {
    if (!this.options.showCursor) return;
    
    if (!this.cursorElement) {
      this.cursorElement = document.createElement('span');
      this.cursorElement.className = 'typewriter-cursor';
      this.cursorElement.textContent = this.options.cursorChar;
      this.cursorElement.style.cssText = `
        animation: blink 1s infinite;
        color: #667eea;
        font-weight: bold;
      `;
    }
  }

  // 更新光标位置
  updateCursor() {
    if (!this.cursorElement) return;
    
    // 移除旧光标
    const oldCursor = this.container.querySelector('.typewriter-cursor');
    if (oldCursor) {
      oldCursor.remove();
    }
    
    // 添加新光标
    this.container.appendChild(this.cursorElement.cloneNode(true));
  }

  // 隐藏光标
  hideCursor() {
    const cursor = this.container.querySelector('.typewriter-cursor');
    if (cursor) {
      cursor.remove();
    }
  }

  // 判断是否是标点符号
  isPunctuation(char) {
    return /[.,!?;:]/.test(char);
  }

  // 延迟函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 清除内容
  clear() {
    this.queue = [];
    this.currentContent = '';
    this.isTyping = false;
    this.container.innerHTML = '';
    this.hideCursor();
  }

  // 立即显示内容（跳过打字效果）
  showInstantly(content) {
    this.clear();
    this.currentContent = content;
    this.renderMarkdown(content);
  }

  // 获取当前内容
  getCurrentContent() {
    return this.currentContent;
  }

  // 设置选项
  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }
}