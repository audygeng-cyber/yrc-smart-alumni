# Performance summary
Snapshot: 2026-04-20T18:31:36.097Z
## Status
- Budget check: **PASS**
- LATEST pointer: main JS gzip 123556 bytes
## Metrics (gzip)
| Metric | Value |
|---|---:|
| Main index JS | 120.66 kB |
| Total JavaScript | 173.56 kB |
| All tracked assets | 180.86 kB |
## Budgets

| Limit | Max (bytes) | Current |
|---|---:|---:|
| Main JS gzip | 140000 | 123556 |
| Total JS gzip | 210000 | 177726 |
| Total assets gzip | 230000 | 185202 |

## Source files

- `docs/PERFORMANCE_BASELINE.json` / `.md`
- `docs/PERFORMANCE_BUDGETS.json`
- `docs/PERFORMANCE_LATEST.json`
- `docs/PERFORMANCE_HISTORY.json`

## Legacy / snapshot bundles

ไฟล์เช่น `PERFORMANCE_DASHBOARD.md`, `PERFORMANCE_COMPARE.md`, `PERFORMANCE_BUNDLES_INDEX.*`, `docs/performance-bundles/**` อาจเป็นของชุดเครื่องมือเก่าหรือสร้างด้วยสคริปต์อื่น — **อย่าอ้างตัวเลขจากไฟล์เหล่านั้น** หากไม่ได้ regenerate หลังเปลี่ยนโครงสร้าง bundle (เช่น main chunk รวมใน `assets/index-*.js`) แหล่งจริงสำหรับงบและ baseline คือไฟล์ใน `## Source files` ด้านบน
