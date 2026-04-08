# 新闻内容标签化前端页面

这是一个简单的前端页面，用于调用 MICA 项目的新闻标签化 API。

## 功能特性

- ✨ 简洁的双栏布局（输入区 + 结果区）
- 🏷️ 调用 `/api/news/tag` 接口自动提取标签
- 📊 实时显示统计信息（总标签数、相关/不相关标签）
- 🎯 可视化置信度进度条
- 💡 显示 LLM 推理过程
- 📱 响应式设计，支持移动端

## 使用说明

### 1. 确认后端服务

确认后端服务正在运行在 `172.29.177.42:9092`：

```bash
# 在服务器上启动服务
cd D:\work\内容标签\内容标签代码迁移
.venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 9092
```

### 2. 打开前端页面

直接在浏览器中打开：

```
D:\work\内容标签\tag-frontend\index.html
```

### 3. 调用接口

1. 在左侧输入新闻标题和正文
2. 点击"开始标签化"按钮
3. 右侧会显示提取的标签结果，包括：
   - 标签名称
   - 标签类型
   - 匹配方式（regexp/vecsim/llm）
   - 置信度（0-100%）
   - 相关性（相关/不相关）
   - LLM 推理过程

## API 信息

- **端点**：`POST /api/news/tag`
- **请求格式**：JSON
  ```json
  {
    "title": "新闻标题",
    "content": "新闻正文内容"
  }
  ```
- **响应格式**：
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": [
      {
        "tag_name": "标签名称",
        "tag_type": "标签类型",
        "tag_matcher": "匹配方式",
        "related": true,
        "confidence": 0.95,
        "thinking_process": "推理过程..."
      }
    ]
  }
  ```

## 标签流程说明

后端使用三阶段流水线进行标签提取：

1. **RegexpTagger**：基于 FlashText 的关键词精确匹配
2. **VecSimTagger**：基于向量相似度的候选标签召回
3. **LLMTagger**：使用大语言模型判断标签与新闻的相关性

## 自定义配置

如需修改 API 地址，编辑 `index.html` 第 384 行的 `API_BASE_URL` 变量：

```javascript
const API_BASE_URL = 'http://172.29.177.42:9092';  // 修改为实际地址
```

## 浏览器兼容性

- Chrome ✅
- Firefox ✅
- Safari ✅
- Edge ✅

无需任何外部依赖，纯前端实现，即开即用。
