# 远至

多平台（Web / Windows / Android）的个人日程管理软件。集番茄钟、待办事项、便签、记账、计划于一体，本地优先、离线可用，通过 WebDAV 实现多端数据同步。

## 功能特性

### 首页概览

- 顶部卡片展示今日日期、星期、农历日期
- 纪念日倒计时（自动显示最近一个纪念日，无则隐藏）
- 实时天气展示，点击弹出天气详情弹窗（逐时 24h 预报 + 近 7 天预报）
- 首页可直接切换/搜索所在城市
- 待办事项预览（按即将到期排序，展示前 5 条）
- 今日热搜 Top 10

### 番茄钟

- 圆形进度环计时器，全屏铺满主区域
- 专注 / 休息模式切换，默认 25 分钟专注 + 5 分钟休息
- 自定义专注与休息时长
- 专注完成自动记录会话 + 系统通知提醒
- 统计弹窗：今日 / 本周 / 累计专注次数与时长 + 近 7 天柱状图

### 待办事项

- 新建待办：内容、截止时间、是否提醒、重要程度（低/普通/高/紧急）、图标标识（工作/生活/学习/健康/购物/财务/社交/旅行/运动/其他）
- 按时间顺序排列，左侧色条按重要程度区分颜色
- 支持完成切换、编辑、删除
- 与首页联动展示

### 便签

- 便签纸网格布局，8 种颜色可选（含白色）
- 支持富文本（TipTap）和 Markdown 两种编辑格式
- Markdown 支持实时预览切换
- 置顶功能
- 点击便签进入详情页面，支持查看/编辑模式切换
- 整页配色跟随便签颜色

### 其他功能

- **深浅色主题**：三态切换（跟随系统 / 浅色 / 深色），自动持久化
- **侧边栏拖拽排序**：点击底部拖拽图标进入排序模式，拖动调整模块顺序
- **WebDAV 同步**：支持坚果云等 WebDAV 服务，记录级 LWW（Last-Write-Wins）合并，离线优先
- **设置备份**：支持导出 / 导入设置 JSON
- **敏感数据保护**：设置中的 API Key、WebDAV 账号密码默认星号显示，可点击切换

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 桌面/移动壳 | Tauri 2.0 | 一套代码覆盖 Windows + Android，Web 端直接部署前端产物 |
| 前端框架 | React 19 + TypeScript | 三端共用同一份前端代码 |
| 构建工具 | Vite 7 | 开发热重载 + 生产构建 |
| UI 样式 | Tailwind CSS 3 + shadcn/ui | 组件化、深浅色主题 |
| 状态管理 | Zustand | 轻量持久化存储 |
| 路由 | React Router 7 | Hash 路由 |
| 本地数据库 | SQLite（tauri-plugin-sql） | 离线真实数据源，自动建表迁移 |
| 数据同步 | WebDAV（reqwest + 坚果云） | Rust 侧文件传输，JS 侧 LWW 合并 |
| 天气数据 | 和风天气 API | 实时天气 + 逐时 + 7 天预报 |
| 图表 | Chart.js + react-chartjs-2 | 番茄钟统计 |
| 富文本 | TipTap | 便签富文本编辑 |
| Markdown | react-markdown + remark-gfm | 便签 Markdown 编辑与预览 |
| 拖拽排序 | dnd-kit | 侧边栏模块拖拽 |
| 农历 | lunar-javascript | 农历日期、节气、节日 |
| 通知 | tauri-plugin-notification | 系统级通知 |

## 项目结构

```
yuanzhi/
├── src/                          # 前端源码（三端共用）
│   ├── modules/                  # 功能模块
│   │   ├── home/                 # 首页（日期/天气/纪念日/热搜/待办）
│   │   ├── pomodoro/             # 番茄钟
│   │   ├── todolist/             # 待办事项
│   │   ├── memo/                 # 便签（列表 + 详情页）
│   │   ├── account/              # 记账本（占位）
│   │   ├── plan/                 # 计划（占位）
│   │   └── settings/             # 设置
│   ├── components/               # 通用组件
│   │   ├── ui/                   # shadcn/ui 基础组件（Button/Card/Dialog）
│   │   ├── home/                 # 首页子组件
│   │   ├── memo/                 # 便签编辑器组件
│   │   ├── pomodoro/             # 番茄钟统计弹窗
│   │   └── layout/               # 侧边栏 + 主布局
│   ├── services/                 # 数据访问与 API 封装
│   │   ├── db.ts                 # SQLite 连接与建表
│   │   ├── todos.ts              # 待办 CRUD
│   │   ├── memos.ts              # 便签 CRUD
│   │   ├── pomodoro.ts           # 番茄钟会话记录与统计
│   │   ├── anniversaries.ts      # 纪念日 CRUD
│   │   ├── weather.ts            # 和风天气 API
│   │   ├── hotsearch.ts          # 热搜聚合 API
│   │   ├── sync.ts               # WebDAV 同步（LWW 合并）
│   │   ├── http.ts               # HTTP 封装（Rust 代理绕 CORS）
│   │   └── notify.ts             # 系统通知
│   ├── store/                    # Zustand 状态管理
│   │   ├── theme.ts              # 主题状态
│   │   ├── settings.ts           # 应用设置
│   │   ├── pomodoro.ts           # 番茄钟计时状态
│   │   └── nav.ts                # 导航栏排序
│   ├── lib/                      # 工具函数与常量
│   ├── db/                       # 数据库 Schema 定义
│   └── router/                   # 路由配置
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── lib.rs                # Tauri 插件注册与命令分发
│   │   ├── sync.rs               # WebDAV 文件上传/下载
│   │   └── proxy.rs              # HTTP 代理（reqwest，绕 CORS + gzip）
│   ├── capabilities/             # Tauri 权限配置
│   ├── Cargo.toml                # Rust 依赖
│   └── tauri.conf.json           # Tauri 应用配置
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 环境要求

### 运行开发环境

- **Node.js** >= 18
- **npm** >= 9
- **Rust** >= 1.75（`rustup` 安装）
- **Windows 桌面端额外要求**：
  - Visual Studio 2022 Build Tools（含 MSVC v143 + Windows SDK）
  - 通过 winget 安装：`winget install Microsoft.VisualStudio.2022.BuildTools --source winget --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommend"`

### 外部服务

- **和风天气 API Key**：前往 [和风天气开发者平台](https://dev.qweather.com/) 注册，获取 API Key（开发版免费）
- **WebDAV 服务（可选）**：推荐 [坚果云](https://www.jianguoyun.com/)，用于多端数据同步

## 安装说明

### 1. 克隆项目

```bash
git clone https://github.com/yhy666888/YuanZhi.git
cd yuanzhi
```

### 2. 安装前端依赖

```bash
npm install
```

### 3. 确认 Rust 工具链

```bash
rustc --version
cargo --version
```

如未安装 Rust：

```bash
winget install Rustlang.Rustup --source winget
```

## 运行方式

### 桌面端开发（推荐，完整功能）

```bash
npm run tauri dev
```

启动后会同时运行 Vite 开发服务器和 Tauri 桌面窗口，支持前端热重载。首次编译需下载 Rust 依赖，耗时较长（约 10 分钟），后续增量编译很快。

### Web 端开发（仅 UI 预览，无数据库/通知）

```bash
npm run dev
```

浏览器打开 `http://localhost:1420`。可以预览界面和交互，但 SQLite、系统通知等功能不可用。

### 生产构建

```bash
# 构建前端产物
npm run build

# 打包桌面应用（生成 .msi / .exe）
npm run tauri build

# 初始化 Android 项目（需 Android SDK）
npm run tauri android init

# 构建 Android APK
npm run tauri android build
```

## 使用方法

### 首次使用

1. 启动应用后，进入 **设置** 页面
2. 在 **天气** 分区填入和风天气 API Key
3. 在 **和风 API Host** 填入你的 API 主机地址（开发版为 `devapi.qweather.com`，企业版为你的专属域名如 `xxxx.re.qweatherapi.com`）
4. 回到首页，点击城市名称可搜索或选择热门城市
5. （可选）在 **WebDAV 同步** 分区填入坚果云账号和应用密码，点击「立即同步」开启多端同步

### 首页

- 顶部卡片显示日期、农历、纪念日、当前天气
- 点击天气区域弹出详情弹窗，查看逐时和 7 天预报
- 点击城市名（带图标）切换/搜索城市
- 下方显示待办事项预览，可勾选完成

### 待办事项

1. 点击右上角「新建」按钮
2. 填写内容、截止时间、重要程度、图标标识、是否提醒
3. 保存后列表按时间排序，左侧色条表示重要程度
4. 可编辑、删除、切换完成状态

### 番茄钟

1. 侧边栏点击「番茄钟」进入全屏计时页
2. 选择专注或休息模式，点击「开始」
3. 计时结束后自动通知并切换模式
4. 点击统计图标查看专注数据

### 便签

1. 点击「新建」创建便签
2. 选择颜色、格式（富文本 / Markdown）
3. 富文本模式提供工具栏（加粗、列表、代码块、高亮等）
4. Markdown 模式支持实时预览
5. 点击便签卡片进入详情页，右上角编辑按钮修改
6. 可置顶便签

### 侧边栏排序

1. 点击侧边栏底部的拖拽图标进入排序模式
2. 拖动模块调整顺序
3. 点击勾号完成排序，顺序自动保存

### 数据同步

1. 在设置页配置 WebDAV（坚果云推荐配置）：
   - 服务器地址：`https://dav.jianguoyun.com/dav/`
   - 账号：坚果云登录账号
   - 应用密码：坚果云 → 安全选项 → 添加应用密码
   - 远端目录：`/yuanzhi/`
2. 点击「立即同步」
3. 首次同步推送本地数据库到云端
4. 其他设备登录相同 WebDAV 配置后同步即可合并数据

## 数据存储

- **本地数据库**：SQLite，存储于系统应用数据目录（Windows: `%APPDATA%\com.yuanzhi.app\yuanzhi.db`）
- **设置数据**：通过 Zustand persist 存储于浏览器 localStorage
- **同步机制**：记录级 LWW（Last-Write-Wins）合并，按 `updated_at` 时间戳取最新值，支持软删除传播

## License

MIT
