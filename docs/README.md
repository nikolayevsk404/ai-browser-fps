# Documentation Index

This folder is the source of truth for building and evolving the game in an AI-first workflow.

Read in this order when starting from zero:

1. [Project overview](../README.md)
2. [Architecture](architecture/ARCHITECTURE.md)
3. [Game design](design/GAME_DESIGN.md)
4. [AI agents](ai/AI_AGENTS.md)
5. [Current roadmap](planning/TASKS.md)
6. [Phase notes](phases/)
7. [Operations](operations/)
8. [Prompts](prompts/)

## Structure

```txt
docs/
  architecture/  System boundaries, runtime ownership and data flow.
  design/        Gameplay rules, UX intent, map and weapon design.
  ai/            Bot and adaptive AI behavior documentation.
  planning/      Roadmap, backlog and out-of-core items.
  phases/        Historical implementation notes by phase.
  operations/    Docker, deployment and local runtime support.
  prompts/       AI development prompts and agent instructions.
  portfolio/     Presentation notes for external writeups.
```

## AI-First Documentation Rules

- Keep decisions close to the system they affect.
- Prefer explicit contracts, file paths and runtime ownership over broad prose.
- Update docs in the same change that modifies gameplay rules, protocol shape, AI behavior or project structure.
- Preserve phase notes as history; put current truth in architecture, design, AI or planning docs.
