# Project Rules

## Goal
We are building a browser 3D mini online-like game titled Ш.А.Т.А.Л.К.Е.Р.
Literary genre: anomalous exclusion zone (Perimeter), artifact hunters (шаталкеры).
This is NOT a real MMO yet. It is a single-player fake-online prototype.
This is NOT a remake of any commercial franchise. Do not use other games' trademarks, locations, factions, or character names.

## Priority
Performance is the top requirement. Target ~60 FPS on integrated graphics.
A feature that drops frames is not done. Prefer fewer meshes, lights, and React updates over visual richness.
See docs/performance.md.

## Naming
- Title: Ш.А.Т.А.Л.К.Е.Р.
- Player archetype: шаталкер
- World: Периметр
- First camp: Застава «Насыпь»
- First NPC: Барыга Кефир
- First mutant: хряк (id: hryak)

## Stack
- Client: Vite, TypeScript, React, Babylon.js, Zustand
- CSS: plain `.css` only. No Tailwind, no CSS-in-JS, no UI kits. Keep the client light.
- Server (later): Go, Gin, GORM, Postgres, WebSocket, JWT, bcrypt
- Schema: goose SQL via `make migrate-up` / `make migrate-down`, never AutoMigrate on serve
- Docker: production only
- Local server commands go through Makefile
- No real multiplayer until the single-player loop works
- Implement in the order of docs/plan.md. Do not skip phases.

## Critical rules
1. The game must always run with `npm run dev`.
2. Keep ~60 FPS. Do not add Havok, shadows, postprocessing, extra point lights, or per-frame Zustand/React updates. Cheap AABB collision only in plan phase 15.
3. One Babylon Engine and Scene. Create once, dispose on unmount. No duplicate engine in React StrictMode.
4. Do not write player/monster xyz into React or Zustand every frame. Throttle HUD/minimap/save (5–10 Hz or on change).
5. Do not remove existing features unless explicitly asked.
6. Do not use external 3D models, textures or audio files unless they already exist in `/public/assets`.
7. Do not invent asset paths. Missing file → colored primitive. Generated images are drafts until they match docs/assets.md spec.
8. Use primitive Babylon meshes for missing assets:
   - player = olive capsule
   - mutant = rust-red capsule or box
   - npc = dirty-yellow cylinder
   - quest marker = dull-yellow sphere or cone
9. Keep all game configuration in `src/data`.
10. Keep UI state in Zustand (event-based, not the render loop).
11. Add GM/debug buttons for every major feature. FPS counter must exist.
12. Every new feature must include a manual playtest section in PLAYTEST.md, including a FPS check.
13. Use TypeScript strict mode.
14. Prefer simple systems over realistic systems.
15. No real multiplayer yet.
16. Fake шаталкеры and fake radio chat are allowed. Cap counts (about 5 mutants, 6 bots).
17. If a feature is too complex, split it into smaller tasks.
18. Do not create TODO placeholders without implementation.
19. Keep code runnable, simple, and cheap per frame.
20. After major changes, update README.md and PLAYTEST.md.
21. UI look: dirty PDA (olive, rust, dull yellow), not gold fantasy MMO chrome.
22. Mood: fog, overcast, concrete, rust. No pagodas, bamboo, or xianxia flavor.
23. Do not add Tailwind, Bootstrap, or other CSS frameworks.
