/**
 * ชื่อคลาสเดียวกับ `index.css` (`.tap-target`) — เป้าแตะขั้นต่ำ ~44px สูง + `touch-manipulation`
 * ใช้คู่กับ `themeAccent.focusRing` ใน shell หรือ `portalFocusRing` ในพอร์ทัล
 */
export const themeTapTarget = 'tap-target' as const

export const themeAccent = {
  colorName: 'fuchsia',
  focusRing:
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/55 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
  /** ปุ่มหลัก — มี hover */
  buttonPrimary: 'bg-fuchsia-800 text-white hover:bg-fuchsia-700',
  /** ปุ่มเน้น — โทนสว่างกว่าเล็กน้อย */
  buttonPrimaryStrong: 'bg-fuchsia-700 text-white hover:bg-fuchsia-600',
  /** เมนูพอร์ทัล — รายการที่ active (ไม่ต้อง hover แยก) */
  navItemActive: 'bg-fuchsia-800 text-white',
  panel: 'border-fuchsia-900/40 bg-fuchsia-950/20',
  panelSoft: 'border-fuchsia-900/35 bg-fuchsia-950/15',
  text: 'text-fuchsia-200',
  textStrong: 'text-fuchsia-100',
  link: 'text-fuchsia-400 underline hover:text-fuchsia-300',
  /** ช่องกรอกข้อความ — ขอบโฟกัสสีบานเย็น อ่านง่ายบนพื้นมืด */
  formInput:
    'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition-colors focus-visible:border-fuchsia-500/75',
  /** ปุ่ม/ลิงก์แบบเบา — พื้นโปร่ง */
  buttonSoft: 'bg-fuchsia-900/50 text-fuchsia-100 hover:bg-fuchsia-800/60',
  /** ปุ่มขอบ — คู่กับปุ่มทึบสีเดียวกัน */
  buttonOutline: 'border border-fuchsia-800 text-fuchsia-200 hover:bg-fuchsia-950/30',
  /** ปุ่มขอบบนพื้นมืด — มีพื้นหลังจาง */
  buttonOutlineOnDark:
    'border border-fuchsia-800/80 bg-fuchsia-950/40 text-fuchsia-200 hover:bg-fuchsia-900/50',
  /** ชิปลิงก์ในการ์ด */
  surfaceChip: 'border border-fuchsia-900/45 bg-fuchsia-950/25 text-fuchsia-200 hover:bg-fuchsia-900/35',
} as const

/** โทน typography/spacing กลาง เพื่อใช้ซ้ำในหน้าใหม่ */
export const themeLayout = {
  pageStack: 'space-y-6 md:space-y-8',
  sectionCard: 'rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:p-6',
  sectionTitle: 'text-sm font-medium uppercase tracking-wide text-fuchsia-200/90',
  sectionSubtitle: 'mt-2 text-sm leading-relaxed text-slate-400',
  proseBody: 'text-sm leading-relaxed text-slate-300',
} as const
