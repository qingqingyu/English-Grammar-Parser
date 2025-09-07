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

## 🚨 错误分析

你的 `vercel.json` 文件中存在两个问题：

### 1. **冲突的配置属性**
```json:4:9:vercel.json
"builds": [
  {
    "src": "api/**/*.js",
    "use": "@vercel/node"
  }
],
```

```json:19:23:vercel.json
"functions": {
  "api/**/*.js": {
    "maxDuration": 30
  }
}
```

**`builds` 和 `functions` 不能同时存在！** 现在Vercel推荐使用 `functions` 而不是旧的 `builds`。

### 2. **弃用的属性**
```json:3:3:vercel.json
"name": "grammar-parser-api",
```
`name` 属性已被弃用。

## 🔧 解决方案

请将你的 `vercel.json` 文件内容替换为以下**修正版本**：

```json
<code_block_to_apply_changes_from>
```

## 📝 修改步骤

1. **编辑vercel.json文件**：
```bash
# 用你喜欢的编辑器打开
nano vercel.json
# 或者
code vercel.json
```

2. **替换整个文件内容** 为上面提供的修正版本

3. **保存文件**

4. **重新部署**：
```bash
vercel --prod
```

## 🔍 主要变更说明

| 变更类型 | 原配置 | 新配置 | 说明 |
|---------|-------|-------|------|
| **移除** | `name: "grammar-parser-api"` | ❌ 删除 | 已弃用属性 |
| **移除** | `builds: [...]` | ❌ 删除 | 与functions冲突 |
| **保留** | `functions: {...}` | ✅ 保留并增强 | 现代化配置 |
| **增强** | `maxDuration: 30` | `runtime + maxDuration` | 明确指定运行时 |

## ✅ 修正后的配置解释

```json
{
  "version": 2,                          // Vercel配置版本
  "routes": [                           // 路由配置
    {
      "src": "/api/(.*)",              // 匹配所有/api/*请求
      "dest": "/api/$1"                // 转发到对应的API函数
    }
  ],
  "env": {                             // 环境变量
    "OPENAI_API_KEY": "@openai-api-key"
  },
  "functions": {                       // 函数配置（现代化方式）
    "api/**/*.js": {
      "runtime": "@vercel/node",       // 指定Node.js运行时
      "maxDuration": 30                // 最大执行时间30秒
    }
  }
}
```

## 🚀 重新部署

修正配置文件后，重新执行：

```bash
vercel --prod
```

这次应该能成功部署了！部署成功后你会看到类似这样的输出：

```bash
✅ Production: https://your-app-name.vercel.app [copied to clipboard]
📝 Deployed to production. Run `vercel --prod` to overwrite later.
💡 To change the domain or build command, go to https://vercel.com/your-project
```

这样你的API就能正常工作了！🎉