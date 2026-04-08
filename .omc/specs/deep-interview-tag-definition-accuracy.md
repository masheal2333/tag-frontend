# Deep Interview Spec: 标签定义准确度提升工具

## Metadata
- Interview ID: tag-frontend-improvement-001
- Rounds: 6
- Final Ambiguity Score: 15%
- Type: brownfield
- Generated: 2026-04-07
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.9 | 0.35 | 0.315 |
| Constraint Clarity | 0.75 | 0.25 | 0.1875 |
| Success Criteria | 0.85 | 0.25 | 0.2125 |
| Context Clarity | 0.85 | 0.15 | 0.1275 |
| **Total Clarity** | | | **0.8425** |
| **Ambiguity** | | | **15.7%** |

## Goal
在现有的新闻标签化系统（index.html 双布局 + 3个新增API接口）基础上，新增4个功能来辅助用户更精准地定义和优化标签，形成"打标 -> 分析问题 -> 修改定义 -> 验证效果 -> 记录历史"的完整闭环。

## Constraints
- 前后端同时实现（项目位于 D:\work\内容标签\tag-frontend 和 D:\work\内容标签\内容标签代码迁移）
- 纯前端项目 index.html（无需构建工具）
- 后端 FastAPI（Python，位于 内容标签代码迁移 目录）
- 版本历史使用 LocalStorage 存储，无需后端
- AI 定义建议生成需要后端调用 LLM

## Non-Goals
- 不需要后端存储版本历史（LocalStorage 足够）
- 不需要离线支持
- 不需要移动端适配
- 不需要标签别名管理（已确认为后续方向）

## Acceptance Criteria
- [ ] LLM推理高亮：推理文本中命中定义关键词的片段以黄色高亮显示，hover 显示对应定义原文
- [ ] 版本历史对比：显示每次修改的时间、新旧内容 diff 对比，支持一键回滚到历史版本
- [ ] AI定义建议生成：点击按钮后 3-5 秒返回优化建议，用户可预览并选择采纳或拒绝
- [ ] 批量验证定义：能选择 2 条以上新闻对同一标签定义重测，显示每篇的相关性判断结果和统计摘要
- [ ] 用户至少完成一次端到端的标签定义优化迭代测试

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 需要后端存储版本历史 | "如果版本历史存本地，换设备会丢" | 确认使用 LocalStorage，纯前端即可，暂不考虑跨设备 |
| 四个方向哪个最重要 | "用户说都还不错" | 用户确认选择 E（AI建议）+ 之前的3个方向，共4个都做 |
| 前后端是同时改还是分步 | "纯前端先做更简单" | 用户确认前后端同时做，一次交付 |
| 完成标准是什么 | "功能跑通 vs 端到端测试" | 两者都需要：功能完整 + 端到端验证 |

## Technical Context

### 现有代码结构
- `D:\work\内容标签\tag-frontend\index.html` — 1231 行，纯 HTML/CSS/JS
- `D:\work\内容标签\内容标签代码迁移\app\api\endpoints\news.py` — 后端新闻 API
- `D:\work\内容标签\内容标签代码迁移\app\algo\tag\taggers\llm_tagger.py` — LLM 标签器

### 已有接口
- `POST /api/news/tag` — 全量打标
- `POST /api/news/tag/single` — 单标签重测
- `POST /api/news/tag/selective` — 部分打标
- `PUT /api/news/tags/definition` — 批量更新标签定义

### 需要新增的后端接口
1. `POST /api/news/tag/suggest-definition` — LLM 自动生成标签定义优化建议
   - 输入：`{tag_name, current_desc_zh, news_title, news_content}`
   - 输出：`{suggested_desc_zh, reasoning}`

### LocalStorage 数据结构
```json
{
  "tag_definition_history": {
    "客户": [
      {
        "version": 1,
        "definition": "存在运输需求的生产或销售企业...",
        "modified_at": "2026-04-07T10:30:00Z",
        "triggered_by": "用户手动修改"
      }
    ]
  }
}
```

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| BatchVerification | core domain | news_items[], tag_name, new_definition, results[] | belongs to Tag |
| HighlightAnalysis | supporting | thinking_process_text, definition_keywords, highlights[] | derived from TagRelevance |
| DefinitionVersion | core domain | tag_name, definition_html, timestamp, source | belongs to Tag, has many versions |
| AIDefinitionSuggestion | supporting | suggested_definition, reasoning, status | generated for Tag |

## Interview Transcript
<details>
<summary>Full Q&A (6 rounds)</summary>

### Round 1
**Q:** 你最想从哪个方向提升前端页面？
**A:** 为了满足"提升标签定义准确度"这一需求，还有哪些方面可以提升的
**Ambiguity:** 85% (Goal: 0.6, Constraints: 0.3, Criteria: 0.2, Context: 0.7)

### Round 2
**Q:** 你希望先做哪个方向来提升标签定义准确度？
**A:** 这三个方向都是不错的，还有什么其他要补充的吗
**Ambiguity:** 66% (Goal: 0.7, Constraints: 0.4, Criteria: 0.3, Context: 0.75)

### Round 3
**Q:** 我补充了三个新方向。现在总共6个方向（A/B/C/D/E/F），其中哪几个是你最想做的前3个？请排个优先级。
**A:** 新增的方向E是不错的，再加上之前的三个方向，你把四个方向都列一下
**Ambiguity:** 52% (Goal: 0.8, Constraints: 0.55, Criteria: 0.35, Context: 0.75)

### Round 4
**Q:** 四个功能中有三个需要后端配合，你想怎么推进？
**A:** 前后端同时做
**Ambiguity:** 38% (Goal: 0.85, Constraints: 0.65, Criteria: 0.4, Context: 0.8)

### Round 5
**Q:** 版本历史记录的数据存储在哪里？这决定了后端的工作量和功能的可用性。
**A:** LocalStorage（纯前端）
**Ambiguity:** 28% (Goal: 0.9, Constraints: 0.75, Criteria: 0.5, Context: 0.85)

### Round 6
**Q:** 怎么判断这四个功能实现成功了？你觉得哪个标准最准确？
**A:** 两者都需要（功能完整运行 + 端到端测试）
**Ambiguity:** 15% (Goal: 0.9, Constraints: 0.75, Criteria: 0.85, Context: 0.85)
</details>
