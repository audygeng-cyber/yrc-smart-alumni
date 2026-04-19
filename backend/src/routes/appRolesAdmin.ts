import { Router } from 'express'
import { getServiceSupabase } from '../lib/supabase.js'

export const appRolesAdminRouter = Router()

const MANAGED = ['committee', 'payment_approver'] as const

type ManagedRole = (typeof MANAGED)[number]

/**
 * PATCH /app-roles/:memberId
 * body: { committee?: boolean, payment_approver?: boolean } — กำหนดว่าสมาชิกคนใดเป็นกรรมการ และผู้มีอำนาจอนุมัติคำขอจ่าย (ยอดเข้าประชุม)
 */
appRolesAdminRouter.patch('/app-roles/:memberId', async (req, res) => {
  try {
    const memberId = typeof req.params.memberId === 'string' ? req.params.memberId.trim() : ''
    if (!memberId) {
      res.status(400).json({ error: 'ต้องระบุ memberId' })
      return
    }

    const body = req.body as Record<string, unknown>
    const patch: Partial<Record<ManagedRole, boolean>> = {}
    for (const role of MANAGED) {
      if (role in body) {
        const v = body[role]
        if (typeof v !== 'boolean') {
          res.status(400).json({ error: `ค่า ${role} ต้องเป็น boolean` })
          return
        }
        patch[role] = v
      }
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'ต้องส่ง committee หรือ payment_approver อย่างน้อยหนึ่งค่า' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: member, error: mErr } = await supabase
      .from('members')
      .select('id,line_uid,first_name,last_name')
      .eq('id', memberId)
      .maybeSingle()
    if (mErr || !member) {
      res.status(mErr ? 500 : 404).json({ error: mErr ? 'โหลดสมาชิกไม่สำเร็จ' : 'ไม่พบสมาชิก', details: mErr })
      return
    }
    const lineUid = typeof member.line_uid === 'string' ? member.line_uid.trim() : ''
    if (!lineUid) {
      res.status(400).json({ error: 'สมาชิกยังไม่มี LINE UID — ผูก LINE ก่อนจึงจะกำหนดบทบาทได้' })
      return
    }

    const { data: appUser, error: uErr } = await supabase
      .from('app_users')
      .select('id')
      .eq('line_uid', lineUid)
      .maybeSingle()
    if (uErr) {
      res.status(500).json({ error: 'ค้นหา app_users ไม่สำเร็จ', details: uErr })
      return
    }
    if (!appUser?.id) {
      res.status(400).json({
        error: 'ยังไม่มีแถว app_users สำหรับ LINE นี้ — ให้สมาชิกเปิดแอป/ซิงก์ app-roles อย่างน้อยหนึ่งครั้งก่อน',
      })
      return
    }

    const userId = appUser.id as string
    const grantedBy = typeof body.granted_by === 'string' && body.granted_by.trim() ? body.granted_by.trim() : 'admin'

    for (const role of MANAGED) {
      if (!(role in patch)) continue
      const want = patch[role]
      if (want) {
        const { error: insErr } = await supabase
          .from('app_user_roles')
          .insert({ user_id: userId, role_code: role, granted_by: grantedBy })
        const code = insErr ? (insErr as { code?: string }).code : undefined
        if (insErr && code !== '23505') {
          res.status(500).json({ error: `บันทึกบทบาท ${role} ไม่สำเร็จ`, details: insErr })
          return
        }
        if (code === '23505') {
          const { error: upErr } = await supabase
            .from('app_user_roles')
            .update({ granted_by: grantedBy })
            .eq('user_id', userId)
            .eq('role_code', role)
          if (upErr) {
            res.status(500).json({ error: `อัปเดตบทบาท ${role} ไม่สำเร็จ`, details: upErr })
            return
          }
        }
      } else {
        const { error: delErr } = await supabase.from('app_user_roles').delete().eq('user_id', userId).eq('role_code', role)
        if (delErr) {
          res.status(500).json({ error: `ลบบทบาท ${role} ไม่สำเร็จ`, details: delErr })
          return
        }
      }
    }

    const { data: rolesOut, error: rErr } = await supabase.from('app_user_roles').select('role_code').eq('user_id', userId)
    if (rErr) {
      res.status(500).json({ error: 'โหลดบทบาทหลังอัปเดตไม่สำเร็จ', details: rErr })
      return
    }

    res.json({
      ok: true,
      memberId,
      app_user_id: userId,
      roles: (rolesOut ?? []).map((r: { role_code: string }) => r.role_code),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})
