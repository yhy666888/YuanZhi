# 远至（YuanZhi）

远至是一款面向个人使用的日程与专注管理应用，将待办事项、周期计划、番茄钟、天气和热点信息集中在同一个工作台中。项目采用前后端分离架构，默认使用本地 SQLite 数据库存储数据，适合本地运行和二次开发。

![远至首页预览](./new_home.png)

## 功能特性

- **概览工作台**：汇总当日任务、完成进度、专注时长和番茄数量。
- **待办管理**：创建、编辑、完成和删除待办，支持优先级、截止时间与番茄目标。
- **计划管理**：管理每日、每月和年度计划；每日计划支持按天、间隔天数或指定星期重复。
- **番茄钟**：自定义专注时长、关联待办，并支持手动补录专注记录。
- **天气信息**：通过和风天气（QWeather）获取实时天气及七日预报。
- **聚合热搜**：展示微博、抖音、知乎、哔哩哔哩、百度和今日头条热点。
- **响应式界面**：适配桌面端和移动端显示。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 18、TypeScript、Vite 6、Lucide React |
| 后端 | Python、FastAPI、SQLAlchemy 2、Pydantic 2 |
| 数据库 | SQLite（默认） |
| 测试 | Pytest、FastAPI TestClient、TypeScript Compiler |

## 项目结构

```text
yuanzhi/
├── frontend/                 # 当前 React 前端
│   ├── src/                  # 页面、组件、样式和 API 客户端
│   ├── package.json          # 前端依赖与脚本
│   └── vite.config.ts        # 开发服务器与 API 代理
├── backend/                  # 当前 FastAPI 后端
│   ├── app/                  # 接口、模型、Schema 和数据库迁移
│   ├── tests/                # 后端自动化测试
│   └── requirements.txt      # Python 依赖
├── new_home.png              # 项目预览图
└── README.md
```

根目录中的 `index.html`、`app.js`、`app.css`、`home.html`、`todos.html`、`pomodoro.html`、`manifest.webmanifest` 和 `service-worker.js` 属于早期静态原型，仅作历史参考，不参与当前应用的构建或部署。

## 环境要求

- Python 3.10 或更高版本
- Node.js 18 或更高版本
- npm 9 或更高版本

## 快速开始

### 1. 启动后端

在项目根目录执行：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8011
```

macOS 或 Linux：

```bash
cd backend
python3 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
./.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8011
```

后端启动后可访问：

- 健康检查：<http://127.0.0.1:8011/api/health>
- Swagger UI：<http://127.0.0.1:8011/docs>
- OpenAPI 描述：<http://127.0.0.1:8011/openapi.json>

### 2. 启动前端

另开一个终端，在项目根目录执行：

```powershell
cd frontend
npm ci
npm run dev
```

浏览器打开 <http://127.0.0.1:5173>。Vite 开发服务器会将 `/api` 请求代理到 `http://127.0.0.1:8011`。

首次启动后端时会自动创建数据表、执行数据库迁移并写入示例待办。默认数据库文件位于 `backend/yuanzhi.db`。

## 配置说明

### 数据库

后端通过 `YUANZHI_DATABASE_URL` 读取数据库连接地址，未设置时使用 `sqlite:///./yuanzhi.db`。

PowerShell 示例：

```powershell
$env:YUANZHI_DATABASE_URL = "sqlite:///./data/yuanzhi.db"
```

Bash 示例：

```bash
export YUANZHI_DATABASE_URL="sqlite:///./data/yuanzhi.db"
```

相对路径以启动后端时的工作目录为基准。修改连接地址后再启动服务即可生效。

### 天气与热搜

进入应用右上角的设置面板可配置以下内容：

| 配置项 | 说明 | 是否必需 |
| --- | --- | --- |
| 天气 API 地址 | 和风天气提供的 HTTPS API Host | 使用天气功能时必需 |
| 天气 API Key | 和风天气项目凭证 | 使用天气功能时必需 |
| 默认城市 | 城市名称，例如“北京” | 使用天气功能时必需 |
| 热搜 API 地址 | 固定为 `https://uphotspot.com/api/all` | 否，已有默认值 |
| 热搜 API Key | 热搜服务凭证 | 取决于服务端要求 |

API Key 会保存在本地数据库中，查询设置时不会返回明文，但当前版本未对数据库内的值进行加密。请勿在共享或不受信任的运行环境中填写高权限凭证。

## API 概览

所有业务接口均以 `/api` 为前缀。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | 服务健康检查 |
| `GET` / `POST` | `/api/todos` | 查询或创建待办 |
| `PATCH` / `DELETE` | `/api/todos/{todo_id}` | 更新或删除待办 |
| `POST` | `/api/pomodoros` | 记录一次专注 |
| `GET` | `/api/dashboard` | 获取当日统计 |
| `GET` / `POST` | `/api/plans` | 查询或创建计划 |
| `PATCH` / `DELETE` | `/api/plans/{plan_id}` | 更新或删除计划 |
| `GET` | `/api/weather` | 获取天气与预报 |
| `GET` | `/api/trending` | 获取聚合热搜 |
| `GET` / `PUT` | `/api/settings` | 查询或更新应用设置 |

完整的请求参数和响应结构以运行时的 Swagger UI 为准。

## 开发与验证

后端测试：

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

前端类型检查与生产构建：

```powershell
cd frontend
npm run check
npm run build
```

生产构建产物输出到 `frontend/dist/`。当前仓库未提供一体化生产服务器；部署时应使用静态文件服务器托管该目录，并通过同源反向代理将 `/api` 转发到 FastAPI 服务。

## 数据与迁移

- 应用启动时自动创建缺失的数据表并执行版本化迁移。
- SQLite 数据库和测试数据库已加入 `.gitignore`，不会提交到版本库。
- 更新代码或迁移前，建议先备份 `backend/yuanzhi.db`。
- 测试使用独立的 `backend/tests/test.db`，不会读写正式数据库。

## 常见问题

**前端提示请求失败**

确认后端运行在 `127.0.0.1:8011`，并访问健康检查接口验证服务状态。若修改了后端端口，需要同步更新 `frontend/vite.config.ts` 中的代理地址。

**天气信息显示为空**

确认已在设置中填写有效的和风天气 API Host、API Key 和城市。无法连接第三方服务或凭证无效时，后端会返回空天气数据。

**热搜内容为空**

热搜依赖外部服务，网络不可用、接口限流或服务异常时可能暂无数据。成功结果会在后端缓存约 5 分钟。
