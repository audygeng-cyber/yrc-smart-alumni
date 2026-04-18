# Community skills vendored for Cursor

These folders are copied from upstream repos (as listed on [skills.sh](https://skills.sh/)).  
**Primary project context** remains [yrc-smart-alumni/SKILL.md](./yrc-smart-alumni/SKILL.md).

**Repo-wide Cursor rules (accounting + stack):** the project root file [`.cursorrules`](../../.cursorrules) (at repo root, two levels above this folder) merges **CPA-grade accounting constraints** (double-entry, CoA 1–5, posted = immutable, void/reversal not delete, audit trail, Maker/Checker) with **this monorepo’s real stack** (Vite + React + Express + Supabase + Vercel/Cloud Run). Use it together with the local skill whenever you touch finance, journals, payment requests, period closing, or committee/meeting flows.

| Folder | Source (default branch) |
|--------|-------------------------|
| `deploy-to-vercel/` | [vercel-labs/agent-skills/skills/deploy-to-vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/deploy-to-vercel) |
| `react-best-practices/` | [vercel-labs/agent-skills/skills/react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) (leaderboard: *vercel-react-best-practices*) |
| `supabase-postgres-best-practices/` | [supabase/agent-skills/skills/supabase-postgres-best-practices](https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices) |

To refresh copies, run from repo root:

`powershell -File scripts/sync-cursor-community-skills.ps1`
