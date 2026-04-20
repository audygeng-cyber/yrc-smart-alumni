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
} as const

/** โทน typography/spacing กลาง เพื่อใช้ซ้ำในหน้าใหม่ */
export const themeLayout = {
  pageStack: 'space-y-6 md:space-y-8',
  sectionCard: 'rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:p-6',
  sectionTitle: 'text-sm font-medium uppercase tracking-wide text-fuchsia-200/90',
  sectionSubtitle: 'mt-2 text-sm leading-relaxed text-slate-400',
  proseBody: 'text-sm leading-relaxed text-slate-300',
} as const
