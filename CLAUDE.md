# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个纯前端新闻内容标签化页面，调用 MICA 项目的 `/api/news/tag` 接口自动提取新闻标签。无需构建工具，即开即用。

## 项目结构

```
tag-frontend/
├── index.html          # 主页面：双栏布局（输入区 + 结果区），内嵌所有 CSS 和 JS
├── test_frontend.html  # 测试页面：用于 API 连接和标签接口的独立测试
├── sample_data.json    # 测试用的示例新闻数据（3条）
└── README.md           # 项目说明文档
```

## 开发方式

- **运行**：直接在浏览器中打开 `index.html`
- **测试**：直接在浏览器中打开 `test_frontend.html`
- **无需构建**：无任何 npm/yarn 依赖，无编译步骤

## API 接口

- **端点**：`POST /api/news/tag`
- **当前地址**：`http://172.29.177.42:9092`（在 `index.html` 第 384 行 `API_BASE_URL` 变量中配置）

**请求体**：
```json
{
  "title": "新闻标题",
  "content": "新闻正文内容"
}
```

**响应体**：
```json
{
  "code": 200,
  "msg": "success",
  "data": [{
    "tag_name": "标签名称",
    "tag_type": "标签类型",
    "tag_matcher": "匹配方式（regexp/vecsim/llm）",
    "related": true,
    "confidence": 0.95,
    "thinking_process": "LLM推理过程"
  }]
}
```

## 后端服务

后端服务位于 `D:\work\内容标签\内容标签代码迁移`，启动方式：

```bash
cd D:\work\内容标签\内容标签代码迁移
.venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 9092
```

后端使用三阶段流水线：RegexpTagger（FlashText 关键词匹配）→ VecSimTagger（向量相似度）→ LLMTagger（LLM 相关性判定）。

## 注意事项

- 所有 CSS 和 JavaScript 都内嵌在 `index.html` 中，修改时注意不要破坏 HTML 结构
- `test_frontend.html` 有自己的独立 API 地址常量 `API_BASE`（第 86 行），修改时需要同步更新
- 项目使用中文注释和 UI 文本
