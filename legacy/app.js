const STORAGE_KEY = 'yuanzhi-data-v1';
const seed = { tasks: [
  { id: 1, title: '完成产品需求文档', priority: '高', due: '今天 18:00', pomodoros: 4, target: 8, done: false },
  { id: 2, title: '准备周会演示 PPT', priority: '高', due: '今天 14:00', pomodoros: 0, target: 3, done: false },
  { id: 3, title: '审阅设计稿并给出反馈', priority: '中', due: '今天 17:00', pomodoros: 0, target: 2, done: false },
  { id: 4, title: '整理用户反馈数据', priority: '中', due: '今天 23:59', pomodoros: 0, target: 4, done: false },
  { id: 5, title: '更新项目文档', priority: '低', due: '今天 23:59', pomodoros: 0, target: 2, done: false }
], focusSeconds: 0, focusToday: 204 * 60, boundTaskId: 1 };
let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || seed;
let timer = null, remaining = 25 * 60, running = false;
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
const today = () => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
const icon = { home:'⌘', pomodoro:'◴', todos:'☑', notes:'▱', money:'▣', plan:'▦' };

function shell(active, title, badge, content) {
  document.body.innerHTML = `<div class="app"><aside class="sidebar"><a class="brand" href="#/home"><div class="brandmark">⌾</div><div><b>远至</b><small>YuanZhi</small></div></a><nav class="nav">${[['home','今日概览'],['pomodoro','番茄钟'],['todos','待办事项'],['notes','便签'],['money','记账'],['plan','计划']].map(([key,label]) => `<a href="#/${key}" class="${active === key ? 'active' : ''}"><span>${icon[key]}</span><span>${label}</span></a>`).join('')}</nav><div class="focus"><p>ϟ　今日专注</p><strong>${Math.floor(data.focusToday / 3600)}<span> h ${Math.floor(data.focusToday % 3600 / 60)}m</span></strong><div class="bar"><i></i></div></div></aside><main class="main"><header class="top"><div class="heading"><h1>${title}</h1>${badge ? `<span class="badge">${badge}</span>` : ''}</div><div class="tools"><button class="tool" title="搜索">⌕</button><button class="tool" title="通知">♧</button><button class="tool" title="设置" onclick="exportData()">⚙</button><span class="separator"></span><div class="avatar">张</div></div></header>${content}</main></div>`;
}

function renderHome() {
  const completed = data.tasks.filter(t => t.done).length;
  const tasks = data.tasks.length;
  shell('home', '首页', today(), `<div class="content"><div class="stats"><div class="card stat"><div class="icon">☷</div><div><p>待办进度</p><strong>${completed}<em>/${tasks}</em></strong><p>已完成 ${tasks ? Math.round(completed / tasks * 100) : 0}%</p></div></div><div class="card stat"><div class="icon">▦</div><div><p>本周计划</p><strong>${data.tasks.filter(t => !t.done).length}<em> 项待办</em></strong><p>完成产品需求文档 · 今天截止</p></div></div><div class="card stat"><div class="icon">◴</div><div><p>今日专注</p><strong>${Math.floor(data.focusToday / 3600)}<em> h ${Math.floor(data.focusToday % 3600 / 60)}m</em></strong><p>累计完成 ${data.tasks.reduce((n,t) => n + t.pomodoros, 0)} 个番茄</p></div></div></div><div class="home-grid"><section class="card timer-card"><div class="title-line"><h2 class="card-title">番茄钟</h2><a class="link" href="#/pomodoro">开始专注</a></div><div class="timer-circle"><div class="timer-inner"><strong>25:00</strong><span>专注时间</span></div></div><div class="task-bind"><span class="doc">▤</span><div><b>${boundTask().title}</b><span>第 ${boundTask().pomodoros + 1}/${boundTask().target} 个番茄</span></div></div></section><section class="card timeline"><div class="timeline-header"><h2 class="card-title">今日时间轴</h2><a class="link" href="#/todos">查看待办</a></div>${[['08:00','晨间回顾 & 规划','已完成'],['09:00','产品需求文档撰写','进行中'],['12:00','午餐 & 休息','12:00 - 13:30'],['14:00','团队周会','14:00 - 15:00'],['16:00','UI 设计稿评审','16:00 - 17:00']].map(x => `<div class="event"><time>${x[0]}</time><i class="dot"></i><div class="event-box"><b>${x[1]}</b><span>${x[2]}</span></div></div>`).join('')}</section></div></div>`);
}

function todoCard(t) {
  const cls = t.priority === '中' ? 'mid' : t.priority === '低' ? 'low' : '';
  return `<article class="todo ${t.done ? 'done' : ''}" data-id="${t.id}" style="--priority:${t.priority === '高' ? '#ff6370' : t.priority === '中' ? '#ffb80e' : '#cad5e2'}"><button aria-label="完成任务" class="check" onclick="toggleTask(${t.id})">${t.done ? '✓' : ''}</button><div class="todo-main"><div class="todo-title">${escapeHtml(t.title)}<span class="prio ${cls}">${t.priority}</span></div><div class="meta">▣　${t.due}　　◴　${t.pomodoros}/${t.target} 番茄　　<span class="tag">● 工作项目</span></div></div><button class="more" aria-label="删除任务" onclick="removeTask(${t.id})">×</button></article>`;
}
function renderTodos() {
  shell('todos', '待办事项', `共 ${data.tasks.length} 项任务`, `<section class="todos-content"><div class="tabs"><button class="tab active">今天 <span>${data.tasks.filter(t => !t.done).length}</span></button><button class="tab">即将到来 <span>0</span></button><button class="tab">已完成 <span>${data.tasks.filter(t => t.done).length}</span></button></div><div class="task-list"><div id="active-tasks">${data.tasks.filter(t => !t.done).map(todoCard).join('') || empty('没有待办，享受片刻清闲。')}</div><p class="section-label">已完成 · 今天</p><div id="done-tasks">${data.tasks.filter(t => t.done).map(todoCard).join('') || empty('尚未完成任务。')}</div></div><form class="addbar" onsubmit="addTask(event)"><span class="add-icon">+</span><input name="title" required maxlength="60" placeholder="快速添加新任务…"><select name="priority" aria-label="优先级"><option>低</option><option>中</option><option>高</option></select><button class="add">添加</button></form></section>`);
}
function empty(message) { return `<p class="empty">${message}</p>`; }
function addTask(event) { event.preventDefault(); const form = event.currentTarget, fd = new FormData(form); data.tasks.unshift({ id: Date.now(), title: fd.get('title').trim(), priority: fd.get('priority'), due: '今天 23:59', pomodoros: 0, target: 1, done: false }); save(); renderTodos(); }
function toggleTask(id) { const task = data.tasks.find(t => t.id === id); task.done = !task.done; save(); renderTodos(); }
function removeTask(id) { if (!confirm('删除这项待办？')) return; data.tasks = data.tasks.filter(t => t.id !== id); save(); renderTodos(); }

function boundTask() { return data.tasks.find(t => t.id === data.boundTaskId) || data.tasks.find(t => !t.done) || data.tasks[0]; }
function formatTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function renderPomodoro() {
  const bound = boundTask();
  shell('pomodoro', '番茄钟', running ? '专注中' : '专注模式', `<div class="content"><div class="pom-layout"><section><div class="card pom-main"><div class="timer-circle pom-circle"><div class="timer-inner"><strong id="clock">${formatTime(remaining)}</strong><span>${running ? '正在专注' : '专注时间'}</span></div></div><div class="controls"><button class="round" title="重置" onclick="resetTimer()">↻</button><button class="round play" id="play" title="开始或暂停" onclick="toggleTimer()">${running ? 'Ⅱ' : '▷'}</button><button class="round" title="结束本轮" onclick="completePomodoro()">✓</button></div><div class="task-bind bound-large"><span class="doc">▤</span><div><b>${escapeHtml(bound.title)}</b><span>预计 ${bound.target} 个番茄 · 已完成 ${bound.pomodoros} 个</span></div><button class="link" onclick="document.querySelector('.pom-side').scrollIntoView({behavior:'smooth'})">切换</button></div></div></section><aside class="pom-side"><h2 class="side-title">快速绑定任务</h2>${data.tasks.filter(t => !t.done).map(t => `<button class="bind-option ${t.id === bound.id ? 'active' : ''}" onclick="bindTask(${t.id})"><b>${escapeHtml(t.title)}</b><span>${t.pomodoros}/${t.target} 番茄 · ${t.priority}优先</span></button>`).join('') || empty('先创建一项待办。')}<div class="record"><h2 class="side-title">今日记录</h2><div class="record-item"><i>✓</i><div><b>已专注 ${Math.floor(data.focusToday / 60)} 分钟</b><span>所有完成的专注时段都会自动累计</span></div></div></div></aside></div></div>`);
}
function bindTask(id) { data.boundTaskId = id; save(); renderPomodoro(); }
function updateClock() { const el = document.getElementById('clock'); if (el) el.textContent = formatTime(remaining); }
function toggleTimer() { running = !running; const button = document.getElementById('play'); if (running) { timer = setInterval(() => { remaining--; data.focusSeconds++; data.focusToday++; updateClock(); if (!remaining) completePomodoro(); }, 1000); button.textContent = 'Ⅱ'; } else { clearInterval(timer); button.textContent = '▷'; } }
function resetTimer() { clearInterval(timer); running = false; remaining = 25 * 60; updateClock(); document.getElementById('play').textContent = '▷'; }
function completePomodoro() { clearInterval(timer); running = false; const task = boundTask(); if (task) task.pomodoros = Math.min(task.target, task.pomodoros + 1); data.focusToday += Math.max(0, 25 * 60 - remaining); remaining = 25 * 60; save(); renderPomodoro(); }

function renderPlaceholder(key, title) { shell(key, title, '开发中', `<div class="content"><section class="card placeholder"><span>◌</span><h2>${title}即将推出</h2><p>当前版本聚焦日程、待办与番茄钟。此模块已预留在同一应用中。</p><a class="add" href="#/home">回到首页</a></section></div>`); }
function exportData() { const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: 'yuanzhi-backup.json' }); a.click(); URL.revokeObjectURL(a.href); }
function escapeHtml(s) { const e = document.createElement('div'); e.textContent = s; return e.innerHTML; }
function route() { const page = location.hash.slice(2) || 'home'; if (page === 'todos') return renderTodos(); if (page === 'pomodoro') return renderPomodoro(); if (page === 'home') return renderHome(); return renderPlaceholder(page, { notes:'便签', money:'记账', plan:'计划' }[page] || '页面'); }
window.addEventListener('hashchange', route); route();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
