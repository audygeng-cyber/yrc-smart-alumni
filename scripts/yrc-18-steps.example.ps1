#requires -Version 5.1
<#
.SYNOPSIS
  ตัวอย่างรันขั้นตอน YRC Smart Alumni — แก้ตัวเลข/พาธในบล็อก CONFIG ด้านล่าง แล้วรันทีละขั้นด้วย -Step

.DESCRIPTION
  - ตั้ง $StepFirst เพื่อให้เลขขั้นที่พิมพ์ออกมาเริ่มที่ค่าอื่น (เช่น 100 = ขั้นแรกแสดงเป็น 100)
  - ตั้ง $RepoRoot, $PortApi, $PortFrontend ให้ตรงเครื่อง
  - รัน: .\scripts\yrc-18-steps.example.ps1 -Step 9
  - รันต่อเนื่องหลายขั้น: .\scripts\yrc-18-steps.example.ps1 -From 1 -To 9

  ไฟล์นี้เป็นตัวอย่าง — ขั้นที่ต้องทำในเบราว์เซอร์ (Supabase, LINE, Vercel) ยังต้องทำด้วยมือ
#>

[CmdletBinding()]
param(
  [ValidateRange(1, 18)]
  [int]$Step = 0,
  [ValidateRange(1, 18)]
  [int]$From = 0,
  [ValidateRange(1, 18)]
  [int]$To = 0
)

# ========== CONFIG — แก้ตัวเลข/พาธที่นี่ ==========
$RepoRoot = "C:\Users\gengk\Desktop\YRC Smart Alumni"
$StepFirst = 1
$NodeMajorMinimum = 20
$PortApi = 4000
$PortFrontend = 5173
$VerifyApiUrl = "https://YOUR_API.run.app"
$VerifyFrontendOrigin = "https://YOUR_APP.vercel.app"
# ================================================

function Step-Label([int]$indexOneBased) {
  return $StepFirst + $indexOneBased - 1
}

function Write-StepBanner([int]$indexOneBased, [string]$title) {
  $n = Step-Label $indexOneBased
  Write-Host ""
  Write-Host "========== ขั้นที่ $n — $title ==========" -ForegroundColor Cyan
}

function Ensure-Repo {
  if (-not (Test-Path -LiteralPath $RepoRoot)) {
    throw "ไม่พบ REPO_ROOT: $RepoRoot — แก้ใน CONFIG"
  }
  Set-Location -LiteralPath $RepoRoot
}

function Invoke-Step([int]$indexOneBased) {
  Ensure-Repo
  switch ($indexOneBased) {
    1 {
      Write-StepBanner 1 "ตรวจ Node (ต้อง >= $NodeMajorMinimum)"
      $v = node -v 2>&1
      Write-Host $v
      $major = [int]($v -replace '^v(\d+).*', '$1')
      if ($major -lt $NodeMajorMinimum) { throw "Node ต้อง >= $NodeMajorMinimum" }
    }
    2 {
      Write-StepBanner 2 "npm install"
      npm install
      if ($LASTEXITCODE -ne 0) { throw "npm install ล้มเหลว" }
    }
    3 {
      Write-StepBanner 3 "setup:env"
      npm run setup:env
      if ($LASTEXITCODE -ne 0) { throw "setup:env ล้มเหลว" }
    }
    4 {
      Write-StepBanner 4 "รายการ migration (ทำ SQL บน Supabase ด้วยมือ)"
      npm run migrations:list
    }
    5 {
      Write-StepBanner 5 "กรอก backend/.env — ทำด้วยมือ (SUPABASE_*, ADMIN_UPLOAD_KEY)"
    }
    6 {
      Write-StepBanner 6 "LINE + env — ทำด้วยมือ (ดู docs/LINE_LOGIN_CHECKLIST.md)"
    }
    7 {
      Write-StepBanner 7 "ตรวจ frontend/.env — ทำด้วยมือ (VITE_API_URL=http://127.0.0.1:$PortApi เป็นต้น)"
    }
    8 {
      Write-StepBanner 8 "doctor — ต้องรัน backend ในเทอร์มินัลอื่นก่อน: npm run dev -w backend"
      npm run doctor
      if ($LASTEXITCODE -ne 0) { throw "doctor ล้มเหลว" }
    }
    9 {
      Write-StepBanner 9 "npm run ci"
      npm run ci
      if ($LASTEXITCODE -ne 0) { throw "ci ล้มเหลว" }
    }
    10 {
      Write-StepBanner 10 "phase0:verify"
      npm run phase0:verify
      if ($LASTEXITCODE -ne 0) { throw "phase0 ล้มเหลว" }
    }
    11 {
      Write-StepBanner 11 "phase1:verify"
      npm run phase1:verify
      if ($LASTEXITCODE -ne 0) { throw "phase1 ล้มเหลว" }
    }
    12 {
      Write-StepBanner 12 "phase2:verify"
      npm run phase2:verify
      if ($LASTEXITCODE -ne 0) { throw "phase2 ล้มเหลว" }
    }
    13 {
      Write-StepBanner 13 "phase3:verify"
      npm run phase3:verify
      if ($LASTEXITCODE -ne 0) { throw "phase3 ล้มเหลว" }
    }
    14 {
      Write-StepBanner 14 "phase4:verify"
      npm run phase4:verify
      if ($LASTEXITCODE -ne 0) { throw "phase4 ล้มเหลว" }
    }
    15 {
      Write-StepBanner 15 "npm run dev — เปิด http://localhost:$PortFrontend ด้วยมือ"
      npm run dev
    }
    16 {
      Write-StepBanner 16 "VAPID — รัน: npx web-push generate-vapid-keys แล้วใส่ backend/.env"
      npx --yes web-push generate-vapid-keys
    }
    17 {
      Write-StepBanner 17 "Deploy — ทำบน Vercel / Cloud Run / LINE callback ด้วยมือ (docs/DEPLOY_VERIFY.md)"
    }
    18 {
      Write-StepBanner 18 "verify:deploy + verify:vercel-line-cors + qa:quick"
      npm run verify:deploy -- $VerifyApiUrl $VerifyFrontendOrigin
      if ($LASTEXITCODE -ne 0) { throw "verify:deploy ล้มเหลว" }
      npm run verify:vercel-line-cors -- $VerifyApiUrl $VerifyFrontendOrigin
      if ($LASTEXITCODE -ne 0) { throw "verify:vercel-line-cors ล้มเหลว" }
      npm run qa:quick
      if ($LASTEXITCODE -ne 0) { throw "qa:quick ล้มเหลว" }
    }
    default { throw "ขั้นไม่ถูกต้อง: $indexOneBased" }
  }
}

if ($From -gt 0 -and $To -gt 0) {
  if ($From -gt $To) { throw "-From ต้อง <= -To" }
  for ($i = $From; $i -le $To; $i++) {
    if ($i -eq 15) {
      Write-Warning "ขั้น 15 รัน npm run dev แบบ blocking — ข้ามช่วงที่เหลือถ้าไม่ต้องการ"
    }
    Invoke-Step $i
  }
  exit 0
}

if ($Step -gt 0) {
  Invoke-Step $Step
  exit 0
}

@"

แก้ CONFIG ด้านบนไฟล์ แล้วรัน เช่น:

  .\scripts\yrc-18-steps.example.ps1 -Step 2
  .\scripts\yrc-18-steps.example.ps1 -From 1 -To 9

ตัวแปรสำคัญ:
  RepoRoot=$RepoRoot
  StepFirst=$StepFirst (ขั้นแรกในชื่อ = $StepFirst)
  PortApi=$PortApi  PortFrontend=$PortFrontend
  VerifyApiUrl=$VerifyApiUrl
  VerifyFrontendOrigin=$VerifyFrontendOrigin

เอกสารเทมเพลต markdown: docs/YRC_18_STEP_FULL_STACK.template.md
"@ | Write-Host
