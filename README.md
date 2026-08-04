# 远至

个人日程管理应用，当前包含首页、待办事项、番茄钟和计划模块。

正式应用位于 `frontend/` 和 `backend/`。根目录的 `index.html`、`app.js`、`app.css`、`home.html`、`todos.html`、`pomodoro.html`、`manifest.webmanifest` 和 `service-worker.js` 是早期静态原型，仅作历史参考，不参与当前构建或部署。

## 技术栈

- 前端：React 18、TypeScript、Vite、Lucide Icons
- 后端：Python、FastAPI、SQLAlchemy、SQLite

## 本地启动

后端：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8011
```

前端：

```powershell
cd frontend
npm install
npm run dev
```

打开 `http://127.0.0.1:5173`。API 文档位于 `http://127.0.0.1:8011/docs`。

SQLite 数据库会在首次启动后端时自动生成于 `backend/yuanzhi.db`。
启动时会自动执行版本化数据库迁移；可通过 `YUANZHI_DATABASE_URL` 覆盖数据库地址。

## 验证

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest

cd ..\frontend
npm run check
npm run build
```
