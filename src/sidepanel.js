// src/sidepanel.js - Side Panel 逻辑 V2.0
import { TypewriterRenderer } from './utils/typewriter.js';

class GrammarParserApp {
  constructor() {
    this.currentText = '';
    this.currentAnalysis = '';
    this.isAnalyzing = false;
    this.eventSource = null;
    this.typewriter = null;
    
    this.initializeElements();
    this.bindEvents();
    this.loadSettings();
    this.loadHistory();
    
    // 初始化打字机效果
    this.initializeTypewriter();
    
    // 监听来自 background 的消息
    chrome.runtime.onMessage.addListener((message) => {
      this.handleMessage(message);
    });
  }

  initializeTypewriter() {
    this.typewriter = new TypewriterRenderer(this.resultContent, {
      speed: 15,
      showCursor: true,
      pauseOnPunctuation: 30
    });
  }

  initializeElements() {
    // 按钮元素
    this.analyzeBtn = document.getElementById('analyzeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.historyBtn = document.getElementById('historyBtn');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.copyResultBtn = document.getElementById('copyResultBtn');
    this.saveResultBtn = document.getElementById('saveResultBtn');

    // 输入和显示元素
    this.textInput = document.getElementById('textInput');
    this.selectedTextSection = document.getElementById('selectedTextSection');
    this.selectedText = document.getElementById('selectedText');
    this.wordCount = document.getElementById('wordCount');
    this.resultContent = document.getElementById('resultContent');

    // 侧边栏元素
    this.historySidebar = document.getElementById('historySidebar');
    this.settingsSidebar = document.getElementById('settingsSidebar');
    this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.historyList = document.getElementById('historyList');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // 设置表单元素
    this.apiUrlInput = document.getElementById('apiUrl');
    this.minWordsInput = document.getElementById('minWords');
    this.maxWordsInput = document.getElementById('maxWords');
    this.themeSelect = document.getElementById('theme');
    this.autoTriggerCheckbox = document.getElementById('autoTrigger');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    this.resetSettingsBtn = document.getElementById('resetSettingsBtn');

    // 加载遮罩
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.progressFill = document.getElementById('progressFill');
  }

  bindEvents() {
    // 分析按钮
    this.analyzeBtn.addEventListener('click', () => {
      const text = this.textInput.value.trim();
      if (text) {
        this.analyzeText(text);
      }
    });

    // 清空按钮
    this.clearBtn.addEventListener('click', () => {
      this.clearContent();
    });

    // 文本输入监听
    this.textInput.addEventListener('input', (e) => {
      this.updateWordCount(e.target.value);
    });

    // 历史记录按钮
    this.historyBtn.addEventListener('click', () => {
      this.toggleHistorySidebar();
    });

    // 设置按钮
    this.settingsBtn.addEventListener('click', () => {
      this.toggleSettingsSidebar();
    });

    // 关闭侧边栏
    this.closeHistoryBtn.addEventListener('click', () => {
      this.closeHistorySidebar();
    });

    this.closeSettingsBtn.addEventListener('click', () => {
      this.closeSettingsSidebar();
    });

    // 结果操作按钮
    this.copyResultBtn.addEventListener('click', () => {
      this.copyResult();
    });

    this.saveResultBtn.addEventListener('click', () => {
      this.saveToHistory();
    });

    // 清空历史记录
    this.clearHistoryBtn.addEventListener('click', () => {
      this.clearHistory();
    });

    // 设置相关事件
    this.saveSettingsBtn.addEventListener('click', () => {
      this.saveSettings();
    });

    this.resetSettingsBtn.addEventListener('click', () => {
      this.resetSettings();
    });

    this.themeSelect.addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        if (this.textInput.value.trim()) {
          this.analyzeText(this.textInput.value.trim());
        }
      }
    });
  }

  handleMessage(message) {
    switch (message.action) {
      case 'analysisStarted':
        this.showSelectedText(message.text);
        this.showLoading();
        break;

      case 'streamChunk':
        this.appendAnalysisContent(message.chunk);
        break;

      case 'analysisCompleted':
        this.hideLoading();
        this.showResultActions();
        break;

      case 'error':
        this.hideLoading();
        this.showError(message.error);
        break;
    }
  }

  async analyzeText(text) {
    if (this.isAnalyzing) return;

    const settings = await this.getSettings();
    const wordCount = text.split(/\s+/).length;

    // 验证文本长度
    if (wordCount < settings.minWords) {
      this.showError(`文本过短，至少需要 ${settings.minWords} 个单词`);
      return;
    }

    if (wordCount > settings.maxWords) {
      this.showError(`文本过长，最多支持 ${settings.maxWords} 个单词`);
      return;
    }

    this.currentText = text;
    this.isAnalyzing = true;
    this.analyzeBtn.disabled = true;

    // 通过 background script 开始分析
    chrome.runtime.sendMessage({
      action: 'analyzeText',
      text: text
    });
  }

  showSelectedText(text) {
    this.selectedText.textContent = text;
    this.selectedTextSection.style.display = 'block';
    this.updateWordCount(text);
    this.textInput.value = text;
  }

  updateWordCount(text) {
    const count = text.trim() ? text.trim().split(/\s+/).length : 0;
    this.wordCount.textContent = `${count} words`;
  }

  showLoading() {
    this.loadingOverlay.style.display = 'flex';
    this.progressFill.style.width = '0%';
    this.animateProgress();
    
    // 清空结果区域并显示加载状态
    this.typewriter.clear();
    this.resultContent.innerHTML = '<div class="loading-text">正在分析中...</div>';
    this.resultContent.classList.add('has-content');
  }

  hideLoading() {
    this.loadingOverlay.style.display = 'none';
    this.isAnalyzing = false;
    this.analyzeBtn.disabled = false;
  }

  animateProgress() {
    let progress = 0;
    const interval = setInterval(() => {
      if (!this.isAnalyzing) {
        clearInterval(interval);
        this.progressFill.style.width = '100%';
        return;
      }
      
      progress += Math.random() * 10;
      if (progress > 90) progress = 90;
      this.progressFill.style.width = `${progress}%`;
    }, 200);
  }

  appendAnalysisContent(chunk) {
    this.currentAnalysis += chunk;
    
    // 使用打字机效果添加内容
    this.typewriter.addToQueue(chunk);
  }

  showResultActions() {
    this.copyResultBtn.style.display = 'block';
    this.saveResultBtn.style.display = 'block';
  }

  showError(error) {
    this.resultContent.innerHTML = `
      <div class="error-state">
        <div class="error-icon">❌</div>
        <p>${error}</p>
      </div>
    `;
    this.resultContent.classList.add('has-content');
  }

  clearContent() {
    this.textInput.value = '';
    this.selectedTextSection.style.display = 'none';
    
    // 使用打字机清空
    this.typewriter.clear();
    this.resultContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <p>选择文本或输入内容开始分析</p>
      </div>
    `;
    this.resultContent.classList.remove('has-content');
    this.copyResultBtn.style.display = 'none';
    this.saveResultBtn.style.display = 'none';
    this.currentText = '';
    this.currentAnalysis = '';
  }

  async copyResult() {
    try {
      await navigator.clipboard.writeText(this.currentAnalysis);
      this.showToast('已复制到剪贴板');
    } catch (error) {
      this.showToast('复制失败', 'error');
    }
  }

  async saveToHistory() {
    if (!this.currentText || !this.currentAnalysis) return;

    const historyItem = {
      text: this.currentText,
      result: this.currentAnalysis,
      timestamp: Date.now()
    };

    chrome.runtime.sendMessage({
      action: 'saveToHistory',
      data: historyItem
    });

    this.showToast('已保存到历史记录');
    this.loadHistory();
  }

  toggleHistorySidebar() {
    this.historySidebar.classList.toggle('open');
    this.closeSettingsSidebar();
  }

  closeHistorySidebar() {
    this.historySidebar.classList.remove('open');
  }

  toggleSettingsSidebar() {
    this.settingsSidebar.classList.toggle('open');
    this.closeHistorySidebar();
  }

  closeSettingsSidebar() {
    this.settingsSidebar.classList.remove('open');
  }

  async loadHistory() {
    chrome.runtime.sendMessage({ action: 'getHistory' }, (history) => {
      this.renderHistory(history || []);
    });
  }

  renderHistory(history) {
    if (history.length === 0) {
      this.historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>暂无历史记录</p>
        </div>
      `;
      return;
    }

    this.historyList.innerHTML = history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-text">${item.text}</div>
        <div class="history-item-time">${this.formatTime(item.timestamp)}</div>
      </div>
    `).join('');

    // 绑定点击事件
    this.historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const historyItem = history.find(h => h.id === item.dataset.id);
        if (historyItem) {
          this.loadHistoryItem(historyItem);
        }
      });
    });
  }

  loadHistoryItem(item) {
    this.textInput.value = item.text;
    this.currentText = item.text;
    this.currentAnalysis = item.result || '';
    this.showSelectedText(item.text);
    
    // 使用打字机立即显示历史结果
    this.typewriter.showInstantly(this.currentAnalysis);
    this.resultContent.classList.add('has-content');
    this.showResultActions();
    this.closeHistorySidebar();
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString();
  }

  async clearHistory() {
    if (confirm('确定要清空所有历史记录吗？')) {
      chrome.runtime.sendMessage({ action: 'clearHistory' });
      this.loadHistory();
      this.showToast('历史记录已清空');
    }
  }

  async loadSettings() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
      if (settings) {
        this.apiUrlInput.value = settings.apiUrl || '';
        this.minWordsInput.value = settings.minWords || 5;
        this.maxWordsInput.value = settings.maxWords || 500;
        this.themeSelect.value = settings.theme || 'light';
        this.autoTriggerCheckbox.checked = settings.autoTrigger !== false;
        
        this.applyTheme(settings.theme || 'light');
      }
    });
  }

  async saveSettings() {
    const settings = {
      apiUrl: this.apiUrlInput.value,
      minWords: parseInt(this.minWordsInput.value),
      maxWords: parseInt(this.maxWordsInput.value),
      theme: this.themeSelect.value,
      autoTrigger: this.autoTriggerCheckbox.checked
    };

    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: settings
    });

    this.applyTheme(settings.theme);
    this.showToast('设置已保存');
  }

  resetSettings() {
    if (confirm('确定要重置所有设置吗？')) {
      this.apiUrlInput.value = '';
      this.minWordsInput.value = 5;
      this.maxWordsInput.value = 500;
      this.themeSelect.value = 'light';
      this.autoTriggerCheckbox.checked = true;
      
      this.saveSettings();
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, resolve);
    });
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: ${type === 'error' ? '#f56565' : '#48bb78'};
      color: white;
      border-radius: 6px;
      font-size: 14px;
      z-index: 1000;
      animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new GrammarParserApp();
});