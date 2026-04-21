# LINE Login — อ้างอิงโค้ดที่ใช้งานได้ (baseline)

เอกสารนี้บันทึก **พฤติกรรมที่ยืนยันแล้ว** (คอม + มือถือ: ล็อกอิน LINE → ได้ UID → เข้าระบบสมาชิกได้)  
ถ้ามีคนแก้ flow ล็อกอิน LINE ให้ **อ่านไฟล์และลำดับขั้นตอนด้านล่างก่อน** แล้วคง invariant สำคัญไว้ — หรือ restore จาก commit ที่อ้างอิง

**Commit baseline (อ้างอิงใน repo):** ค้นหา message `fix(line): oauth-state GET+POST fallback` หรือไฟล์ที่ลิงก์ด้านล่างบน `master`

---

## ลำดับการทำงาน (สรุป)

### A) เริ่มล็อกอิน (กดปุ่ม LINE)

1. `frontend/src/App.tsx` → `startLineLogin()`
2. ตรวจ mixed content: `isInsecureApiOnHttpsPage(apiBase)` — ห้ามเว็บ `https` ชี้ API `http` (ยกเว้น localhost)
3. ดึง signed state: `frontend/src/lib/fetchLineOauthState.ts` → `fetchLineOauthState(apiBase)`
   - ลอง **`GET /api/auth/line/oauth-state`** ก่อน
   - ถ้า **404 / 405** หรือ body เป็น **HTML** (เช่น `Cannot GET …`) → ลอง **`POST`** ซ้ำครั้งเดียว (รองรับ API/proxy เก่า)
4. Redirect ไป `https://access.line.me/oauth2/v2.1/authorize` พร้อม `state`, `redirect_uri` จาก `getLineRedirectUri()`, `scope=openid profile`

### B) หลัง LINE redirect กลับมา (`?code=&state=`)

1. `App.tsx` — `useEffect` อ่าน `code`, `state` จาก `window.location.search`
2. **Invariant:** ลบ query ออกจาก URL **ทันที** ด้วย `window.history.replaceState` **ก่อน** `await` ใด ๆ — กันแลก `authorization_code` ซ้ำ (React Strict / remount / มือถือ)
3. `POST /api/auth/line/token` พร้อม `code`, `redirect_uri`, `state`
4. `frontend/src/lib/syncLineAppUser.ts` → `POST /api/members/app-roles` (สร้าง/ซิงก์ `app_users`)
5. `frontend/src/lib/fetchSessionMember.ts` → `POST /api/members/session-member` (โหลดสมาชิกที่ผูก `line_uid` แล้ว)
6. **Invariant:** ตั้ง `verifiedMember` / `setMemberSnapshot` **ก่อน** `setLineUid` ใน state — ลด race กับ effect กู้เซสชัน
7. `setLineSessionFromOAuth`, `setLineUid`, `navigate('/member')`
8. แสดงข้อความ + บล็อก **รายละเอียดจาก API** (`lineIdentitySyncMessage.detail`) สร้างจาก `lineMemberApiTrace.ts` + `trace` จาก `syncLineAppUser` / `fetchSessionMember` — ใช้ไล่บั๊กบนมือถือ

### C) กู้เซสชันเมื่อมี UID ใน session แต่ยังไม่มี `verifiedMember`

1. `App.tsx` — `useEffect` ที่พึ่ง `[lineUid, navigate, verifiedMember]`
2. เรียก `fetchSessionMember` (มี `AbortController` + timeout)

---

## แผนที่ไฟล์ (ห้ามลบความสัมพันธ์โดยไม่ตั้งใจ)

| ไฟล์ | บทบาท |
|------|--------|
| `frontend/src/App.tsx` | `getLineRedirectUri`, `startLineLogin`, OAuth callback effect, session restore, ข้อความ LINE + `detail` |
| `frontend/src/lib/fetchLineOauthState.ts` | GET แล้ว fallback POST สำหรับ `/api/auth/line/oauth-state` |
| `frontend/src/lib/fetchSessionMember.ts` | `POST /api/members/session-member` + `trace` |
| `frontend/src/lib/syncLineAppUser.ts` | `POST /api/members/app-roles` + `trace` |
| `frontend/src/lib/lineMemberApiTrace.ts` | สรุป JSON สำหรับแบนเนอร์ debug |
| `frontend/src/lineSession.ts` | `sessionStorage` สำหรับ UID / snapshot สมาชิก |
| `backend/src/routes/lineAuth.ts` | `GET|POST /oauth-state`, `POST /token`, `redirectUriAllowed`, LINE verify |
| `backend/src/util/lineOAuthState.ts` | HMAC signed `state`, TTL |
| `backend/src/app.ts` | `app.use('/api/auth/line', …, lineAuthRouter)` |
| `backend/src/routes/members.ts` | `POST /app-roles`, `POST /session-member` |
| `scripts/verify-deployment.mjs` | probe `GET /api/auth/line/oauth-state` หลัง deploy |

---

## Invariant ที่เคยพังจริง (อย่าเอาออกโดยไม่ทดสอบ)

1. **ลบ `?code=` จาก URL ก่อน async แลก token** — code ใช้ได้ครั้งเดียว
2. **`fetchSessionMember` ก่อน `setLineUid`** หลัง OAuth สำเร็จ — กัน race ไม่เข้าหน้าสมาชิกทั้งที่ผูกแล้ว
3. **`VITE_API_URL` บน production ต้องเป็น `https://…` ของ Cloud Run** — mixed content บนมือถือบล็อก `http`
4. **Cloud Run ต้องมี revision ที่มี route `GET /api/auth/line/oauth-state`** — ถ้าเห็น HTML `Cannot GET` แปลว่า API ยังเก่า; deploy image จาก repo นี้

---

## เอกสารคู่คู่ (ops / env)

- ค่า URL, CORS, LINE Console: [`LINE_LOGIN_CHECKLIST.md`](./LINE_LOGIN_CHECKLIST.md)
- หลัง deploy: [`DEPLOY_VERIFY.md`](./DEPLOY_VERIFY.md) — `npm run verify:deploy`, `verify:line`

---

## คำสั่งตรวจเร็วหลังแก้โค้ดส่วนนี้

```bash
npm run ci
npm run verify:deploy -- https://<CLOUD_RUN_BASE> https://<VERCEL_ORIGIN>
```

แทนที่ URL ด้วยค่าจริงของโปรเจกต์ (ดู checklist)
