# AGENTS.md — AI 开发者上下文

> 本文档面向 AI 编码助手（也可作为新人上手文档）。阅读完即可了解项目全貌、技术栈、开发约定、已知问题与路线图。修改代码前请先通读"开发约定"与"已知问题"两节，避免重复踩坑。

## 项目是什么

**远至（YuanZhi）** 是一款面向个人使用的**一站式日常应用**：将每日计划、待办、番茄钟、记账、习惯数据（打卡统计）、天气、热搜聚合在同一个工作台中。本地优先架构（SQLite 单文件数据库），设计上只服务单个用户，可局域网/远程多端访问（浏览器）。

产品核心：**每日计划是脊柱**，其他模块的数据都围绕"今天"组织。最终目标是替代日历、待办、番茄钟、记账等多个独立应用。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 18、TypeScript（strict）、Vite 6、lucide-react（图标，无 UI 库） |
| 后端 | Python 3.10+、FastAPI、SQLAlchemy 2（Mapped 风格）、Pydantic 2 |
| 数据库 | SQLite 单文件 `backend/yuanzhi.db`，版本化迁移（schema_migrations 表） |
| 测试 | 后端 Pytest（18 例）、前端 Vitest（11 例）、TypeScript Compiler |
| 质量 | ESLint 10（flat config，react-hooks v7 规则很严格）、GitHub Actions CI |
| 部署 | 一体化模式：`frontend/dist` 存在时 FastAPI 直接托管前端，单端口 8011 |

## 目录结构与职责

```text
backend/
  app/
    main.py            # 入口：备份、建表、迁移、CORS、路由注册、静态托管、令牌中间件
    database.py        # engine/SessionLocal/get_db（YUANZHI_DATABASE_URL，默认 sqlite:///./yuanzhi.db）
    migrations.py      # 版本化迁移 v1~v5（改表结构必须在这里加迁移函数）
    models.py          # 全部 SQLAlchemy 模型（无外键约束，应用层维护关联）
    schemas.py         # 全部 Pydantic Schema
    routers/           # 按资源拆分：todos/plans/plan_templates/pomodoros/expenses/
                       #   dashboard/weather/trending/settings/data(导出导入)
  tests/test_api.py    # 后端全部测试（独立 test.db，setup_module 会删库重建）
frontend/
  src/
    pages/             # Home/TodosPage/PomodoroPage/PlansPage/PlanOverviewPage/MoneyPage
    components/        # Sidebar/Header/Widgets(共用小组件)/DateTimePicker(日期+滚轮时间)/
                       #   PlanTemplateDialog/CommandPalette(Ctrl+K)/各业务弹窗
    api.ts             # 全部 API 客户端与 TS 类型（前后端类型对齐的唯一来源）
    utils.ts           # 日期/金额格式化、Page 类型、分类与支付方式常量
    styles.css         # 全部样式（半压缩风格，新样式追加在文件尾，注意共用类误删）
  public/              # PWA：manifest、sw.js、icons（由 scripts/generate_icons.py 生成）
scripts/generate_icons.py  # Pillow 生成 PWA 图标（依赖 requirements-dev 的 pillow）
```

## 启动与验证

```powershell
# 一体化启动（先构建前端，后端 8011 同时托管页面与 API）
cd frontend && npm install && npm run build
cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8011
# 浏览器访问 http://127.0.0.1:8011

# 开发模式（可选）：后端同上 + 前端 vite dev（5173，/api 代理到 8011）

# 验证（改动后必须全部通过）
cd backend && .venv\Scripts\python.exe -m pytest -q        # 18 例
cd frontend && npm run lint && npm run check && npm test && npm run build   # 11 例
```

CI（GitHub Actions）会在 push 时运行：后端 pytest + 前端 lint/check/test/build。

## 功能模块现状

- **首页工作台**：统计卡（待办进度/今日计划/今日专注/今日支出，支出卡可点击）、速览行、番茄钟、今日计划时间轴（当前时段高亮、过期标红）、今日待办；右栏为天气+当月日历组合卡与热搜聚合。
- **待办**：优先级、截止时间（含提醒）、番茄目标；筛选 tabs。
- **计划**：四个标签页——每日计划（"我的一天"当日卡片 + 月份导航 + 圆圈勾选）、月度、年度、**计划总结**（坚持记录统计 + GitHub 式全年打卡热力图 + 往日未完成补打卡）；**计划模板**（某日计划存为模板一键生成）；重复计划按 repeat_group_id 系列（scope=one/series/following）编辑删除。
- **番茄钟**：墙钟计时（后台限流不漂移，localStorage 恢复）；**专注记录面板**（最近 7 天可编辑/删除）；计时完成桌面通知。
- **记账**：支出/收入（kind）、支付方式（method：微信/支付宝/现金/银行卡/信用卡）、发生时间精确到时分、分类、备注；记录编辑弹窗；汇总面板（本月收支、今日支出、分类占比、**存款=累计收入−累计支出、负债=信用卡支出−信用卡还款**）；明细按日分组 + 类型筛选；悬浮 ⊕ 记账按钮。
- **计划总结数据**：`GET /api/plans/stats`（今日/本周/近 7 天/近 30 天/连续全勤/overdue/heatmap 105 天）；`GET /api/plans/checkins?month=|year=`。
- **天气**：和风天气（设置中配 Key），首页组合卡点击开详情弹窗。
- **热搜**：uphotspot.com 聚合，后端缓存 5 分钟。
- **设置**：天气/热搜配置（Key 脱敏）、**导出/导入 JSON 全量备份**；后端启动自动备份数据库到 `backend/backups/`（保留 7 份）。
- **PWA**：manifest + Service Worker（静态缓存、页面离线回退、API 永不缓存）；需 HTTPS 或 localhost。
- **全局**：Ctrl/Cmd+K 快捷录入面板（记一笔/建待办/建今日计划/页面跳转）；桌面提醒（计划开始前 10 分钟、待办截止前 30 分钟、番茄完成，点击跳转）。

## API 概览（全部以 /api 为前缀）

- 待办：`GET/POST /todos`、`PATCH/DELETE /todos/{id}`
- 计划：`GET/POST /plans`、`PATCH/DELETE /plans/{id}?scope=one|series|following`、`GET /plans/stats`、`GET /plans/checkins?month=|year=`
- 计划模板：`GET/POST /plan-templates`、`POST /plan-templates/{id}/apply`、`DELETE /plan-templates/{id}`
- 番茄：`POST /pomodoros`、`GET /pomodoros?days=N`、`PATCH/DELETE /pomodoros/{id}`
- 记账：`GET /expenses?month=`（含 summary）、`POST /expenses`、`PATCH/DELETE /expenses/{id}`
- 其他：`GET /dashboard`、`GET /weather`、`GET /trending`、`GET/PUT /settings`、`GET /export`、`POST /import`、`GET /health`

## 开发约定（重要，避免踩坑）

1. **时间一律用本地时间（naive local）**：全项目统一 `datetime.now()`，禁止 `utcnow`（v2 迁移已清洗过历史数据）。前端向后端传 `"YYYY-MM-DDTHH:MM"` 格式。
2. **金额一律 `amount_cents` 整数（分）**，前端展示时 `/100`，避免浮点。
3. **改表结构必须加迁移**：`migrations.py` 的 MIGRATIONS 列表追加 `(vN, 函数)`，函数要幂等（用 inspect 判断列/表是否存在）。新表不用迁移（create_all 自动建）。
4. **前后端类型对齐靠 `frontend/src/api.ts`**：改接口先改 schemas.py 再同步 api.ts。
5. **React hooks**：react-hooks v7 的 `set-state-in-effect` 和 `refs` 规则会误报异步数据加载——项目内已有 `// eslint-disable-next-line react-hooks/set-state-in-effect` 先例（附理由注释）；props 同步 state 用"渲染期调整"模式（见 PlansPage PlanRow）。
6. **styles.css 是共用区**：`.category-chips`（胶囊选择器）被多个弹窗共用；`.icon-button.danger` 全局 `opacity:0`（悬停显示），需要常显的场景要显式覆盖（见 `.money-row` 规则）。新样式追加在文件尾部并加注释分节。
7. **无 UI 库**：所有组件手写，样式遵循现有设计令牌（--surface/--line/--blue/--mint 等），弹窗用 `.modal-backdrop` + `.todo-dialog`。
8. **路由是手写 hash 路由**：`utils.ts` 的 Page 类型 + pageFromHash；页面在 App.tsx 的条件渲染中。页面多于 ~7 个时考虑引入 react-router。
9. **状态集中在 App.tsx**（todos/plans/planStats/dashboard/weather/trending/expenseSummary），通过 props 下发；页面内局部数据（如账单明细）可自行 fetch。
10. **敏感数据**：`backend/yuanzhi.db`（含天气 Key 明文）不入库；`/api/export` 导出含 Key；`.gitignore` 已覆盖 db/venv/node_modules/dist。提交前务必 grep 检查。
11. **访问令牌**：环境变量 `YUANZHI_API_TOKEN` 设置后，除 /api/health 外所有 /api 要求 `X-YuanZhi-Token` 头；前端 401 时 prompt 一次并存 localStorage。默认不启用。
12. **网络**：本机访问 GitHub 可能间歇性失败（Connection reset），push 失败多重试。

## 已知问题与设计取舍（知情，勿当新 bug 报）

1. **局域网 0.0.0.0 暴露无强制鉴权**：Token 是可选的；`/api/export` 含天气 Key 明文。个人可信网络内使用。
2. **删除待办后番茄记录成孤儿**：PomodoroSession.todo_id 无外键，专注统计仍计入（语义上"专注时长"保留是合理的）。
3. **stats.heatmap（105 条）前端已不消费**（周视图移除后），年热力图走 checkins?year=。属冗余传输，待裁剪。
4. **记账无分页**：数据量大后 money 页全量拉取会变慢；待办/计划同样无分页。
5. **存款从 0 累计**：无期初余额设置，需手动记一笔收入代表当前存款基数。
6. **番茄钟跨午夜关闭页面**：不自动补记（loadPersisted 的设计选择，代码有注释）。
7. **热搜显示**：上游不可用时会区分"热搜服务暂时不可用"与"尚未配置"（status 字段）。
8. **无更新通知机制**：多端（手机/MacBook）通过同一后端访问即共享数据，README 有 Tailscale + PWA 方案。

## 路线图（与用户对齐过的方向）

- **已完成**：核心闭环（计划打卡/统计/模板/总结页）、记账（收支/方式/存款负债）、PWA、提醒、快捷录入、记录管理。
- **下一步候选**：习惯打卡模块、月度回顾页（趋势图）、计划模板管理界面增强、记账分类自定义。
- **多端**：手机 PWA + Tailscale HTTPS（文档见 README"手机与其他设备访问"）。

## 测试与提交约定

- 测试文件：后端 `tests/test_api.py`（用例与实现同文件追加，注意测试间数据隔离——用 SessionLocal 清表）；前端 `src/*.test.ts(x)`。
- 提交信息用中文一行概述 + 正文要点；提交前 `git status` 确认无 db/venv/密钥。
- 本机 push GitHub 可能 Connection reset，重试即可。
