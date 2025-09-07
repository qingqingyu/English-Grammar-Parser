# Chrome英文语法解析插件 V2.0 - 部署指南

基于新PRD重新设计的Chrome插件，采用无服务器架构 + EventSource流模式。

## 🚀 项目特性

### 核心功能
- **智能文本选择**: 5-500词自动检测，英文文本识别
- **Side Panel界面**: 现代化侧边栏设计，支持浅色/深色主题
- **流式AI分析**: EventSource实时流式响应，打字机效果展示
- **历史记录管理**: 本地存储最近10条分析记录
- **快捷键支持**: Ctrl+Shift+G快速分析
- **无服务器后端**: Vercel Functions零维护部署

### 技术亮点
- **Manifest V3**: 最新Chrome扩展规范
- **EventSource/SSE**: 服务器推送事件流式传输
- **TypeScript模块化**: ES6模块化架构
- **响应式设计**: 支持多种屏幕尺寸
- **AI Prompt优化**: 专业语法分析模板

## 📁 项目结构

```
chromeTrans/
├── manifest.json                # Chrome扩展配置
├── src/                        # 源代码目录
│   ├── background.js           # Service Worker后台脚本
│   ├── content.js              # 内容脚本
│   ├── content.css            # 内容脚本样式
│   ├── sidepanel.html         # Side Panel界面
│   ├── sidepanel.js           # Side Panel逻辑
│   ├── sidepanel.css          # Side Panel样式
│   └── utils/
│       └── typewriter.js       # 打字机效果工具类
├── api/                       # Vercel无服务器函数
│   └── analyze.js             # 语法分析API
├── vercel.json                # Vercel部署配置
├── package.json               # 项目依赖配置
└── README.md                  # 项目文档
```

## 🛠️ 安装部署

### 1. 部署后端API

#### Vercel部署（推荐）

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd chromeTrans

# 2. 安装Vercel CLI
npm install -g vercel

# 3. 登录Vercel
vercel login

# 4. 部署到Vercel
vercel --prod

# 5. 设置环境变量
vercel env add OPENAI_API_KEY
# 输入你的OpenAI API密钥
```

#### 本地开发测试

```bash
# 安装依赖
npm install

# 本地开发服务器
vercel dev

# 访问 http://localhost:3000/api/analyze 测试
```

### 2. 安装Chrome插件

1. 打开Chrome浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目根目录（包含manifest.json的文件夹）
5. 插件安装完成，会出现在浏览器工具栏

### 3. 配置插件

1. 点击插件图标打开Side Panel
2. 点击右上角设置按钮⚙️
3. 在"API服务器地址"中填入你的Vercel部署地址
   - 格式：`https://your-app.vercel.app`
4. 保存设置

## 🎯 使用方法

### 方式一：文本选择分析
1. 在任意网页上选中5-500个英文单词
2. 出现蓝色分析按钮，显示词数统计
3. 点击按钮开始分析
4. Side Panel自动打开，流式显示分析结果

### 方式二：手动输入分析
1. 点击插件图标打开Side Panel
2. 在文本输入框中输入英文内容
3. 点击"🔍 分析语法"按钮
4. 观看打字机效果的流式分析展示

### 方式三：快捷键分析
1. 选中文本后按 `Ctrl+Shift+G` (Mac: `Cmd+Shift+G`)
2. 自动开始分析选中内容

## 📊 功能详解

### AI语法分析格式
根据PRD要求，分析结果包含：

1. **句子结构**: 原句展示
2. **语法结构**: 详细的语法解释
3. **高级词汇**: B1以上级别词汇标注
4. **整体理解**: 句子含义解释
5. **知识要点**: 专业术语、文化典故、历史背景等

### 历史记录功能
- 自动保存最近10条分析记录
- 支持点击历史记录快速重新查看
- 一键清空所有历史记录
- 本地存储，保护隐私

### 设置选项
- **API服务器地址**: 自定义后端API地址
- **文本长度限制**: 可调整5-500词范围
- **界面主题**: 浅色/深色/跟随系统
- **自动触发**: 控制是否自动显示分析按钮

## 🔧 开发说明

### 技术栈
- **前端**: Vanilla JavaScript (ES6 Modules)
- **后端**: Node.js + Vercel Functions
- **AI服务**: OpenAI GPT-3.5-turbo
- **流式传输**: Server-Sent Events (EventSource)
- **存储**: Chrome Storage API

### 关键特性

#### EventSource流式传输
```javascript
const eventSource = new EventSource(`${apiUrl}/api/analyze?text=${text}`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.done) {
    eventSource.close();
  } else {
    this.typewriter.addToQueue(data.content);
  }
};
```

#### 打字机效果实现
```javascript
class TypewriterRenderer {
  async typeContent(content) {
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      this.currentContent += char;
      this.renderMarkdown(this.currentContent);
      await this.sleep(this.options.speed);
    }
  }
}
```

#### Side Panel API使用
```javascript
// manifest.json
{
  "side_panel": {
    "default_path": "src/sidepanel.html"
  }
}

// background.js
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({tabId: tab.id});
});
```

### 调试方法
1. **Content Script调试**: F12开发者工具 → Console
2. **Background Script调试**: chrome://extensions → 插件详情 → 检查视图
3. **Side Panel调试**: 右键Side Panel → 检查
4. **API调试**: Vercel Dashboard → Functions → Logs

## 🚨 故障排除

### 常见问题

1. **插件无法加载**
   - 确保manifest.json格式正确
   - 检查文件路径是否正确
   - 确认已开启开发者模式

2. **API连接失败**
   - 检查Vercel部署是否成功
   - 确认API地址配置正确
   - 查看浏览器网络请求是否有错误

3. **分析结果不显示**
   - 检查OpenAI API密钥是否有效
   - 确认网络连接正常
   - 可先使用测试端点验证连接

4. **Side Panel不显示**
   - 确保Chrome版本支持Side Panel API (114+)
   - 检查manifest.json中的sidePanel配置
   - 重新加载插件

5. **打字机效果异常**
   - 检查TypewriterRenderer是否正确初始化
   - 确认EventSource连接正常
   - 查看控制台是否有JavaScript错误

### 性能优化建议

1. **内存管理**
   - 及时关闭EventSource连接
   - 定期清理历史记录
   - 避免重复创建DOM元素

2. **网络优化**
   - 使用CDN加速API访问
   - 实现请求去重机制
   - 添加重试机制

3. **用户体验**
   - 调整打字机速度适应用户偏好
   - 添加加载进度指示
   - 支持取消分析操作

## 📈 版本更新

### V2.0 更新内容
- ✅ 重构为Manifest V3架构
- ✅ 新增Side Panel界面
- ✅ 实现EventSource流式传输
- ✅ 优化打字机效果和Markdown渲染
- ✅ 集成新的AI Prompt模板
- ✅ 完善历史记录和设置功能
- ✅ 部署到Vercel无服务器平台

### 未来计划
- 🔄 支持更多AI模型选择
- 🔄 添加语音朗读功能
- 🔄 实现批量文本分析
- 🔄 支持自定义分析模板
- 🔄 添加学习进度跟踪

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支: `git checkout -b feature/AmazingFeature`
3. 提交更改: `git commit -m 'Add some AmazingFeature'`
4. 推送到分支: `git push origin feature/AmazingFeature`
5. 提交Pull Request

---

**注意**: 使用本插件需要OpenAI API密钥。请确保遵守OpenAI的使用条款和API限制。