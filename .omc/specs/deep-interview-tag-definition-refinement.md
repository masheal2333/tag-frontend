# Deep Interview Spec: 标签定义准确度迭代优化工作流

## Metadata
- Interview ID: di-001
- Rounds: 6
- Final Ambiguity Score: 10%
- Type: brownfield
- Generated: 2026-04-03
- Threshold: 0.2
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.9 | 0.35 | 0.315 |
| Constraint Clarity | 0.9 | 0.25 | 0.225 |
| Success Criteria | 0.9 | 0.25 | 0.225 |
| Context Clarity | 0.9 | 0.15 | 0.135 |
| **Total Clarity** | | | **0.90** |
| **Ambiguity** | | | **0.10** |

## Goal

在当前新闻标签系统（`tag-frontend/index.html` + 后端 `/api/news/tag`）基础上，新增一个**标签定义迭代优化工作流**。用户在完成一次全量打标后，可以对"不合理"的标签逐个进行"修改定义→单独重测→查看结果→再修改定义"的循环，直到对该标签的打标结果满意为止。用户点击"确认"按钮后，该标签的更新后定义才持久化到后端标签定义文件中。**最终目标是让标签的定义更加准确，从而提升打标准确率。**

## Constraints

- 全量打标仍使用现有 `POST /api/news/tag` 接口
- 单标签重测需要**新增后端接口**（因为全量接口返回太慢），接收 `{title, content, tag_name}`，仅返回该标签结果
- 标签定义中只有 `tag_desc_zh`（中文定义）可被用户编辑
- 用户逐个确认标签定义（不是批量确认）
- 只有用户点击"确认"按钮后，修改后的 `tag_desc_zh` 才持久化到后端标签文件
- 标签定义文件位于 `D:\work\内容标签\内容标签代码迁移\app\algo\tag\data\intermediate\` 下：
  - `intermediate_objects.json`（物体标签，仅有 `tag_name` + `tag_desc_zh`）
  - `intermediate_entity.json`（自定义实体标签，含 `tag_source` + `tag_name` + `tag_type` + `tag_desc_zh` + `tag_desc_en` + `tag_embedding_zh`）
  - `intermediate_custom.json`（格式与 entity 类似）

## Non-Goals

- 不涉及修改 `tag_desc_en` 或 `tag_embedding_zh`
- 不涉及批量修改多个标签定义
- 不改变现有全量打标流程的核心行为
- 不需要用户自行选择使用哪套标签定义文件

## Acceptance Criteria

- [ ] 用户输入标题+内容，点击"开始标签化"后，正常显示全量标签结果（含 tag_desc_zh 定义、置信度、思考过程）
- [ ] 每个标签旁边有"标记不合理"按钮，点击后进入该标签的重测模式
- [ ] 重测模式展示：当前标签定义（tag_desc_zh）、上一次重测结果（置信度、思考过程）、一个可编辑的定义修改框
- [ ] 用户修改定义后点击"用新定义重测"，调用单标签重测接口，刷新显示新结果
- [ ] 用户可以反复"改定义→重测"，每次重测结果都即时显示
- [ ] 每个标签旁边有"确认"按钮，点击后将修改后定义标记为"已确认"（前端暂存）
- [ ] 最终用户点击"保存所有已确认定义"，将确认的修改持久化到后端对应标签文件
- [ ] 持久化操作有成功/失败反馈

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 标签定义在前端可直接编辑 | 后端是否有定义字段？ | 后端 API 返回定义，前端直接展示 tag_desc_zh |
| 重测只针对单个标签 | 全量返回太慢，用户体验差 | 需后端新增单标签重测接口 |
| 置信度高但标签不合理时继续改定义 | 模型坚持标签正确怎么办？ | 用户认为不合理一定是定义问题，继续修改 |
| 只改中文定义 | 英文定义也要改吗？ | 只修改 tag_desc_zh，tag_desc_en 不变 |

## Technical Context

### 当前前端状态
- 项目位于 `D:\work\内容标签\tag-frontend\index.html`，纯前端实现
- 现有 UI：双栏布局（左侧输入区 + 右侧结果区）
- 现有流程：表单提交 → `POST /api/news/tag` → 渲染 `related=true` 的标签

### 当前后端状态
- 后端位于 `D:\work\内容标签\内容标签代码迁移\`
- 现有 API：`POST /api/news/tag` 接收 `{title, content}` 返回全部标签
- 标签定义文件在 `app/algo/tag/data/intermediate/` 下

### 需要新增的能力
1. **后端新增接口** `POST /api/news/tag/single` 接收 `{title, content, tag_name}` 仅返回指定标签结果
2. **后端新增接口** `PUT /api/tags/definition` 接收 `[{tag_name, tag_desc_zh, file}]` 更新标签定义文件
3. **前端新增 UI**：
   - 每个标签展示 `tag_desc_zh` 定义
   - "标记不合理"按钮 → 进入重测模式
   - 可编辑的 `tag_desc_zh` 文本框
   - "用新定义重测"按钮
   - "确认"按钮（单个标签确认）
   - "保存所有确认结果"按钮（批量持久化）
