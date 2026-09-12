# Codex 跨设备迁移提示

将以下提示完整复制到新设备上的 Codex 对话中使用。克隆仓库后的终端当前目录应为项目根目录。

```text
你正在接管项目“远至（YuanZhi）”。请在当前工作区完成迁移、环境初始化和验收；除非我明确要求，不要修改业务代码、依赖版本、数据库结构或 Git 历史。

项目说明：
- 这是一个个人日程与专注管理应用。
- 前端位于 frontend/，技术栈为 React 18、TypeScript、Vite 6。
- 后端位于 backend/，技术栈为 Python、FastAPI、SQLAlchemy 和 SQLite。
- 本地开发地址为前端 http://127.0.0.1:5173，后端 http://127.0.0.1:8011。
- 前端通过 Vite 将 /api 代理到后端 8011 端口。
- 完整的项目使用说明见 README.md，必须先阅读并以其中内容为准。

请按以下顺序操作：
1. 读取 README.md、.gitignore、frontend/package.json、backend/requirements.txt，并检查 git status；不要覆盖或删除已有用户改动。
2. 检查 Python、Node.js 和 npm 版本。项目要求 Python 3.10+、Node.js 18+、npm 9+；若不满足，只报告缺失项和安装建议，不要自行安装系统级软件。
3. 在 backend/ 创建 .venv，并用该虚拟环境安装 requirements.txt 中的依赖。
4. 在 frontend/ 使用 npm ci 安装锁定版本的依赖；若因没有 package-lock.json 无法执行，则改用 npm install，并说明原因。
5. 运行后端测试和前端检查：
   - backend: .venv 对应的 Python 执行 -m pytest
   - frontend: npm run check 和 npm run build
6. 仅当第 5 步通过后，启动后端和前端开发服务器。后端使用 127.0.0.1:8011，前端使用默认端口 5173；若端口被占用，先识别占用进程并使用未占用端口，同时明确报告实际访问地址和需要同步修改的代理配置。
7. 访问后端 /api/health，确认返回 status 为 ok；再确认前端页面能够加载。
8. 最终用简洁中文报告：环境版本、依赖安装结果、测试/构建结果、服务地址、是否发现未提交改动，以及任何需要我手动处理的问题。

数据与密钥规则：
- Git 仓库不包含 backend/yuanzhi.db、backend/.venv、frontend/node_modules、.env 文件和 API Key。这是预期行为，不要把它们加入版本控制。
- 如需保留旧设备的待办、计划、专注记录和应用设置，请由我通过安全方式手动复制 backend/yuanzhi.db 到新设备的 backend/yuanzhi.db；复制前先关闭两个设备上的后端服务。不要通过 Git、公开仓库、聊天消息或日志传输数据库和密钥。
- 若没有旧数据库，可直接启动后端；应用会创建新 SQLite 数据库、数据表和示例待办。
- 天气和热搜服务的设置及 API Key 存放在 SQLite 数据库中。迁移后如未复制数据库，应由我在应用设置中重新填写，不要请求我在对话中发送密钥。
- 不要执行 git reset --hard、git clean、删除数据库或覆盖配置文件等破坏性命令。
```

## 迁移前准备

1. 确认 GitHub 仓库已推送最新代码。
2. 如需保留本地数据，先停止旧设备后端，再安全备份 `backend/yuanzhi.db`；该文件可能包含应用设置和 API Key。
3. 新设备安装 Git、Python 3.10+ 与 Node.js 18+ 后，克隆仓库并将上述提示交给 Codex。
4. 不迁移 `backend/.venv`、`frontend/node_modules`、`frontend/dist` 或缓存目录；这些内容应在新设备重新生成。

## 新设备克隆命令

```powershell
git clone https://github.com/yhy666888/YuanZhi.git
cd YuanZhi
```

然后在该目录启动 Codex，并提交本文件中的提示。
