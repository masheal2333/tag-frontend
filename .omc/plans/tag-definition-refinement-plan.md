# Plan: 标签定义迭代优化工作流

## Requirements Summary

在当前新闻标签系统基础上，新增"改定义→单独重测→确认→持久化"闭环工作流。用户完成全量打标后，可逐一对不合理标签修改 `tag_desc_zh`，调用单标签 LLM 重测接口，反复迭代直到满意，最后确认的定义持久化到后端的 intermediate JSON 文件中。

## RALPLAN-DR Summary

### Principles
1. **最小侵入**：不改变现有全量打标流程，新增独立接口和 UI 模块
2. **数据安全性**：标签定义文件（intermediate JSON）是核心资产，持久化必须备份+原子写入
3. **用户可见反馈**：每次重测结果、确认状态、持久化结果必须有明确 UI 反馈

### Decision Drivers
1. **后端速度**：全量 /tag 包含 vecsim 向量化（需下载模型+计算 embedding）+ LLM 全量 batch，耗时 30+ 秒
2. **前端零框架**：index.html 是纯 HTML/CSS/JS，所有新功能必须内联实现
3. **LLMTagger 已有单标签能力**：`judge_tag_relevance(news_item, tag_name, tag_desc)` 方法已存在，可直接复用

### Viable Options

#### Option A: 后端新增两个独立接口（Recommended）
- `POST /api/news/tag/single` — 单标签重测，调用 `LLMTagger.judge_tag_relevance()`
- `PUT /api/tags/definition` — 更新标签定义文件
- **Pros**: 前后端解耦；前端可直接完成全流程；LLM 已有单标签方法
- **Cons**: 需修改后端 news.py

#### Option B: 扩展现有 /tag 接口，新增可选 tag_name 参数
- **Pros**: 少一个 endpoint
- **Cons**: 污染现有接口职责；返回格式不一致（单标签 vs 全量）

**Invalidation rationale**: Option B 会导致同一接口有两种不同语义和返回格式，违反单一职责原则。

## Architecture Analysis

### Why full /tag is slow
1. `TagBaseLoader.load_tags()` 加载 3 个 intermediate JSON 文件的全部标签（约 80+ 个）
2. VecSim 阶段需要加载 sentence-transformers 模型并编码新闻
3. LLM batch 阶段对所有候选标签做 batch 判断
4. 最终还有 tags_judger 和 final_tag_llm_judger

### Single-tag retest design
- Skip regexp + vecsim stages entirely
- Directly call `LLMTagger.judge_tag_relevance(news_item, tag_name, tag_desc_zh)`
- Only the LLM API call is the bottleneck (~2-5 seconds vs 30+ seconds for full pipeline)
- Must allow overriding `tag_desc_zh` (user-modified definition)

### Tag definition file structure
Three files under `app/algo/tag/data/intermediate/`:
- `intermediate_objects.json` — `{tag_name, tag_desc_zh}` (simple)
- `intermediate_entity.json` — `{tag_source, tag_name, tag_type, tag_desc_zh, tag_desc_en, tag_embedding_zh}`
- `intermediate_custom.json` — same as entity

All share `tag_name` and `tag_desc_zh`. The update endpoint needs to find which file contains the tag, then update `tag_desc_zh` in-place.

## Implementation Steps

### Step 1: 后端 — 新增单标签重测接口
**File**: `D:\work\内容标签\内容标签代码迁移\app\api\endpoints\news.py`

New model:
```python
class SingleTagRequest(BaseModel):
    title: str
    content: str
    tag_name: str
    tag_desc_zh: Optional[str] = None  # 用户修改后的定义，None 时使用原始定义
```

New endpoint at `news.py`:
```python
@router.post("/tag/single")
async def tag_news_single(request: SingleTagRequest) -> CommonResponse[Dict[str, Any]]:
    news_item = NewsItem(title=request.title, content=request.content)
    llm_tagger = LLMTagger()
    # Find tag_desc_zh if not provided
    tag_desc = request.tag_desc_zh
    if tag_desc is None:
        tag_desc = self._find_tag_desc(tag_name)  # helper
    result = await llm_tagger.judge_tag_relevance(news_item, request.tag_name, tag_desc)
    return CommonResponse(data=result)
```

New helper function for finding tag definition:
```python
def _find_tag_desc(tag_name: str) -> Optional[str]:
    from app.algo.tag.pipeline.tagbase_manager import TagBaseLoader
    loader = TagBaseLoader()
    tags = loader.load_tags()
    for tag in tags:
        if tag.get("tag_name") == tag_name:
            return tag.get("tag_desc_zh")
    return None
```

### Step 2: 后端 — 新增标签定义更新接口
**File**: `D:\work\内容标签\内容标签代码迁移\app\api\endpoints\news.py`

```python
class UpdateTagDefinitionRequest(BaseModel):
    tag_name: str
    tag_desc_zh: str

@router.put("/tags/definition")
async def update_tag_definition(requests: List[UpdateTagDefinitionRequest]) -> CommonResponse[Dict[str, Any]]:
    intermediate_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "algo", "tag", "data", "intermediate")
    files = [
        os.path.join(intermediate_dir, "intermediate_objects.json"),
        os.path.join(intermediate_dir, "intermediate_entity.json"),
        os.path.join(intermediate_dir, "intermediate_custom.json"),
    ]
    updated_count = 0
    # Backup first
    for f in files:
        shutil.copy2(f, f + ".bak")
    # Update
    for req in requests:
        updated = False
        for filepath in files:
            with open(filepath, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            for tag in data:
                if tag.get("tag_name") == req.tag_name:
                    tag["tag_desc_zh"] = req.tag_desc_zh
                    with open(filepath, "w", encoding="utf-8") as fh:
                        json.dump(data, fh, ensure_ascii=False, indent=2)
                    updated_count += 1
                    updated = True
                    break
            if updated:
                break
    return CommonResponse(data={"success": True, "updated": updated_count})
```

### Step 3: 后端 — 修复现有 /tag 返回 tag_desc_zh
**File**: `D:\work\内容标签\内容标签代码迁移\app\algo\tag\pipeline\tagger_pipeline.py`

The pipeline `run_pipeline()` returns `final_results` which already includes fields from LLM results. The LLM batch method `recall_candidate_tags_batch` already includes `tag_desc_zh` in the result (line 359). Need to verify this field is preserved through the final dedup and standardize steps.

### Step 4: 前端 — 修改标签结果展示，新增标签定义显示
**File**: `D:\work\内容标签\tag-frontend\index.html`

In `renderResults()`, each tag card needs:
1. Collapsible definition section showing `tag_desc_zh`
2. "标记不合理" button
3. Visual indicator for confirmed status

### Step 5: 前端 — 新增重测面板 UI
**File**: `D:\work\内容标签\tag-frontend\index.html`

Each tag can enter "retest mode":
- Expandable panel below the tag card
- Editable textarea for `tag_desc_zh`
- "用新定义重测" button
- Display latest retest result (confidence, thinking process)
- "确认" button to mark definition as accepted
- Green border/checkmark for confirmed tags

### Step 6: 前端 — 新增重测 JavaScript 逻辑
**File**: `D:\work\内容标签\tag-frontend\index.html`

New functions:
- `openRetestPanel(tagIndex)` — shows retest UI for that tag
- `retestWithNewDefinition(tagIndex)` — calls `POST /api/news/tag/single`
- `confirmDefinition(tagIndex)` — marks tag as confirmed
- `saveAllConfirmedDefinitions()` — calls `PUT /api/tags/definition`

New state management:
```javascript
const retestState = {
    tags: {}  // {tag_name: {confirmed: bool, modifiedDefinition: string, lastRetestResult: {}, isRetesting: bool}}
};
```

### Step 7: 前端 — 新增保存按钮和全局状态
**File**: `D:\work\内容标签\tag-frontend\index.html`

- "保存所有已确认定义" button in output section
- Shows count of confirmed tags
- Calls `PUT /api/tags/definition` with confirmed definitions

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLMTagger init loads all tags — slow for single retest | Medium | judge_tag_relevance does NOT need all tags loaded, but init does `load_tags()`. Consider lazy load or pass tag_desc directly to avoid full loading |
| 标签定义在不同 JSON 文件中 | Medium | 更新时遍历 3 个文件搜索匹配 tag_name |
| 并发重测 | Low | 前端可允许多个标签同时重测，JS async 天然支持 |
| CORS 拒绝 | Medium | 确保后端 FastAPI CORS 配置允许前端 origin（当前 index.html 是 file:// 本地打开，CORS 不会阻止） |
| LLMTagger._find_tag_desc 加载慢 | Medium | 单标签重测时 tag_desc_zh 由前端传递，后端不需要从文件加载，可跳过此步骤 |

## Verification Steps

1. 启动后端: `cd D:\work\内容标签\内容标签代码迁移 && .venv\Scripts\activate && uvicorn app.main:app`
2. 测试单标签接口: `curl -X POST http://localhost:9092/news/tag/single -H Content-Type: application/json -d '{"title":"测试","content":"测试","tag_name":"客户","tag_desc_zh":"新定义"}'`
3. 测试更新接口: `curl -X PUT http://localhost:9092/tags/definition -H Content-Type: application/json -d '[{"tag_name":"客户","tag_desc_zh":"测试定义"}]'`
4. 浏览器打开 index.html 走全流程

## Acceptance Criteria

- [ ] `POST /news/tag/single` 接口在单个标签上返回 LLM 判断结果，响应时间 < 10 秒
- [ ] `PUT /tags/definition` 接口能正确更新 intermediate JSON 文件中的 `tag_desc_zh`
- [ ] `PUT /tags/definition` 写入前先自动创建 `.bak` 备份文件
- [ ] 前端每个标签卡片展示 `tag_desc_zh` 中文定义（可展开/收起）
- [ ] 前端"标记不合理"按钮 → 展示可编辑定义框 + 重测按钮
- [ ] 前端"用新定义重测" → 调用 `POST /news/tag/single` → 刷新该标签结果
- [ ] 前端"确认"按钮标记定义已确认，UI 有视觉反馈（绿色边框/打勾图标）
- [ ] 前端"保存所有已确认定义" → 调用 `PUT /tags/definition` → 显示成功/失败反馈
- [ ] 现有全量打标流程行为完全不变

---

## ADR

**Decision**: 后端新增 `POST /news/tag/single` 和 `PUT /tags/definition` 两个独立接口；前端在 index.html 中新增重测面板和持久化 UI

**Drivers**: 全量接口耗时 30+ 秒（vecsim 向量化 + 批量 LLM）；单标签重测只需 LLM 判断一个标签（2-5 秒）；LLMTagger 已有 `judge_tag_relevance()` 方法可复用

**Alternatives considered**:
- 扩展现有 /tag 接口加 tag_name 可选参数 — 违反单一职责，返回格式不一致
- 前端纯 mock 重测 — 无实用价值

**Why chosen**: Option A 是解耦最清晰的方案，两个新端点各司其职

**Consequences**: 后端多维护两个端点；LLMTagger 构造时仍加载全部标签（可后续优化为按需加载）

**Follow-ups**:
- 优化 LLMTagger 初始化：支持传入单个标签定义，避免加载全部标签
- 添加"重置定义"按钮（回退到服务器原始定义）
- 标签定义变更后自动重新生成 embedding（tag_desc_zh 变更后 tag_embedding_zh 过期）
