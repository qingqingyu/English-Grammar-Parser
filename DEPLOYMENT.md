# 部署说明

## 快速测试（无需后端）
插件自带模拟分析功能，可以直接测试基本功能：

1. 安装插件后，在任意网页选中英文文本
2. 点击出现的蓝色分析按钮
3. Side Panel会打开并显示模拟的分析结果

## 完整部署（含AI功能）

### 方法一：使用Vercel（推荐）

```bash
# 1. 安装Node.js和npm（如果还没有）
# 下载：https://nodejs.org/

# 2. 安装Vercel CLI
npm install -g vercel

# 3. 在项目目录中登录Vercel
cd /Users/TWJ/工作/claude/chromeTrans
vercel login

# 4. 部署项目
vercel --prod

# 5. 设置OpenAI API密钥
vercel env add sk-485VmWEmFsgPrsFfkDlTgZhkwJxi7bdvMajKbKcy7T9HfXCb
# 输入你的OpenAI API密钥
```

### 方法二：本地测试服务器

```bash
# 在项目目录中
cd /Users/TWJ/工作/claude/chromeTrans

# 安装依赖
npm install

# 启动本地服务器
vercel dev
# 或者
npm run dev

# 服务器将在 http://localhost:3000 运行
```

### 配置插件使用你的API

1. 点击Chrome工具栏中的插件图标
2. 在Side Panel中点击右上角的⚙️设置按钮
3. 在"API服务器地址"中填入：
   - Vercel部署：`https://your-project.vercel.app`
   - 本地测试：`http://localhost:3000`
4. 点击"保存设置"

## 获取OpenAI API密钥

1. 访问：https://platform.openai.com/
2. 注册/登录账户
3. 点击"API Keys" → "Create new secret key"
4. 复制生成的API密钥（sk-开头）
5. 在Vercel中设置环境变量

## 测试插件功能

1. **文本选择测试**：
   - 访问任意英文网页（如BBC、CNN）
   - 选中5-500个英文单词
   - 看是否出现蓝色分析按钮

2. **手动输入测试**：
   - 点击插件图标打开Side Panel
   - 在输入框中输入英文句子
   - 点击"分析语法"按钮

3. **快捷键测试**：
   - 选中文本后按 Ctrl+Shift+G
   - 插件应该自动开始分析