import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowLeft, ArrowUpLeft, Bell, BriefcaseBusiness, Check, CheckCheck, ChevronDown,
  CircleHelp, ClipboardList, Clock3, FolderKanban, Layers3, LayoutDashboard,
  Menu, MessageCircle, MessageSquareText, MoreHorizontal, Plus, Search, Send, Settings2,
  ShieldCheck, Sparkles, Users, Video, X
} from 'lucide-react'
import { agents, agentForText, createId, exampleTasks, relativeTime } from './data'
import OfficeFloor from './OfficeFloor'
import type { Agent, AgentId, Message, Task, TaskState } from './data'

type View = 'office' | 'tasks' | 'meeting'
type Drawer = { kind: 'manager' } | { kind: 'agent'; id: AgentId } | null
type Project = { id: string; name: string }
const defaultProjects: Project[] = [{ id: 'demo', name: 'المشروع التجريبي' }]
const managerFirst: Message = { id: 'hello', from: 'agent', at: 0, text: 'أهلًا! أنا سند، مدير فريقك الذكي. اكتب المهمة التي تريدها، وسأوجّهها للقسم المناسب داخل هذه النسخة التجريبية.' }
const safeRead = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
const safeWrite = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Private browsing or file URL */ } }
const timeNow = () => new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })

function Scene({ agent }: { agent: Agent }) {
  return <div className={`agent-scene scene-${agent.id}`} style={{ '--agent-color': agent.color } as React.CSSProperties} aria-hidden="true">
    <div className="scene-stars"><i/><i/><i/></div>
    <div className="scene-bloom"/>
    <div className="scene-character">{agent.emoji}</div>
    <div className="scene-desk"><span/><span/><span/></div>
    <div className="scene-special"><b/><b/><b/></div>
  </div>
}
function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'neutral' | 'success' | 'warning' | 'violet' }) {
  return <span className={`pill pill-${variant}`}>{children}</span>
}
const statusLabels: Record<TaskState, string> = { todo: 'بانتظار التنفيذ', doing: 'قيد التنفيذ', done: 'مكتملة' }
function Avatar({ agent, small = false }: { agent: Agent; small?: boolean }) {
  return <span className={`avatar ${small ? 'avatar-small' : ''}`} style={{ '--agent-color': agent.color } as React.CSSProperties}>{agent.emoji}</span>
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => safeRead('moqarr-projects', defaultProjects))
  const [projectId, setProjectId] = useState(() => safeRead('moqarr-project-id', 'demo'))
  const [tasks, setTasks] = useState<Task[]>(() => safeRead('moqarr-tasks', exampleTasks.map(t => ({ ...t, projectId: 'demo' }))))
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => safeRead('moqarr-chats', { 'demo:manager': [managerFirst] }))
  const [meetingTopics, setMeetingTopics] = useState<Record<string, string[]>>(() => safeRead('moqarr-meetings', { demo: ['مراجعة أولية للمهام والأولويات'] }))
  const [view, setView] = useState<View>('office')
  const [drawer, setDrawer] = useState<Drawer>(null)
  const [sideOpen, setSideOpen] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [newProject, setNewProject] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [draft, setDraft] = useState('')
  const [newTaskDraft, setNewTaskDraft] = useState('')
  const [meetingDraft, setMeetingDraft] = useState('')
  const [agentTab, setAgentTab] = useState<'chat' | 'tasks'>('chat')
  const [search, setSearch] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const project = projects.find(p => p.id === projectId) || projects[0]
  const visibleTasks = tasks.filter(t => (t as Task & { projectId?: string }).projectId === projectId || (projectId === 'demo' && !(t as Task & { projectId?: string }).projectId))
  const completed = visibleTasks.filter(t => t.state === 'done').length
  const active = visibleTasks.filter(t => t.state === 'doing').length
  const pending = visibleTasks.filter(t => t.state === 'todo').length
  const filteredAgents = agents.filter(a => `${a.name} ${a.subtitle}`.includes(search.trim()))
  const selectedAgent = drawer?.kind === 'agent' ? agents.find(a => a.id === drawer.id) : undefined
  const chatKey = drawer?.kind === 'agent' ? `${projectId}:${drawer.id}` : `${projectId}:manager`
  const chat = messages[chatKey] || (drawer?.kind === 'manager' ? [managerFirst] : selectedAgent ? [{ id: 'intro', from: 'agent', at: 0, text: `مرحبًا، أنا المسؤول عن قسم ${selectedAgent.name}. ${selectedAgent.skill} هذه واجهة محادثة تجريبية، وما زالت غير متصلة بنموذج ذكاء اصطناعي.` } as Message] : [])
  const groupedTasks = useMemo(() => ({
    todo: visibleTasks.filter(t => t.state === 'todo'),
    doing: visibleTasks.filter(t => t.state === 'doing'),
    done: visibleTasks.filter(t => t.state === 'done')
  }), [tasks, projectId])

  useEffect(() => { safeWrite('moqarr-projects', projects) }, [projects])
  useEffect(() => { safeWrite('moqarr-project-id', projectId) }, [projectId])
  useEffect(() => { safeWrite('moqarr-tasks', tasks) }, [tasks])
  useEffect(() => { safeWrite('moqarr-chats', messages) }, [messages])
  useEffect(() => { safeWrite('moqarr-meetings', meetingTopics) }, [meetingTopics])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [chat.length, drawer])

  const openAgent = (id: AgentId) => { setDrawer({ kind: 'agent', id }); setAgentTab('chat'); setDraft('') }
  const openManager = () => { setDrawer({ kind: 'manager' }); setDraft('') }
  const navigate = (target: View) => { setView(target); setSideOpen(false); setDrawer(null) }
  const updateTask = (id: string, state: TaskState) => setTasks(v => v.map(t => t.id === id ? { ...t, state } : t))
  const addTask = (title: string, agentId: AgentId) => {
    const task: Task & { projectId: string } = { id: createId(), title, agentId, state: 'todo', createdAt: Date.now(), projectId }
    setTasks(v => [task, ...v]); return task
  }
  const submitChat = () => {
    const text = draft.trim(); if (!text || !drawer) return
    const userMessage: Message = { id: createId(), from: 'user', text, at: Date.now() }
    let response = ''
    if (drawer.kind === 'manager') {
      const agentId = agentForText(text)
      addTask(text, agentId)
      response = `سجّلت طلبك ضمن مهام قسم «${agents.find(a => a.id === agentId)?.name}». تقدر تتابعه الآن في لوحة المهام. للتوضيح: هذا توزيع تجريبي محلي، وليس تنفيذًا حقيقيًا للكود.`
    } else {
      response = `وصلت ملاحظتك لقسم «${selectedAgent?.name}» في سجل المحادثة المحلي. تنفيذ الأوامر تلقائيًا يحتاج ربط الأيجنت بمحرك عمل فعلي.`
    }
    setMessages(old => ({ ...old, [chatKey]: [...(old[chatKey] || chat), userMessage, { id: createId(), from: 'agent', text: response, at: Date.now() }] }))
    setDraft('')
  }
  const submitProject = () => {
    const name = newProject.trim(); if (!name) return
    const id = createId(); setProjects(v => [...v, { id, name }]); setProjectId(id)
    setNewProject(''); setShowNewProject(false); setProjectOpen(false); setView('office')
  }
  const submitMeeting = () => {
    const topic = meetingDraft.trim(); if (!topic) return
    setMeetingTopics(v => ({ ...v, [projectId]: [topic, ...(v[projectId] || [])] }))
    setMeetingDraft('')
  }

  return <div className="app-shell">
    {sideOpen && <button className="mobile-backdrop" onClick={() => setSideOpen(false)} aria-label="إغلاق القائمة"/>}
    <aside className={`sidebar ${sideOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-symbol"><Layers3 size={21}/></span><div><strong>المقرّ<span className="brand-period">.</span></strong><small>مساحتك لإدارة فريق AI</small></div><button className="sidebar-close" onClick={() => setSideOpen(false)} aria-label="إغلاق"><X size={18}/></button></div>
      <div className="sidebar-label">مساحة العمل</div>
      <button className="project-picker" onClick={() => setProjectOpen(v => !v)}><span className="project-icon"><BriefcaseBusiness size={18}/></span><span className="project-content"><small>المشروع الحالي</small><strong>{project?.name || 'المشروع التجريبي'}</strong></span><ChevronDown size={16} className={projectOpen ? 'rotate' : ''}/></button>
      {projectOpen && <div className="project-menu">{projects.map(p => <button key={p.id} onClick={() => { setProjectId(p.id); setProjectOpen(false) }} className={p.id === projectId ? 'chosen' : ''}>{p.name}{p.id === projectId && <Check size={14}/>}</button>)}<button className="new-project" onClick={() => { setShowNewProject(true); setProjectOpen(false) }}><Plus size={15}/> مشروع جديد</button></div>}
      <div className="sidebar-label nav-label">التنقل</div>
      <nav className="side-nav" aria-label="التنقل الرئيسي">
        <button onClick={() => navigate('office')} className={view === 'office' ? 'active' : ''}><LayoutDashboard size={19}/> المقرّ الرئيسي <span className="nav-tiny">01</span></button>
        <button onClick={() => navigate('tasks')} className={view === 'tasks' ? 'active' : ''}><FolderKanban size={19}/> لوحة المهام {pending + active > 0 && <span className="nav-count">{pending + active}</span>}</button>
        <button onClick={() => navigate('meeting')} className={view === 'meeting' ? 'active' : ''}><Video size={19}/> غرفة الاجتماعات</button>
        <button onClick={openManager}><MessageCircle size={19}/> محادثة المدير</button>
      </nav>
      <div className="sidebar-label nav-label">الفريق الذكي <span>{agents.length} أعضاء</span></div>
      <div className="sidebar-agents">{agents.map(agent => <button onClick={() => { openAgent(agent.id); setSideOpen(false) }} key={agent.id}><span className="agent-dot" style={{ background: agent.color }}/><span>{agent.name}</span><span className="mini-live"/></button>)}</div>
      <div className="sidebar-footer"><div className="local-indicator"><span className="offline-dot"/> نسخة تجريبية محلية</div><button onClick={() => setShowHelp(true)}><CircleHelp size={17}/> عن هذه النسخة</button></div>
    </aside>

    <main className="workspace">
      <header className="topbar">
        <div className="topbar-start"><button className="mobile-menu icon-button" onClick={() => setSideOpen(true)} aria-label="فتح القائمة"><Menu size={23}/></button><span className="breadcrumb">مساحة العمل</span><span className="crumb-slash">/</span><strong>{view === 'office' ? 'المقرّ الرئيسي' : view === 'tasks' ? 'لوحة المهام' : 'غرفة الاجتماعات'}</strong></div>
        <div className="topbar-end"><span className="date-label"><Clock3 size={15}/> {timeNow()}</span><button className="top-icon" onClick={() => setShowHelp(true)} aria-label="معلومات"><Bell size={18}/><span/></button><button className="top-avatar" onClick={openManager} aria-label="افتح محادثة المدير">أنت</button></div>
      </header>
      <div className="page-content">
        {view === 'office' && <>
          <section className="welcome-head"><div><div className="eyebrow"><span className="eyebrow-line"/> غرفة التحكم الذكية</div><h1>صباح الإبداع <span className="wave">✳</span></h1><p>كل فريقك في مكان واحد. وزّع المهام، راقب التقدم، وخلّ الأفكار تتحول إلى إنجاز.</p></div><Badge variant="violet"><Sparkles size={13}/> تجربة تفاعلية</Badge></section>
          <OfficeFloor agents={agents} tasks={visibleTasks} onAgentClick={openAgent} onManagerClick={openManager} onMeetingClick={() => navigate('meeting')}/>
          <section className="stats-row"><div className="stat"><span className="stat-icon aqua"><Users size={18}/></span><div><strong>{agents.length}</strong><small>أقسام متخصصة</small></div></div><div className="stat"><span className="stat-icon amber"><Activity size={19}/></span><div><strong>{active}</strong><small>مهام قيد التنفيذ</small></div></div><div className="stat"><span className="stat-icon green"><CheckCheck size={19}/></span><div><strong>{completed}</strong><small>مهام مكتملة</small></div></div><div className="stat"><span className="stat-icon purple"><ClipboardList size={19}/></span><div><strong>{pending}</strong><small>مهام بالانتظار</small></div></div></section>
          <section className="team-section"><div className="section-header"><div><div className="eyebrow tiny">استكشف مقرّك</div><h2>مكاتب الفريق <span>✦</span></h2><p>كل مكتب له تخصصه وطابعه الخاص. اضغط للدخول إليه.</p></div><label className="search-box"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن قسم..." aria-label="ابحث عن قسم"/></label></div>
            <div className="agents-grid">{filteredAgents.map((agent, index) => {
              const agentTasks = visibleTasks.filter(t => t.agentId === agent.id)
              const doing = agentTasks.some(t => t.state === 'doing')
              return <button key={agent.id} className="agent-card" style={{ '--agent-color': agent.color, '--card-index': index } as React.CSSProperties} onClick={() => openAgent(agent.id)}><div className="room-top"><span className="room-number">مكتب {String(index + 1).padStart(2, '0')}</span><span className={`room-status ${doing ? 'status-busy' : ''}`}><span/>{doing ? 'قيد العمل' : 'جاهز'}</span></div><Scene agent={agent}/><div className="room-info"><h3>{agent.name}</h3><p>{agent.subtitle}</p><div className="room-footer"><span><span className="task-indicator"/>{agentTasks.length} مهام</span><span className="room-arrow"><ArrowUpLeft size={17}/></span></div></div></button>
            })}</div>
            {filteredAgents.length === 0 && <div className="empty-state">لا توجد أقسام بهذا الاسم.</div>}
          </section>
          <section className="bottom-grid"><div className="summary-panel"><div className="panel-title"><div><span className="panel-icon"><ClipboardList size={19}/></span><h3>آخر المهام</h3></div><button className="text-link" onClick={() => navigate('tasks')}>عرض الكل <ArrowLeft size={15}/></button></div><div className="recent-tasks">{visibleTasks.slice(0, 4).map(task => { const agent = agents.find(a => a.id === task.agentId)!; return <div className="recent-row" key={task.id}><Avatar agent={agent} small/><div className="recent-body"><strong>{task.title}</strong><small>{agent.name}</small></div><Badge variant={task.state === 'done' ? 'success' : task.state === 'doing' ? 'warning' : 'neutral'}>{statusLabels[task.state]}</Badge></div> })}{!visibleTasks.length && <div className="empty-state">لا توجد مهام بعد. أرسل أول مهمة إلى سند.</div>}</div></div><button className="meeting-teaser" onClick={() => navigate('meeting')}><div className="meeting-visual"><span>💬</span><span>🧠</span><span>💻</span></div><div className="meeting-copy"><span className="eyebrow tiny">نقطة الالتقاء</span><h3>غرفة الاجتماعات</h3><p>مكان واحد لمناقشة الأفكار وتجميع ملاحظات الفريق.</p><strong>ادخل الغرفة <ArrowLeft size={16}/></strong></div></button></section>
        </>}

        {view === 'tasks' && <section className="other-view"><div className="view-header"><div className="eyebrow">نظرة واضحة على كل شيء</div><h1>لوحة المهام</h1><p>اسحب العمل للأمام من خلال زر الحالة. جميع التغييرات تُحفظ في هذا المتصفح فقط.</p></div><div className="kanban-grid">{(['todo', 'doing', 'done'] as TaskState[]).map(state => <div className={`kanban-col col-${state}`} key={state}><div className="kanban-title"><span className="kanban-dot"/><h3>{statusLabels[state]}</h3><span className="kanban-count">{groupedTasks[state].length}</span></div><div className="kanban-items">{groupedTasks[state].map(task => { const agent = agents.find(a => a.id === task.agentId)!; return <div key={task.id} className="kanban-card"><p>{task.title}</p><div className="kanban-card-bottom"><button className="kanban-agent" onClick={() => openAgent(agent.id)}><Avatar agent={agent} small/>{agent.name}</button>{state === 'todo' ? <button className="mini-action" onClick={() => updateTask(task.id, 'doing')}>بدء <ArrowLeft size={13}/></button> : state === 'doing' ? <button className="mini-action" onClick={() => updateTask(task.id, 'done')}>إنهاء <Check size={14}/></button> : <span className="finish-mark"><CheckCheck size={17}/></span>}</div></div> })}{groupedTasks[state].length === 0 && <div className="kanban-empty">لا توجد مهام</div>}</div></div>)}</div><div className="quick-task"><div><strong>إضافة مهمة مباشرة</strong><small>اختَر القسم ثم أضف مهمة جديدة من داخل مكتبه، أو اكتب إلى سند ليسندها تلقائيًا بشكل تجريبي.</small></div><button className="primary-action" onClick={openManager}>تحدث مع سند <ArrowLeft size={16}/></button></div></section>}

        {view === 'meeting' && <section className="other-view meeting-view"><div className="view-header"><div className="eyebrow">فكرة واحدة، فريق كامل</div><h1>غرفة الاجتماعات</h1><p>سجلّ للاجتماعات والأفكار. مشاركة الأيجنتات في النقاش ستصبح فعلية بعد ربط المحرك.</p></div><div className="meeting-stage"><div className="meeting-stage-top"><span className="room-status"><span/> غرفة مفتوحة</span><Badge variant="violet">وضع العرض</Badge></div><div className="meeting-table"><div className="table-body"><span>✦</span><strong>فكرتك تبدأ من هنا</strong><small>نظّم النقاش، ثم وزّع المهام</small></div>{agents.map((agent, i) => <div key={agent.id} className={`meeting-seat seat-${i + 1}`}><span style={{ '--agent-color': agent.color } as React.CSSProperties}>{agent.emoji}</span></div>)}</div><div className="meeting-host"><span>✦</span><div><strong>سند</strong><small>مدير الجلسة</small></div></div></div><div className="meeting-notes"><h3>جدول النقاش</h3><p>أضف موضوعًا ليبقى محفوظًا في مشروعك.</p><form onSubmit={e => { e.preventDefault(); submitMeeting() }} className="meeting-entry"><input value={meetingDraft} onChange={e => setMeetingDraft(e.target.value)} placeholder="مثلاً: مناقشة إطلاق نسخة تجريبية"/><button type="submit" disabled={!meetingDraft.trim()}><Plus size={17}/> إضافة</button></form><div className="meeting-list">{(meetingTopics[projectId] || []).map((topic, i) => <div key={`${topic}-${i}`}><span>{i + 1}</span><strong>{topic}</strong><Check size={15}/></div>)}{!(meetingTopics[projectId] || []).length && <p className="empty-state">لم تُضف موضوعات بعد.</p>}</div></div></section>}
      </div>
      <button className="float-manager" onClick={openManager}><span className="float-symbol">✦</span><span>اسأل سند</span><MessageSquareText size={17}/></button>
    </main>

    {drawer && <div className="drawer-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setDrawer(null) }}><aside className="drawer"><div className="drawer-head"><button className="drawer-close" onClick={() => setDrawer(null)} aria-label="إغلاق المحادثة"><X size={21}/></button><div className="drawer-head-avatar" style={{ '--agent-color': selectedAgent?.color || '#c0adff' } as React.CSSProperties}>{selectedAgent ? selectedAgent.emoji : '✦'}</div><div className="drawer-head-info"><strong>{selectedAgent?.name || 'سند · المدير الذكي'}</strong><small><span className="green-light"/> {selectedAgent?.role || 'مدير الفريق'} · نسخة تجريبية</small></div><MoreHorizontal size={20} className="drawer-more"/></div>
      {selectedAgent && <div className="drawer-tabs"><button className={agentTab === 'chat' ? 'active' : ''} onClick={() => setAgentTab('chat')}>المحادثة</button><button className={agentTab === 'tasks' ? 'active' : ''} onClick={() => setAgentTab('tasks')}>المهام</button></div>}
      {agentTab === 'chat' || !selectedAgent ? <><div className="chat-scroll" ref={scrollRef}><div className="chat-day">هذه نسخة عرض تفاعلية</div>{chat.map(message => <div className={`chat-msg ${message.from === 'user' ? 'from-user' : 'from-agent'}`} key={message.id}>{message.from === 'agent' && <span className="msg-avatar">{selectedAgent ? selectedAgent.emoji : '✦'}</span>}<div className="chat-bubble">{message.text}<small>{relativeTime(message.at)}</small></div></div>)}<div className="chat-info"><ShieldCheck size={16}/> الرسائل تُحفظ محليًا على هذا الجهاز، ولا تُرسل إلى خادم.</div></div><form className="chat-composer" onSubmit={e => { e.preventDefault(); submitChat() }}><div className="composer-suggestions">{!selectedAgent && <><button type="button" onClick={() => setDraft('صمّم واجهة لوحة التحكم')}>تصميم واجهة</button><button type="button" onClick={() => setDraft('اختبر شاشة تسجيل الدخول')}>اختبار تطبيق</button><button type="button" onClick={() => setDraft('اكتب منشورًا للينكدإن')}>منشور لينكدإن</button></>}</div><div className="compose-field"><textarea rows={2} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitChat() } }} placeholder={selectedAgent ? `اكتب رسالة لقسم ${selectedAgent.name}...` : 'وش تحب تنجز اليوم؟'} /><button aria-label="إرسال الرسالة" type="submit" disabled={!draft.trim()}><Send size={18}/></button></div><small className="composer-disclaimer">وضع تجريبي: تنظيم محلي للمهام دون تشغيل أيجنتات فعلية.</small></form></> : <div className="drawer-task-list"><h3>مهام القسم</h3><p>{selectedAgent.skill}</p>{visibleTasks.filter(t => t.agentId === selectedAgent.id).map(t => <div className="drawer-task" key={t.id}><span>{t.title}</span><Badge variant={t.state === 'done' ? 'success' : t.state === 'doing' ? 'warning' : 'neutral'}>{statusLabels[t.state]}</Badge></div>)}<form onSubmit={e => { e.preventDefault(); if (newTaskDraft.trim()) { addTask(newTaskDraft.trim(), selectedAgent.id); setNewTaskDraft('') } }}><input value={newTaskDraft} onChange={e => setNewTaskDraft(e.target.value)} placeholder="أضف مهمة لهذا القسم"/><button type="submit" disabled={!newTaskDraft.trim()}><Plus size={16}/> إضافة</button></form></div>}
    </aside></div>}

    {showNewProject && <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowNewProject(false) }}><form className="simple-modal" onSubmit={e => { e.preventDefault(); submitProject() }}><div className="modal-icon"><Plus size={22}/></div><h2>مشروع جديد</h2><p>ابدأ مساحة مستقلة للمهام والمحادثات.</p><label>اسم المشروع<input autoFocus value={newProject} onChange={e => setNewProject(e.target.value)} placeholder="مثلاً: تطبيق الحجوزات" maxLength={60}/></label><div className="modal-actions"><button type="button" onClick={() => setShowNewProject(false)}>إلغاء</button><button type="submit" disabled={!newProject.trim()}>إنشاء المشروع</button></div></form></div>}
    {showHelp && <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowHelp(false) }}><div className="simple-modal"><div className="modal-icon"><Settings2 size={22}/></div><h2>عن هذه النسخة</h2><p>هذه واجهة أولية تفاعلية للمقرّ، بُنيت باستخدام React وTypeScript. يمكنك إضافة مشاريع ومهام، تغيير حالتها، والتواصل مع سند والأقسام في وضع محاكاة.</p><p>البيانات محفوظة في متصفحك عبر localStorage. لا يوجد حاليًا تسجيل دخول أو مزامنة بين الأجهزة أو تشغيل فعلي لأيجنتات البرمجة أو نشر على TestFlight أو مواقع التواصل.</p><div className="modal-actions"><button onClick={() => setShowHelp(false)}>فهمت</button></div></div></div>}
  </div>
}
