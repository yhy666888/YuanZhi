# 上传项目到 GitHub

本文适用于当前项目目录 `E:\code\yuanzhi`。项目目前尚未初始化为有效的 Git 仓库，因此需要从 `git init` 开始。

## 1. 上传前检查

项目的以下内容已在 `.gitignore` 中排除，不会上传：

- `frontend/node_modules/` 和 `frontend/dist/`
- `backend/.venv/`
- `backend/yuanzhi.db`
- Python、pytest 和 TypeScript 构建缓存
- `.env`、日志及临时审查截图

天气 API Key 等设置保存在 `backend/yuanzhi.db`，该数据库不会提交。仍建议在提交前检查一次待上传文件，不要上传真实密钥、Token、个人数据或本地配置。

运行项目验证：

```powershell
cd E:\code\yuanzhi\frontend
npm run build

cd ..\backend
.\.venv\Scripts\python.exe -m pytest -q
```

## 2. 创建 GitHub 仓库

1. 登录 [GitHub](https://github.com/)。
2. 点击右上角 `+`，选择 `New repository`。
3. 输入仓库名称，例如 `yuanzhi`。
4. 根据需要选择 `Public` 或 `Private`。
5. 不要勾选自动创建 README、`.gitignore` 或 License，避免首次推送产生冲突。
6. 点击 `Create repository`，保留页面上显示的仓库地址。

仓库地址格式如下：

```text
https://github.com/你的用户名/yuanzhi.git
```

## 3. 初始化并首次提交

打开 PowerShell，执行：

```powershell
cd E:\code\yuanzhi

git init
git branch -M main

git config user.name "你的 GitHub 用户名"
git config user.email "你的 GitHub 邮箱"

git add .
git status
git commit -m "Initial commit"
```

执行 `git status` 时，确认列表中没有以下内容：

- `backend/yuanzhi.db`
- `backend/.venv/`
- `frontend/node_modules/`
- 任何包含真实 API Key、密码或 Token 的文件

## 4. 关联并推送到 GitHub

将命令中的用户名和仓库名替换为实际值：

```powershell
git remote add origin https://github.com/你的用户名/yuanzhi.git
git push -u origin main
```

GitHub 不再接受账户密码进行 Git 推送。弹出登录窗口时使用浏览器授权；如果命令行要求密码，应填写 GitHub Personal Access Token，而不是账户密码。

如果提示 `remote origin already exists`，执行：

```powershell
git remote set-url origin https://github.com/你的用户名/yuanzhi.git
git push -u origin main
```

## 5. 后续更新

每次修改后执行：

```powershell
cd E:\code\yuanzhi
git status
git add .
git commit -m "描述本次修改"
git push
```

## 6. 在新电脑恢复项目

```powershell
git clone https://github.com/你的用户名/yuanzhi.git
cd yuanzhi

cd frontend
npm install

cd ..\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

随后按照项目根目录 `README.md` 中的命令分别启动前端和后端。

## 部署说明

上传到 GitHub 只代表保存和共享源代码。该项目包含 FastAPI 后端和 SQLite 数据库，不能直接完整部署到 GitHub Pages。正式上线需要分别部署前端与后端，并通过环境变量或服务端密钥管理配置 API Key。
