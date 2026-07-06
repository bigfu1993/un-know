## Context Sync 规则

- 踩坑了 → 调用 write_context 写到 gotchas
- 做了架构决策 → 调用 write_context 写到 architecture
- 发现 API 特殊行为 → 调用 write_context 写到 api_notes
- 用户说 /sync-save → 调用 sync_push
- 用户说 /sync-load → 调用 sync_load
