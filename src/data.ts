export type AgentId = 'design' | 'frontend' | 'backend' | 'qa' | 'security' | 'devops' | 'review' | 'social'
export type TaskState = 'todo' | 'doing' | 'done'
export type Agent = { id: AgentId; name: string; subtitle: string; emoji: string; color: string; role: string; skill: string; }
export type Task = { id: string; title: string; agentId: AgentId; state: TaskState; createdAt: number; }
export type Message = { id: string; from: 'user' | 'agent'; text: string; at: number }

export const agents: Agent[] = [
  { id: 'design', name: 'التصميم', subtitle: 'تجربة المستخدم والهوية', emoji: '🎨', color: '#d9a1ff', role: 'مصمم التجربة', skill: 'يرسم الواجهات ويخطط لتجربة الاستخدام.' },
  { id: 'frontend', name: 'واجهة المستخدم', subtitle: 'التطبيقات والمواقع', emoji: '💻', color: '#71d9ec', role: 'مطور الواجهات', skill: 'يبني الصفحات والتفاعلات ويهتم بالتجاوب.' },
  { id: 'backend', name: 'الخدمات وقواعد البيانات', subtitle: 'الخوادم والواجهات البرمجية', emoji: '🗄️', color: '#b9adff', role: 'مهندس الأنظمة', skill: 'يطور الخدمات وواجهات API وقواعد البيانات.' },
  { id: 'qa', name: 'الاختبار والجودة', subtitle: 'تجارب واختبارات دقيقة', emoji: '🧪', color: '#ffd68f', role: 'مختبر الجودة', skill: 'يكتب الاختبارات ويتحقق من السيناريوهات.' },
  { id: 'security', name: 'الأمن السيبراني', subtitle: 'حماية وفحص الثغرات', emoji: '🛡️', color: '#91edb6', role: 'محلل الأمان', skill: 'يراجع الصلاحيات والإعدادات والثغرات المحتملة.' },
  { id: 'devops', name: 'النشر والتشغيل', subtitle: 'الإصدارات والبنية التحتية', emoji: '🚀', color: '#ffb7a2', role: 'مهندس النشر', skill: 'يجهز خطوط البناء والإطلاق ومراقبة التشغيل.' },
  { id: 'review', name: 'مراجعة الأكواد', subtitle: 'تحسين الكود والتحقق منه', emoji: '🔎', color: '#a9bbff', role: 'مراجع الكود', skill: 'يراجع التغييرات وجودة التنفيذ والمعايير.' },
  { id: 'social', name: 'الإعلام والتسويق الرقمي', subtitle: 'المحتوى والمنصات', emoji: '📣', color: '#ff9ecb', role: 'صانع المحتوى', skill: 'يعد منشورات إكس ولينكدإن ومحتوى الريلز.' }
]
export const exampleTasks: Task[] = [
  { id: 'seed-1', title: 'رسم تصور لواجهة تسجيل الدخول', agentId: 'design', state: 'done', createdAt: 1 },
  { id: 'seed-2', title: 'بناء مكونات لوحة التحكم', agentId: 'frontend', state: 'doing', createdAt: 2 },
  { id: 'seed-3', title: 'تصميم بنية البيانات الأولية', agentId: 'backend', state: 'todo', createdAt: 3 },
  { id: 'seed-4', title: 'إعداد خطة اختبارات الواجهة', agentId: 'qa', state: 'todo', createdAt: 4 },
  { id: 'seed-5', title: 'كتابة إعلان إطلاق تجريبي', agentId: 'social', state: 'todo', createdAt: 5 }
]
export const agentForText = (text: string): AgentId => {
  const t = text.toLowerCase()
  if (/تصميم|ألوان|هوية|ux|ui|شكل|figma/.test(t)) return 'design'
  if (/قاعدة|البيانات|خادم|سيرفر|api|backend|باك/.test(t)) return 'backend'
  if (/اختبار|جودة|bug|خلل|تست/.test(t)) return 'qa'
  if (/أمن|حماية|ثغر|اختراق|security/.test(t)) return 'security'
  if (/نشر|رفع|testflight|تيست فلايت|استضافة|devops/.test(t)) return 'devops'
  if (/مراجعة|كود|تنظيف|refactor/.test(t)) return 'review'
  if (/تغريد|تويتر|اكس|إكس|لينكد|انست|ريلز|محتوى|تسويق|منشور/.test(t)) return 'social'
  return 'frontend'
}
export const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
export const relativeTime = (at: number) => at <= 5 ? 'تجريبي' : new Date(at).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})
