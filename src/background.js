// src/background.js - Service Worker for Chrome Extension V3

// 安装事件处理
chrome.runtime.onInstalled.addListener(() => {
  // 创建右键菜单
  chrome.contextMenus.create({
    id: "analyzeGrammar",
    title: "分析选中文本的语法",
    contexts: ["selection"]
  });
  
  // 初始化默认设置
  initializeDefaults();
});

// 快捷键命令处理
chrome.commands.onCommand.addListener((command) => {
  if (command === "analyze-grammar") {
    handleAnalyzeCommand();
  }
});

// 右键菜单点击处理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "analyzeGrammar" && info.selectionText) {
    // 右键菜单点击是用户手势，可以打开Side Panel
    analyzeText(info.selectionText, tab.id, true);
  }
});

// 扩展图标点击处理 - 打开 Side Panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({tabId: tab.id});
});

// 处理快捷键命令
async function handleAnalyzeCommand() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  
  // 获取选中的文本
  chrome.tabs.sendMessage(tab.id, {action: 'getSelectedText'}, (response) => {
    if (response && response.text) {
      // 快捷键是用户手势，可以打开Side Panel
      analyzeText(response.text, tab.id, true);
    } else {
      // 如果没有选中文本，打开 Side Panel
      chrome.sidePanel.open({tabId: tab.id});
    }
  });
}

// 消息监听处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'analyzeText':
      analyzeText(request.text, sender.tab?.id);
      break;
      
    case 'getHistory':
      getHistory().then(sendResponse);
      return true;
      
    case 'saveToHistory':
      saveToHistory(request.data).then(sendResponse);
      return true;
      
    case 'getSettings':
      getSettings().then(sendResponse);
      return true;
      
    case 'updateSettings':
      updateSettings(request.settings).then(sendResponse);
      return true;
      
    case 'clearHistory':
      clearHistory().then(sendResponse);
      return true;
  }
});

// 分析文本的核心功能
async function analyzeText(text, tabId, openSidePanel = false) {
  try {
    // 验证文本长度
    const settings = await getSettings();
    const wordCount = text.trim().split(/\s+/).length;
    
    if (wordCount < settings.minWords) {
      broadcastMessage({
        action: 'error',
        error: `文本过短，至少需要 ${settings.minWords} 个单词`
      });
      return;
    }
    
    if (wordCount > settings.maxWords) {
      broadcastMessage({
        action: 'error',
        error: `文本过长，最多支持 ${settings.maxWords} 个单词`
      });
      return;
    }
    
    // 只有在直接用户操作时才打开 Side Panel
    if (openSidePanel && tabId) {
      try {
        await chrome.sidePanel.open({tabId});
      } catch (error) {
        console.log('无法自动打开Side Panel，将通过其他方式通知用户');
      }
    }
    
    // 开始分析
    broadcastMessage({
      action: 'analysisStarted',
      text: text
    });
    
    // 使用 EventSource 进行流式分析
    await analyzeWithEventSource(text);
    
    // 分析完成，保存到历史记录
    await saveToHistory({
      text: text,
      timestamp: Date.now()
    });
    
    broadcastMessage({
      action: 'analysisCompleted'
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    broadcastMessage({
      action: 'error',
      error: error.message
    });
  }
}

// EventSource 流式分析
async function analyzeWithEventSource(text) {
  const settings = await getSettings();
  const apiUrl = settings.apiUrl || 'https://english-grammar-parser-8axd5r8h7-alices-projects-4e45fc0f.vercel.app';
  
  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(`${apiUrl}/api/analyze?text=${encodeURIComponent(text)}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.done) {
          eventSource.close();
          resolve();
        } else {
          broadcastMessage({
            action: 'streamChunk',
            chunk: data.content
          });
        }
      } catch (error) {
        broadcastMessage({
          action: 'streamChunk',
          chunk: event.data
        });
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
      reject(new Error('连接服务器失败'));
    };
    
    // 设置超时
    setTimeout(() => {
      eventSource.close();
      reject(new Error('分析超时'));
    }, 30000);
  });
}

// 广播消息到所有监听的页面
function broadcastMessage(message) {
  // 发送到 Side Panel
  chrome.runtime.sendMessage(message).catch(() => {
    // Side Panel 可能未打开，忽略错误
  });
  
  // 发送到当前活动标签页的 content script
  chrome.tabs.query({active: true, currentWindow: true}).then(([tab]) => {
    if (tab) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Content script 可能未加载，忽略错误
      });
    }
  });
}

// 存储管理函数
async function initializeDefaults() {
  const defaultSettings = {
    theme: "light",
    autoTrigger: true,
    minWords: 5,
    maxWords: 500,
    shortcutKey: "Ctrl+Shift+G",
    apiUrl: "https://english-grammar-parser-8axd5r8h7-alices-projects-4e45fc0f.vercel.app"
  };
  
  const result = await chrome.storage.sync.get(['settings']);
  if (!result.settings) {
    await chrome.storage.sync.set({ settings: defaultSettings });
  }
}

async function getSettings() {
  const result = await chrome.storage.sync.get(['settings']);
  return result.settings || {};
}

async function updateSettings(newSettings) {
  const currentSettings = await getSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  await chrome.storage.sync.set({ settings: updatedSettings });
  return updatedSettings;
}

async function getHistory() {
  const result = await chrome.storage.sync.get(['history']);
  return result.history || [];
}

async function saveToHistory(item) {
  const history = await getHistory();
  const newItem = {
    id: Date.now().toString(),
    ...item
  };
  
  history.unshift(newItem);
  
  // 只保留最近10条记录
  if (history.length > 10) {
    history.splice(10);
  }
  
  await chrome.storage.sync.set({ history });
  return newItem;
}

async function clearHistory() {
  await chrome.storage.sync.set({ history: [] });
}