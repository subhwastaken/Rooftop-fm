# Graph Report - MusicSync  (2026-11-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 267 nodes · 491 edges · 17 communities (13 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9a63ab71`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15

## God Nodes (most connected - your core abstractions)
1. `react` - 17 edges
2. `compilerOptions` - 16 edges
3. `ChannelRoom()` - 15 edges
4. `RoomSnapshot` - 11 edges
5. `Identity` - 10 edges
6. `services` - 10 edges
7. `EntryScreen()` - 9 edges
8. `Avatar()` - 8 edges
9. `NowPlayingStage()` - 8 edges
10. `lucide-react` - 8 edges

## Surprising Connections (you probably didn't know these)
- `BackdropProps` --references--> `TimeOfDay`  [EXTRACTED]
  src/components/Backdrop.tsx → src/lib/types.ts
- `LibraryPanelProps` --references--> `LyricsState`  [EXTRACTED]
  src/components/LibraryPanel.tsx → src/lib/useLyrics.ts
- `JoinAck` --references--> `RoomSnapshot`  [EXTRACTED]
  src/components/EntryScreen.tsx → src/lib/types.ts
- `NowPlayingStageProps` --references--> `Participant`  [EXTRACTED]
  src/components/NowPlayingStage.tsx → src/lib/types.ts
- `JoinAck` --references--> `RoomSnapshot`  [EXTRACTED]
  src/lib/useRoom.ts → src/lib/types.ts

## Import Cycles
- None detected.

## Communities (17 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (42): dependencies, lucide-react@^0.475.0, react@^19.0.0, react-dom@^19.0.0, socket.io@^4.8.1, socket.io-client@^4.8.1, description, devDependencies (+34 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (21): next@^15.2.4, yt-search@^2.12.1, next, yt-search, GET(), LrcLibItem, parseLrc(), CACHE_HEADERS (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (18): ChannelRoom(), MobileTab, TIME_OPTIONS, TimePreference, clientResolvedCache, LibraryPanel(), MOODS, Tab (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (18): app, cleanText(), CODE_WORDS, computePositionSec(), enterRoom(), handle, leaveCurrentRoom(), makeId() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (19): ActiveSession, ChannelRoomProps, ChatPanel(), ChatPanelProps, REACTIONS, EntryScreenProps, JoinAck, LibraryPanelProps (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (19): CallButton(), CallButtonProps, CallTimer(), IncomingCall(), IncomingCallProps, AudioCtor, createContext(), playSoftPing() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (15): Avatar(), AvatarProps, EntryScreen(), Mode, Preview, ADJECTIVES, AVATAR_DATABASE, AvatarItem (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.20
Nodes (13): cleanActionText(), NowPlayingStage(), NowPlayingStageProps, TogetherTime(), SyncedAudioEngine(), SyncedAudioEngineProps, Window, YTPlayer (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (12): key, value, services, autoDeploy, dockerfilePath, env, envVars, healthCheckPath (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.36
Nodes (8): react, HomePage(), Backdrop(), BackdropProps, IMAGES, resolveTimeOfDay(), TimeOfDay, useSocket()

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 13 - "Community 13"
Cohesion: 0.40
Nodes (4): SearchResult, VideoMetadataResult, VideoSearchResult, yt-search

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Community 1` to `Community 0`, `Community 3`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06025369978858351 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 10` to `Community 0`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 8`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08465608465608465 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Community 0` to `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 8`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1383399209486166 - nodes in this community are weakly interconnected._