# Re-vendor Cursor community skills from GitHub (see .cursor/skills/VENDORED_SKILLS.md).
# Run from repository root: powershell -File scripts/sync-cursor-community-skills.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$vendor = Join-Path $root "_skill-vendor"
if (Test-Path $vendor) { Remove-Item -Recurse -Force $vendor }
New-Item -ItemType Directory -Path $vendor | Out-Null

$vercel = Join-Path $vendor "vercel-labs-agent-skills"
git clone --depth 1 --filter=blob:none --sparse "https://github.com/vercel-labs/agent-skills.git" $vercel
Push-Location $vercel
git sparse-checkout set skills/deploy-to-vercel skills/react-best-practices
Pop-Location

$supa = Join-Path $vendor "supabase-agent-skills"
git clone --depth 1 --filter=blob:none --sparse "https://github.com/supabase/agent-skills.git" $supa
Push-Location $supa
git sparse-checkout set skills/supabase-postgres-best-practices
Pop-Location

$dest = Join-Path $root ".cursor\skills"
foreach ($pair in @(
  @{ src = Join-Path $vercel "skills\deploy-to-vercel"; name = "deploy-to-vercel" },
  @{ src = Join-Path $vercel "skills\react-best-practices"; name = "react-best-practices" },
  @{ src = Join-Path $supa "skills\supabase-postgres-best-practices"; name = "supabase-postgres-best-practices" }
)) {
  $t = Join-Path $dest $pair.name
  if (Test-Path $t) { Remove-Item -Recurse -Force $t }
  Copy-Item -Recurse -Force $pair.src $t
}

Remove-Item -Recurse -Force $vendor
Write-Host "Updated community skills under .cursor/skills/"
