import React from 'react'
import { ArrowLeft, ArrowUpLeft, MessageCircle, Users, Sparkles } from 'lucide-react'
import type { Agent, AgentId, Task } from './data'
import './office-floor.css'

type Props = {
  agents: Agent[]
  tasks: Task[]
  liveAgents?: Record<string, {state: 'working' | 'done' | 'error' | 'idle'; activity: string; updatedAt: number}>
  onAgentClick: (id: AgentId) => void
  onManagerClick: () => void
  onMeetingClick: () => void
}
const layout: Array<AgentId | 'manager'> = [
  'design', 'frontend', 'backend',
  'qa', 'manager', 'security',
  'devops', 'review', 'social'
]
const roomProps: Record<AgentId, { equipment: string; extra: string; number: string }> = {
  design: { equipment: '🎨', extra: '✦', number: '01' },
  frontend: { equipment: '⌨️', extra: '</>', number: '02' },
  backend: { equipment: '🗄️', extra: '{ }', number: '03' },
  qa: { equipment: '🧪', extra: '✓', number: '04' },
  security: { equipment: '🛡️', extra: '✧', number: '05' },
  devops: { equipment: '🚀', extra: '↑', number: '06' },
  review: { equipment: '🔎', extra: '✓', number: '07' },
  social: { equipment: '📸', extra: '♥', number: '08' }
}
export default function OfficeFloor({ agents, tasks, liveAgents = {}, onAgentClick, onManagerClick, onMeetingClick }: Props) {
  return <section className="floor-section" aria-label="مخطط المقر الافتراضي">
    <div className="floor-heading">
      <div>
        <span className="floor-eyebrow"><span className="floor-live"/> تجربة تفاعلية ثنائية الأبعاد</span>
        <h2>مقرّ فريقك الذكي <span>✦</span></h2>
        <p>تجوّل بين المكاتب واضغط على أي غرفة لفتح المحادثة والمهام.</p>
      </div>
      <span className="floor-demo"><Sparkles size={14}/> محاكاة تجريبية</span>
    </div>
    <div className="floor-building" dir="rtl">
      <div className="floor-building-top"><span className="floor-building-brand">✦ المقرّ</span><span className="floor-building-name">الطابق 01 — مساحة الفريق</span><span className="floor-building-led"><i/> النظام متاح</span></div>
      <div className="floor-rooms">
        {layout.map(id => {
          if (id === 'manager') return <button type="button" key="manager" className="floor-room floor-room-manager" onClick={onManagerClick} aria-label="دخول مكتب سند المدير">
            <span className="floor-room-heading"><strong>مكتب المدير — سند</strong><span className="floor-room-dots"><i/><i/><i/></span></span>
            <span className="floor-room-inside floor-manager-inside">
              <span className="floor-manager-halo"/>
              <span className="floor-manager-avatar">✦<span className="floor-avatar-shadow"/></span>
              <span className="floor-manager-desk"><span>🖥️</span><span>📋</span></span>
              <span className="floor-manager-spark one">✧</span><span className="floor-manager-spark two">✧</span>
            </span>
            <span className="floor-room-bottom"><span className="floor-room-online"><i/> اضغط للتحدث مع سند</span><MessageCircle size={15}/></span>
          </button>
          const agent = agents.find(a => a.id === id)
          if (!agent) return null
          const activeTasks = tasks.filter(t => t.agentId === id && t.state === 'doing')
          const equipment = roomProps[id]
          const observed = liveAgents[id]
          const observedWorking = observed?.state === 'working' && Date.now() - observed.updatedAt < 180_000
          return <button type="button" key={id} className={'floor-room floor-room-' + id + (observedWorking ? ' floor-room-is-live' : '')} onClick={() => onAgentClick(id)} style={{ '--floor-accent': agent.color } as React.CSSProperties} aria-label={'دخول غرفة ' + agent.name}>
            <span className="floor-room-heading"><strong>{agent.name}</strong><span className="floor-room-number">{equipment.number}</span></span>
            <span className="floor-room-inside">
              <span className="floor-room-rug"/>
              <span className="floor-room-shelf"><i/><i/><i/></span>
              <span className="floor-room-plant">🌿</span>
              <span className="floor-room-display">{equipment.extra}</span>
              <span className="floor-room-table"><span>{equipment.equipment}</span></span>
              <span className="floor-agent"><span className="floor-agent-face">{agent.emoji}</span><span className="floor-agent-body"/><span className="floor-agent-shadow"/></span>
              <span className="floor-room-door"/>
            </span>
            <span className="floor-room-bottom"><span className="floor-room-online"><i/>{observedWorking ? observed.activity : activeTasks.length ? 'مهمة تجريبية' : 'متاح للمحادثة'}</span><ArrowUpLeft size={15}/></span>
          </button>
        })}
      </div>
      <div className="floor-corridor"><span className="floor-corridor-line"/><span>الممر الرئيسي • تواصل مع الفريق من هنا</span><span className="floor-corridor-line"/></div>
      <button type="button" className="floor-meeting" onClick={onMeetingClick}>
        <span className="floor-meeting-icon">💬</span><span className="floor-meeting-text"><strong>غرفة الاجتماعات</strong><small>اجتمع بسند والأقسام الثمانية</small></span><span className="floor-meeting-people">🎨 💻 🛡️ 📣</span><ArrowLeft size={17}/>
      </button>
    </div>
    <p className="floor-caption"><Users size={14}/> كل المكاتب والمحادثات في هذه المرحلة تجريبية، والأيجنتات لا تعمل فعليًا بعد.</p>
  </section>
}
