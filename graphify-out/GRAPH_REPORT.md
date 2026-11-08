# Graph Report - MusicSync  (2026-11-08)

## Corpus Check
- 35 files · ~19,405 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .ico 1, .webmanifest 1)

## Summary
- 267 nodes · 491 edges · 17 communities (13 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a7f4abad`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- search/route.ts
- ChannelRoom.tsx
- server.mjs
- types.ts
- useCall.ts
- identity.ts
- compilerOptions
- NowPlayingStage.tsx
- services
- page.tsx
- eslint.config.mjs
- CozyAmbientMixer
- yt-search.d.ts
- next.config.mjs
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `react` - 17 edges
2. `compilerOptions` - 16 edges
3. `ChannelRoom()` - 15 edges
4. `RoomSnapshot` - 11 edges
5. `services` - 10 edges
6. `Identity` - 10 edges
7. `EntryScreen()` - 9 edges
8. `lucide-react` - 8 edges
9. `Avatar()` - 8 edges
10. `NowPlayingStage()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `HomePage()` --calls--> `ChannelRoom()`  [EXTRACTED]
  src/app/page.tsx → src/components/ChannelRoom.tsx
- `HomePage()` --calls--> `EntryScreen()`  [EXTRACTED]
  src/app/page.tsx → src/components/EntryScreen.tsx
- `HomePage()` --calls--> `normalizeCode()`  [EXTRACTED]
  src/app/page.tsx → src/lib/identity.ts
- `ChatPanel()` --calls--> `Avatar()`  [EXTRACTED]
  src/components/ChatPanel.tsx → src/components/Avatar.tsx
- `NowPlayingStage()` --calls--> `Avatar()`  [EXTRACTED]
  src/components/NowPlayingStage.tsx → src/components/Avatar.tsx

## Import Cycles
- None detected.

## Communities (17 total, 4 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (42): dependencies, lucide-react@^0.475.0, react@^19.0.0, react-dom@^19.0.0, socket.io@^4.8.1, socket.io-client@^4.8.1, description, devDependencies (+34 more)

### Community 1 - "search/route.ts"
Cohesion: 0.08
Nodes (21): next@^15.2.4, yt-search@^2.12.1, next, yt-search, GET(), LrcLibItem, parseLrc(), CACHE_HEADERS (+13 more)

### Community 2 - "ChannelRoom.tsx"
Cohesion: 0.14
Nodes (18): ChannelRoom(), MobileTab, TIME_OPTIONS, TimePreference, clientResolvedCache, LibraryPanel(), MOODS, Tab (+10 more)

### Community 3 - "server.mjs"
Cohesion: 0.14
Nodes (18): app, cleanText(), CODE_WORDS, computePositionSec(), enterRoom(), handle, leaveCurrentRoom(), makeId() (+10 more)

### Community 4 - "types.ts"
Cohesion: 0.17
Nodes (19): ActiveSession, ChannelRoomProps, ChatPanel(), ChatPanelProps, REACTIONS, EntryScreenProps, JoinAck, LibraryPanelProps (+11 more)

### Community 5 - "useCall.ts"
Cohesion: 0.15
Nodes (19): CallButton(), CallButtonProps, CallTimer(), IncomingCall(), IncomingCallProps, AudioCtor, createContext(), playSoftPing() (+11 more)

### Community 6 - "identity.ts"
Cohesion: 0.19
Nodes (15): Avatar(), AvatarProps, EntryScreen(), Mode, Preview, ADJECTIVES, AVATAR_DATABASE, AvatarItem (+7 more)

### Community 7 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 8 - "NowPlayingStage.tsx"
Cohesion: 0.20
Nodes (13): cleanActionText(), NowPlayingStage(), NowPlayingStageProps, TogetherTime(), SyncedAudioEngine(), SyncedAudioEngineProps, Window, YTPlayer (+5 more)

### Community 9 - "services"
Cohesion: 0.15
Nodes (12): key, value, services, autoDeploy, dockerfilePath, env, envVars, healthCheckPath (+4 more)

### Community 10 - "page.tsx"
Cohesion: 0.36
Nodes (8): react, HomePage(), Backdrop(), BackdropProps, IMAGES, resolveTimeOfDay(), TimeOfDay, useSocket()

### Community 11 - "eslint.config.mjs"
Cohesion: 0.29
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 13 - "yt-search.d.ts"
Cohesion: 0.40
Nodes (4): SearchResult, VideoMetadataResult, VideoSearchResult, yt-search

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `search/route.ts` to `package.json`, `server.mjs`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06025369978858351 - nodes in this community are weakly interconnected._
- **Why does `react` connect `page.tsx` to `package.json`, `ChannelRoom.tsx`, `types.ts`, `useCall.ts`, `identity.ts`, `NowPlayingStage.tsx`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Should `search/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08465608465608465 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `package.json` to `ChannelRoom.tsx`, `types.ts`, `useCall.ts`, `identity.ts`, `NowPlayingStage.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `ChannelRoom.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._
- **Should `server.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.1383399209486166 - nodes in this community are weakly interconnected._