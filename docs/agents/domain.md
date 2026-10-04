# Domain Docs

This repository uses a single-context domain-document layout.

## Before exploring

Read the root `CONTEXT.md` when it exists, followed by any relevant decision records in `docs/adr/`. If those files do not exist, continue without flagging their absence.

## Vocabulary and decisions

Use terms defined in `CONTEXT.md` consistently in issues, specifications, implementation plans, and tests. If an existing ADR conflicts with a proposed change, surface that conflict explicitly instead of silently overriding it.

## Layout

```text
/
├── CONTEXT.md
├── docs/
│   ├── adr/
│   └── agents/
└── ...
```

`CONTEXT.md` and ADRs are created only when a domain-modeling decision actually requires them.
