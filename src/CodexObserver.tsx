import { useCallback, useEffect, useState } from 'react'
import { Activity, KeyRound, ShieldCheck, RefreshCcw, Unplug } from 'lucide-react'
import './codex-observer.css'
export type LiveAgent = { state: 'working' | 'done' | 'error' | 'idle'; activity: string; updatedAt: number }
type Snapshot = { connected: boolean; updatedAt?: number | null; agents?: Record<string, LiveAgent> }
const names: Record<string, string> = { design: 'التصميم', frontend: 'واجهة المستخدم', backend: 'الخدمات وقواعد البيانات', qa: 'الاختبار والجودة', security: 'الأمن السيبراني', devops: 'النشر والتشغيل', review: 'مراجعة الأكواد', social: 'الإعلام والتسويق الرقمي' }
const store = 'moqarr-codex-view-token'
const getSaved = () => { try { return sessionStorage.getItem(store) || '' } catch { return '' } }
export default function CodexObserver({ onUpdate }: { onUpdate: (agents: Record<string,LiveAgent>) => void }) {
  const [token, setToken] = useState(getSaved)
  const [draft, setDraft] = useState('')
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [clock, setClock] = useState(Date.now())
  const refresh = useCallback(async (key: string) => {
    if (!key) return
    setBusy(true)
    try {
      const resp = await fetch('/api/codex', { headers: { Authorization: 'Bearer ' + key }, cache: 'no-store' })
      if (resp.status === 401) throw new Error('رمز الربط غير صحيح')
      if (!resp.ok) throw new Error('تعذر قراءة حالة Codex')
      const next = await resp.json() as Snapshot
      setSnapshot(next)
      onUpdate(next.agents || {})
      setMessage('')
      setClock(Date.now())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر الاتصال')
      setSnapshot(null)
      onUpdate({})
    } finally { setBusy(false) }
  }, [onUpdate])
  useEffect(() => {
    if (!token) return
    void refresh(token)
    const tick = setInterval(() => { void refresh(token) }, 25_000)
    const time = setInterval(() => { setClock(Date.now()) }, 10_000)
    return () => { clearInterval(tick); clearInterval(time) }
  }, [token, refresh])
  const connect = () => {
    const key = draft.trim()
    if (!key) return
    try { sessionStorage.setItem(store, key) } catch {}
    setToken(key); setDraft(''); setMessage('')
  }
  const disconnect = () => {
    try { sessionStorage.removeItem(store) } catch {}
    setToken(''); setSnapshot(null); setMessage(''); onUpdate({})
  }
  const age = snapshot?.updatedAt ? Math.max(0,Math.floor((clock - snapshot.updatedAt)/1000)) : 0
  const online = Boolean(snapshot?.connected && age < 180)
  const active = Object.entries(snapshot?.agents || {}).filter(([,v]) => v.state === 'working' && clock-v.updatedAt < 180000)
  return <section className="codex-monitor" dir="rtl" aria-label="مراقبة Codex">
    <div className="codex-monitor-head"><span className="codex-monitor-logo"><Activity size={21}/></span><div><h2>مراقبة Codex <span>من الماك إلى المقر</span></h2><p>اكتب رسالتك في تطبيق Codex، وراقب تنفيذ الأيجنت من هنا.</p></div><strong className={online ? 'codex-online' : 'codex-offline'}>{online ? '● متصل' : '○ غير متصل'}</strong></div>
    {!token ? <form className="codex-monitor-form" onSubmit={e=>{e.preventDefault();connect()}}><KeyRound size={17}/><input type="password" value={draft} onChange={e=>setDraft(e.target.value)} autoComplete="off" placeholder="ألصق رمز ربط Codex" aria-label="رمز الربط"/><button type="submit" disabled={!draft.trim()}>اتصال</button></form> :
      <div className="codex-monitor-data">
        <div className="codex-monitor-controls"><span>{online ? 'آخر إشارة قبل ' + age + ' ثانية' : 'شغّل الجسر على الماك ثم افتح Codex'}</span><div><button onClick={()=>void refresh(token)} disabled={busy}><RefreshCcw size={14}/> تحديث</button><button onClick={disconnect}><Unplug size={14}/> فصل</button></div></div>
        {active.length ? <div className="codex-monitor-active">{active.map(([id,v])=><div key={id}><i/><span><b>{names[id] || 'أيجنت Codex'}</b><small>{v.activity}</small></span><em>يعمل الآن</em></div>)}</div> : <p className="codex-monitor-empty">{snapshot?.connected ? 'ما فيه مهمة نشطة الآن. اكتب أمرًا جديدًا في Codex على الماك.' : 'ننتظر أول تحديث من الجسر المحلي على الماك.'}</p>}
      </div>
    }
    {message && <p className="codex-monitor-error">{message}</p>}
    <footer><ShieldCheck size={14}/> نراقب الحالة فقط بدون رفع نص محادثاتك أو الكود. المراقبة تجريبية وقد تتأخر نحو دقيقة.</footer>
  </section>
}
