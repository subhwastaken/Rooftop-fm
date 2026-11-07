# 📻 Rooftop.fm

<p align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/disc-3.svg" width="64" height="64" alt="Rooftop.fm Logo" />
</p>

<p align="center">
  <strong>Shared music & intimate moments, under the same sky.</strong><br />
  <em>Two headphones · one shared needle drop.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Socket.io-4.8-black?style=flat-square&logo=socket.io" alt="Socket.io" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/WebRTC-Voice_Call-success?style=flat-square" alt="WebRTC" />
</p>

---

> *"Distance feels quieter when the same song is playing in both rooms."*

**Rooftop.fm** is a cozy, retro-lofi synced listening lounge created for couples, close friends, and late-night sessions. Spin records together, share a 6-character frequency code, sync playback in real time, follow live karaoke lyrics, chat, send floating emoji reactions, and talk over procedural rain and vinyl crackle.

**Zero login. No Spotify Premium subscription required.**

---

## ✨ Features

- 📡 **Instant Channels & Shareable Codes** — Spin up a room in one click (`Late Night Rooftop`) with a shareable frequency code (`TAPE-84`) or a direct link (`/room/TAPE-84`).
- 👤 **Zero-Login Personas** — Visitors receive a warm randomized avatar and alias (`🦦 Sleepy Otter`, `🦊 Velvet Fox`, `🐼 Midnight Panda`) and can customize or reroll anytime.
- ⏱️ **Lockstep Playback Sync** — Real-time clock-offset calibrated synchronization via Socket.io. Play, pause, skip, or scrub the progress bar—both listeners stay in lockstep down to the millisecond.
- 🔍 **Spotify & YouTube Integration** — Search track titles or artists with rich album artwork, or paste Spotify track links and YouTube URLs directly. No Spotify Premium required.
- 🎤 **Live Synced Karaoke Lyrics** — Real-time timestamped `.lrc` lyrics that highlight line-by-line as the track plays. Click any lyric line to jump the track together.
- 💬 **Live Chat & Floating Reactions** — Intimate room chat with typing indicators, presence tracking, and floating vibe reactions.
- 🎙️ **Peer-to-Peer WebRTC Voice** — One-click high-clarity voice chat to talk while listening to music together.
- 🌧️ **Procedural Ambience & Themes** — Switch between 4 curated retro themes (*Midnight Cassette*, *Tokyo Rain '98*, *Matcha Vinyl*, and *Sunset Walkman*) with built-in procedural **Window Rain** and **Vinyl Crackle** ambient sliders.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Frontend**: [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Real-time Engine**: [Socket.io](https://socket.io/) with custom Node.js server (`server.mjs`)
- **Voice**: WebRTC Mesh Peer Connection
- **Music Resolution**: YouTube Search & Embedded Player with metadata resolution
- **Audio Synthesis**: Web Audio API (rain and vinyl crackle procedural noise)

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/subhwastaken/Rooftop-fm.git
cd Rooftop-fm
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the development server
```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in two browser tabs or on separate devices to test synchronized playback!

---

## 🌐 Sharing Across the Internet

To share your local Rooftop room with a friend or partner across the internet without port forwarding:

### Using Cloudflare Tunnels (Quickest & Free)
```bash
npx cloudflared tunnel --url http://localhost:3000
```
Copy the generated `https://xxxx.trycloudflare.com` URL and send it to your partner!

---

## 📜 Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the custom Node.js + Socket.io server with Next.js in dev mode |
| `npm run build` | Builds the Next.js production bundle |
| `npm run start` | Runs the production server (`NODE_ENV=production node server.mjs`) |
| `npm run lint` | Runs ESLint checks |
| `npm run typecheck` | Validates TypeScript types across the codebase |

---

## 📄 License

Apache-2.0 © [Subharup Nandi](https://github.com/subhwastaken)
