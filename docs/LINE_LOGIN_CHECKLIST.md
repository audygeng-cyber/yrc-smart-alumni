# LINE Login — ขั้นตอนเจาะจง (ให้ URL ตรงกันทุกที่)

ฝั่ง API เปรียบเทียบ `redirect_uri` กับ `LINE_REDIRECT_URIS` แบบ **ไม่สนท้าย slash และไม่สนตัวพิมพ์** — ค่าที่ส่งต่อ LINE ยังเป็นสตริงเดิมจากเบราว์เซอร์ (ต้องตรงกับที่ใช้ตอนขอ authorize)  
ใน LINE Developers กับ Callback URL ยังควรใช้สตริงเดียวกันทุกที่เพื่อลดความสับสน

โค้ดอ้างอิง:

- ฝั่งเว็บส่ง `redirect_uri` จาก **`window.location.origin + '/'`** ใน production (และ dev ใช้ origin ปัจจุบัน) — ถ้าไม่มี `window` จึง fallback `VITE_LINE_REDIRECT_URI` — ดู `getLineRedirectUri()` ใน `frontend/src/App.tsx`
- ฝั่ง API อนุญาตเฉพาะค่าที่อยู่ใน `LINE_REDIRECT_URIS` (คั่นด้วย comma) — ดู `backend/src/routes/lineAuth.ts`
- **OAuth `state`:** ไม่เก็บใน `sessionStorage` แล้ว — เรียก `GET /api/auth/line/oauth-state` แล้วส่ง `state` ตอนแลก `POST /api/auth/line/token` (ลงนาม HMAC บนเซิร์ฟเวอร์) เพื่อรองรับมือถือที่ LINE ส่งกลับมาในเบราว์เซอร์คนละตัวกับที่เริ่ม flow

---

## 1) เลือก URL callback **ชุดเดียว** (แนะนำใช้แบบมี `/` ท้าย)

สำหรับ production ของโปรเจกต์นี้ ใช้ค่านี้เป็นหลัก:

```text
https://yrc-smart-alumni-frontend.vercel.app/
```

(มี `https://` — โดเมนตาม Vercel — **ลงท้ายด้วย slash หนึ่งตัว**)

ถ้าคุณต้องการใช้แบบ **ไม่มี** `/` ท้ายก็ได้ แต่ต้องใช้แบบนั้นทุกที่ในตารางด้านล่าง — **ห้ามปน** แบบมี/ไม่มี slash ระหว่าง Console กับ env

---

## 2) ตาราง “ต้องเหมือนกันทุกช่อง”

**แยก 2 ค่า URL:**  
- **CORS / `FRONTEND_ORIGINS`** — ใช้ **Origin** แบบเดียวกับที่เบราว์เซอร์ส่ง (`https://โดเมน.vercel.app`) **มักไม่มี** `/` ท้าย  
- **LINE OAuth / `VITE_LINE_REDIRECT_URI` / Callback URL** — เปรียบเทียบ **ตัวอักษรต่อตัวอักษร** มักใช้ `https://โดเมน.vercel.app/` **มี** `/` ท้ายหนึ่งตัว (ห้ามปนแบบมี/ไม่มี slash ระหว่างระบบ)

| ที่ตั้งค่า | ชื่อตัวแปร / ช่อง | ค่า (ตัวอย่าง production) |
|------------|-------------------|---------------------------|
| **Vercel** → Production | `VITE_API_URL` | ฐาน URL ของ Cloud Run เท่านั้น เช่น `https://yrc-api-860180276522.asia-southeast1.run.app` (**ไม่** ลงท้ายด้วย `/api`) |
| **LINE Developers** → Channel **LINE Login** → Callback URL | ช่อง Callback URL | `https://yrc-smart-alumni-frontend.vercel.app/` |
| **Vercel** → Project → Environment Variables → **Production** | `VITE_LINE_REDIRECT_URI` | `https://yrc-smart-alumni-frontend.vercel.app/` (ต้อง **เหมือน** Callback URL และอยู่ใน `LINE_REDIRECT_URIS`) |
| **Vercel** → Production | `VITE_LINE_CHANNEL_ID` | **Channel ID** จาก LINE Developers (Basic settings — ตัวเลข/สตริง public) |
| **Google Cloud Run** → service `yrc-api` → Variables | `FRONTEND_ORIGINS` | ต้องมี Origin ของเว็บ Vercel เช่น `https://yrc-smart-alumni-frontend.vercel.app` (**ไม่** ใส่ slash ท้าย) — คั่นหลายค่าด้วย comma เช่น `https://yrc-smart-alumni-frontend.vercel.app,http://localhost:5173` |
| **Google Cloud Run** → service `yrc-api` → Variables | `LINE_REDIRECT_URIS` | อย่างน้อยต้องมี **สตริงเดียวกับ** `VITE_LINE_REDIRECT_URI` เป๊ะ ๆ แนะนำใส่หลายค่าใน Console คั่นด้วย comma เช่น `https://yrc-smart-alumni-frontend.vercel.app/,http://localhost:5173/` |
| **Cloud Run** | `LINE_CHANNEL_ID` | **ตัวเดียวกับ** `VITE_LINE_CHANNEL_ID` |
| **Cloud Run** | `LINE_CHANNEL_SECRET` | **Channel secret** ของ channel เดียวกัน (เก็บเป็นความลับ — ไม่ใส่ใน frontend) |

หมายเหตุ: หลังแก้ `VITE_*` บน Vercel ต้อง **Redeploy** (หรือรอ build ใหม่) แล้ว hard refresh (`Ctrl+F5`) เพราะค่าถูกฝังตอน build

---

## 3) ตรวจจากเครื่อง (ไม่ต้องใส่ Channel Secret ใน repo)

รากโปรเจกต์ — **รวม CORS + LINE** (แนะนำ):

```bash
npm run verify:vercel-line-cors -- https://yrc-api-860180276522.asia-southeast1.run.app https://yrc-smart-alumni-frontend.vercel.app
```

หรือเฉพาะ LINE redirect probe:

```bash
npm run verify:line -- https://yrc-api-860180276522.asia-southeast1.run.app https://yrc-smart-alumni-frontend.vercel.app/
```

- ถ้ายังขึ้นว่าไม่มี `LINE_CHANNEL_*` → ใส่ Channel ID/Secret บน Cloud Run ก่อน
- ถ้าได้ **400** พร้อม `redirect_uri not allowed` และมี `allowed: [...]` → นำสตริงที่เบราว์เซอร์ใช้จริงไปใส่ใน `LINE_REDIRECT_URIS` ให้ตรง **ทุกตัวอักษร**
- ถ้าได้ **401** + `line_token_exchange_failed` จาก code ปลอม → โครงสร้าง API พร้อมแล้ว ให้ลองกดล็อกอินจริงบน HTTPS

---

## 4) ถ้ากดปุ่มล็อกอินแล้ว “ไม่เกิดอะไร”

- เช็คว่าใน Vercel Production มี `VITE_LINE_CHANNEL_ID` และ `VITE_LINE_REDIRECT_URI` ไม่ว่าง
- รอ deploy หลังแก้ env แล้วเปิดเว็บใหม่

---

## 5) `gcloud` กับค่าที่มี comma ใน `LINE_REDIRECT_URIS`

บน Windows การใส่หลาย URL ในบรรทัดเดียวมักทำให้ `gcloud` แยกผิด — **แนะนำแก้ใน Google Cloud Console** → Cloud Run → `yrc-api` → Edit & deploy new revision → Variables

---

## 6) ตรวจชื่อ env บน Vercel (CLI)

จากโฟลเดอร์ `frontend/`:

```bash
cd frontend
vercel env ls
```

**สิ่งที่ควรมีใน Production / Preview:** `VITE_API_URL`, `VITE_LINE_CHANNEL_ID`, `VITE_LINE_REDIRECT_URI`  
ถ้ามีแค่ `VITE_API_URL` — ล็อกอิน LINE จะไม่ทำงานจนกว่าจะเพิ่ม `VITE_LINE_*` แล้ว **Redeploy**

ดู deployment / log: [Vercel Dashboard](https://vercel.com) → Project → **Deployments** → เลือก build → **Building** log

**ผลตรวจตัวอย่าง (รันโดย agent):** `vercel env ls` แสดงเฉพาะ `VITE_API_URL` ใน Production/Preview — ยังขาด `VITE_LINE_*` จึงต้องเพิ่มใน Dashboard แล้ว redeploy  
**ผล `npm run verify:vercel-line-cors` ต่อ Cloud Run จริง:** CORS กับ Origin `https://yrc-smart-alumni-frontend.vercel.app` **ผ่าน** — แต่ probe LINE ได้ `500` + `LINE_CHANNEL_ID / LINE_CHANNEL_SECRET not configured` จนกว่าจะตั้งคู่ Channel บน Cloud Run ให้ครบ

---

## 7) มือถือ — สรุปปัญหาเดิมและแผนแก้ (ให้ตรงกับโค้ดปัจจุบัน)

| ปัญหา | สาเหตุ | แนวทางแก้ในระบบ |
|--------|--------|------------------|
| ล็อกอินแล้วเงียบ / กลับมาแล้วไม่เข้า | LINE เปิด OAuth แล้ว redirect กลับมาใน **Safari/Chrome** คนละ context กับ **WebView ใน LINE** → `sessionStorage` ไม่ตรงกัน ตรวจ `state` ไม่ผ่าน | ใช้ **`state` ลงนามบน API** (`GET` หรือ `POST /api/auth/line/oauth-state`) แล้วส่ง `state` ใน body ตอน `POST /api/auth/line/token` — ไม่พึ่ง `sessionStorage` สำหรับ CSRF/state |
| มือถือล็อกอินไม่ได้ แต่คอมได้ | **`redirect_uri`** ที่ส่งไป LINE ไม่ตรงกับที่ลงใน LINE Console / ไม่ตรง `LINE_REDIRECT_URIS` | Production ใช้ **`${window.location.origin}/`** ให้ตรงกับ URL ที่ผู้ใช้เปิดจริง; บน Cloud Run ต้องมีสตริง **ตัวต่อตัว** ใน `LINE_REDIRECT_URIS` และ Callback URL ใน LINE Developers |
| ข้อความ HTTP 404 + `Cannot GET /api/auth/line/oauth-state` | **Cloud Run ยังรัน image เก่า** ไม่มี route ใหม่ | **Deploy API** จาก `master` ล่าสุด แล้วรัน `npm run verify:deploy -- <API> [Origin]` — สคริปต์จะโหลด `GET /api/auth/line/oauth-state` ตรวจว่าไม่ใช่ 404 |
| fetch จากมือถือล้ม (CORS) | **Origin** เป็น URL preview (`*.vercel.app` คนละ subdomain) ไม่อยู่ใน `FRONTEND_ORIGINS` | API ใช้ CORS แบบ normalize origin และ **ถ้า `FRONTEND_ORIGINS` มีโดเมน `.vercel.app` อยู่แล้ว จะยอมรับทุก `https://*.vercel.app` อัตโนมัติ** (ปิดได้ด้วย `FRONTEND_CORS_ALLOW_VERCEL=0`) — ดู `backend/src/app.ts` |

**สิ่งที่ต้องมีบน Cloud Run หลังแผนนี้:** `LINE_CHANNEL_SECRET` (ใช้ลงนาม `state`; หรือตั้ง `LINE_OAUTH_STATE_SECRET` แยกได้), `LINE_REDIRECT_URIS`, `FRONTEND_ORIGINS` (และทำความเข้าใจกับกฎ CORS/Vercel ด้านบน)

**คัดลอกจากเทอร์มินัล Cursor (Windows):** ถ้า Ctrl+C ไม่หยุด process — ใช้ **Ctrl+Shift+C** คัดลอกจากเทอร์มินัล; รัน `npm run cursor:terminal-fix` จากราก repo เพื่อใส่ keybinding ให้ Ctrl+C ส่ง SIGINT เข้าเชลล์ แล้ว Reload Window
