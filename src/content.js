// src/content.js - 内容脚本 V2.0
let currentSelection = '';
let selectionTimeout = null;
let analysisIndicator = null;

// 文本选择监听器
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', handleTextSelection);

// 监听文本选择事件
function handleTextSelection(e) {
  // 清除之前的超时
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }
  
  // 延迟处理，避免频繁触发
  selectionTimeout = setTimeout(() => {
    processTextSelection();
  }, 300);
}

function processTextSelection() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  // 移除现有的指示器
  removeAnalysisIndicator();
  
  if (!selectedText) {
    currentSelection = '';
    return;
  }
  
  // 检查文本长度
  const wordCount = selectedText.split(/\s+/).length;
  
  if (wordCount < 5) {
    showAnalysisHint('文本过短，至少需要5个单词', 'warning');
    return;
  }
  
  if (wordCount > 500) {
    showAnalysisHint('文本过长，最多支持500个单词', 'warning');
    return;
  }
  
  // 检查是否为英文文本
  if (!isEnglishText(selectedText)) {
    showAnalysisHint('请选择英文文本进行分析', 'info');
    return;
  }
  
  currentSelection = selectedText;
  showAnalysisButton(selection);
}

// 检查是否为英文文本
function isEnglishText(text) {
  // 简单的英文检测：至少80%的字符是英文字母、空格或标点
  const englishChars = text.match(/[a-zA-Z\s.,!?;:"'()\-]/g) || [];
  const ratio = englishChars.length / text.length;
  return ratio >= 0.8;
}

// 显示分析按钮
function showAnalysisButton(selection) {
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // 创建分析按钮
  analysisIndicator = document.createElement('div');
  analysisIndicator.id = 'grammar-analysis-btn';
  analysisIndicator.className = 'grammar-analysis-btn';
  analysisIndicator.innerHTML = `
    <div class="btn-content">
      <span class="btn-icon">🔍</span>
      <span class="btn-text">分析语法</span>
      <span class="word-count">${currentSelection.split(/\s+/).length}词</span>
    </div>
    <div class="btn-hint">点击分析，结果在侧边栏显示</div>
  `;
  
  // 定位按钮
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;
  
  analysisIndicator.style.cssText = `
    position: absolute;
    left: ${rect.left + scrollX}px;
    top: ${rect.top + scrollY - 70}px;
    z-index: 10000;
  `;
  
  // 点击事件
  analysisIndicator.addEventListener('click', () => {
    analyzeCurrentSelection();
    removeAnalysisIndicator();
  });
  
  document.body.appendChild(analysisIndicator);
  
  // 3秒后自动隐藏
  setTimeout(removeAnalysisIndicator, 3000);
}

// 显示分析提示
function showAnalysisHint(message, type = 'info') {
  const hint = document.createElement('div');
  hint.className = `grammar-hint grammar-hint-${type}`;
  hint.textContent = message;
  
  hint.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10001;
    max-width: 300px;
  `;
  
  document.body.appendChild(hint);
  
  // 2秒后自动移除
  setTimeout(() => {
    if (hint.parentNode) {
      hint.parentNode.removeChild(hint);
    }
  }, 2000);
}

// 移除分析指示器
function removeAnalysisIndicator() {
  if (analysisIndicator && analysisIndicator.parentNode) {
    analysisIndicator.parentNode.removeChild(analysisIndicator);
    analysisIndicator = null;
  }
}

// 分析当前选中的文本
function analyzeCurrentSelection() {
  if (!currentSelection) return;
  
  // 发送到 background script，不要求自动打开Side Panel
  chrome.runtime.sendMessage({
    action: 'analyzeText',
    text: currentSelection
  });
  
  // 显示提示，让用户知道要打开Side Panel查看结果
  showAnalysisHint('正在分析中... 请点击插件图标查看结果', 'info');
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getSelectedText':
      sendResponse({ text: currentSelection });
      break;
      
    case 'analysisStarted':
      showAnalysisProgress('开始分析...');
      break;
      
    case 'streamChunk':
      // 流式内容会在 Side Panel 中显示
      break;
      
    case 'analysisCompleted':
      hideAnalysisProgress();
      break;
      
    case 'error':
      showAnalysisHint(request.error, 'error');
      hideAnalysisProgress();
      break;
  }
});

// 显示分析进度
function showAnalysisProgress(message) {
  let progressIndicator = document.getElementById('grammar-progress');
  
  if (!progressIndicator) {
    progressIndicator = document.createElement('div');
    progressIndicator.id = 'grammar-progress';
    progressIndicator.className = 'grammar-progress';
    
    progressIndicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10002;
    `;
    
    document.body.appendChild(progressIndicator);
  }
  
  progressIndicator.innerHTML = `
    <div class="progress-content">
      <div class="spinner"></div>
      <div class="progress-text">${message}</div>
    </div>
  `;
}

// 隐藏分析进度
function hideAnalysisProgress() {
  const progressIndicator = document.getElementById('grammar-progress');
  if (progressIndicator && progressIndicator.parentNode) {
    progressIndicator.parentNode.removeChild(progressIndicator);
  }
}

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  removeAnalysisIndicator();
  hideAnalysisProgress();
});