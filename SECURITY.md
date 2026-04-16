# Security — YRC Smart Alumni

## หลักการ

1. **ไม่ commit ความลับ** — `backend/.env`, `frontend/.env`, คีย์ Supabase/LINE/VAPID อยู่ใน `.gitignore`
2. **Service role** ใช้เฉพาะฝั่ง server (Cloud Run) — ห้ามใส่ใน frontend หรือใน repo สาธารณะ
3. **หมุนคีย์** ทันทีที่รั่ว (แชท, screenshot, commit ผิด)

## Production

| ที่ | การกระทำ |
|----|-----------|
| **Cloud Run** | ใส่ env ใน Console หรือ Secret Manager — ไม่ฝังใน image |
| **Vercel** | เฉพาะ `VITE_*` (public) — ไม่ใส่ service role |
| **Supabase** | RLS เปิดตาม migration — backend ใช้ service role ตามออกแบบ |

## git-secret (ทางเลือกสำหรับทีม)

ใช้เมื่อต้องการ **เก็บไฟล์ env เข้ารหัสใน Git** ให้เพื่อนร่วมทีมที่มี GPG public key ถอดรหัสได้

### ความต้องการ

- [git-secret](https://git-secret.io/installation)
- GPG key สำหรับผู้ดูแล repo

### ขั้นตอนย่อ (หลังติดตั้งเครื่องมือ)

```bash
cd /path/to/yrc-smart-alumni
git secret init
git secret tell your@email.com
# เพิ่มไฟล์ที่ต้องการเข้ารหัส (ต้องถูก gitignore อยู่แล้ว)
git secret add backend/.env
git secret hide
git add .gitsecret backend/.env.secret   # ชื่อไฟล์ที่ git-secret สร้าง — ตาม output จริง
git commit -m "chore: add git-secret mapping"
```

ผู้ clone ใหม่:

```bash
git secret reveal   # ต้องมี private GPG key ที่ถูก tell ไว้
```

### Windows

- แนะนำ **Git Bash** (มากับ Git for Windows) หรือ **WSL** เพราะ `git-secret` กับ GPG มักตั้งค่าง่ายกว่า PowerShell ล้วน
- ถ้าไม่ใช้ git-secret: ใช้ **Secret Manager บน GCP** + Vercel env อย่างเดียวก็เพียงพอ

### สิ่งที่อย่าทำ

- อย่า commit `.gitsecret/keys/random_seed` ถ้าเอกสาร git-secret บอกให้ ignore
- อย่าแชร์ private GPG key

## Headers บน API

Backend ใช้ [Helmet](https://helmetjs.github.io/) เพื่อ header พื้นฐาน; คู่กับ CORS ตั้ง `crossOriginResourcePolicy` ให้เข้ากับ `credentials`

## Rate limiting

- **`/api/members`** — จำกัดประมาณ 120 คำขอ / 15 นาที ต่อ IP  
- **`/api/auth/line`** — จำกัดประมาณ 40 คำขอ / 15 นาที ต่อ IP  

ปรับค่าใน `backend/src/index.ts` ได้ถ้าผู้ใช้จริงมาก

## อัปเดต dependency

- ดู PR จาก Dependabot; major bumps อาจทำให้ CI พัง — ทดสอบใน branch ก่อน merge

### แพ็กเกจ `xlsx` (นำเข้า Excel)

`npm audit` อาจรายงานช่องโหว่ระดับสูงใน `xlsx` (SheetJS) และอาจยัง **ไม่มีเวอร์ชันแก้** ใน npm ที่เข้ากันกับโค้ดปัจจุบัน

- การนำเข้าใช้เฉพาะ **endpoint admin** ที่มี `x-admin-key` — ลดพื้นที่โจมตีจากผู้ใช้ทั่วไป
- ใช้ไฟล์จากผู้ดูแลที่ไว้ใจได้เท่านั้น; หลีกเลี่ยงไฟล์จากแหล่งไม่น่าเชื่อถือ
- ถ้ามีทางเลือกอื่นที่ตรวจสอบแล้ว (เช่นแยกบริการแปลงไฟล์) สามารถพิจารณาย้ายทีหลัง
