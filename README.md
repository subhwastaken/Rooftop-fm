<div align="center">

```text
  ╔════════════════════════════════════════════════════════════════════════════════════╗
  ║                                                                                    ║
  ║   ____    ___    ___   _____  _____   ___   ____     _____  __  __                 ║
  ║  |  _ \  / _ \  / _ \ |  ___||_   _| / _ \ |  _ \   |  ___||  \/  |                ║
  ║  | |_) || | | || | | || |_     | |  | | | || |_) |  | |_   | |\/| |                ║
  ║  |  _ < | |_| || |_| ||  _|    | |  | |_| ||  __/ _ |  _|  | |  | |                ║
  ║  |_| \_\ \___/  \___/ |_|      |_|   \___/ |_|   (_)|_|    |_|  |_|                ║
  ║                                                                                    ║
  ║             "Distance is temporary. Perfect harmony is forever."                   ║
  ║                                                                                    ║
  ╚════════════════════════════════════════════════════════════════════════════════════╝
```

### 📻 The cozy, low-latency, zero-login music lounge for couples, besties, and daydreamers.

<p align="center">
  <a href="https://github.com/subhwastaken/Rooftop-fm"><img src="https://img.shields.io/badge/Spotify_Premium-NOT_REQUIRED-1DB954?style=for-the-badge&logo=spotify&logoColor=white" alt="No Spotify Premium" /></a>
  <a href="https://github.com/subhwastaken/Rooftop-fm"><img src="https://img.shields.io/badge/Happy_Vibes-100%25_PURE-success?style=for-the-badge" alt="Happy Vibes" /></a>
  <a href="https://github.com/subhwastaken/Rooftop-fm"><img src="https://img.shields.io/badge/Vibe_Level-COZY_SUNSET-ffb703?style=for-the-badge" alt="Vibe Level" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Socket.io-Lockstep_Sync-black?style=flat-square&logo=socket.io" alt="Socket.io" />
  <img src="https://img.shields.io/badge/WebRTC-P2P_Voice-success?style=flat-square" alt="WebRTC" />
  <img src="https://img.shields.io/badge/Rain_Simulator-Procedural-blue?style=flat-square" alt="Rain" />
</p>

</div>

---

## 🎧 Why Does This Exist?

Picture this classic scenario:

> **You:** *"Okay ready? Press play in 3... 2... 1... GO!"*  
> **Them:** *"Wait did you start? I'm at 0:04."*  
> **You:** *"I'm at 0:07! Pause! PAUSE!"*  
> **Them:** *"Wait, now I paused at 0:09, where are you?!"*  
> *(You're both laughing and wondering why listening to your favorite song together has to be so tricky.)*

And what are the alternatives?
- **Spotify Jam**: Requires everyone in the room to pay $11.99/month. If one friend doesn't have Premium, they're left out of the party.
- **Discord Screen Share**: Your favorite track gets crushed down to 12kbps, sounding like it's coming through a tin can.
- **Rooftop.fm**: You create a room (`TAPE-42`), send the link, and you're listening together **in millisecond-perfect lockstep**. When you scrub the timeline, their needle jumps too. No accounts. No subscriptions. Just pure, wholesome music sharing.

---

## ⚡ The Feature Roster

| Feature | What It Actually Means |
|:---|:---|
| ⏱️ **Lockstep Millisecond Sync** | Server clock-drift offset calibration. Hit play, pause, or seek and you both experience every beat together. |
| 💳 **100% Free For Everyone** | **Zero Spotify Premium needed.** Search any song or paste Spotify/YouTube links; it streams high quality audio seamlessly. |
| 🥷 **Zero-Login Friendly Personas** | No *"Sign up with Google"*, no password resets, no verification SMS. You join with a cute avatar like `🦦 Sleepy Otter` or `🦊 Velvet Fox`. Jump right into the music. |
| 🎤 **Synchronized Live Lyrics** | Timestamped `.lrc` karaoke lyrics scroll with the music. Click *any* lyric line to jump together to your favorite verse. |
| 🌧️ **Procedural Cozy Rain & Vinyl Crackle** | Built-in Web Audio API ambient engine. Turn up **Window Rain** and **Vinyl Crackle** sliders to instantly feel like you're sitting in a warm, peaceful café watching the clouds drift by. |
| 📞 **Peer-to-Peer Voice Hangout** | 1-click WebRTC voice chat directly through the browser. Chat, hum along, and share laughs without needing another app. |
| 🎨 **4 Relaxing Retro Themes** | *Midnight Cassette*, *Tokyo Rain '98*, *Matcha Vinyl*, and *Sunset Walkman*. |

---

## 🥊 The Music Sharing Matrix

| The Criteria | 📻 Rooftop.fm | 🟢 Spotify Jam | 👾 Discord Screen Share | 🗣️ "3, 2, 1, Press Play!" |
|:---|:---:|:---:|:---:|:---:|
| **Cost** | **$0.00 / Free** | $11.99/mo per person | Nitro upsells | Free |
| **Login Friction** | **0 seconds** | 2FA + Spotify App | Discord Client required | None |
| **Audio Quality** | **Studio crisp** | Studio crisp | Compressed walkie-talkie | Depends on your speakers |
| **Playback Sync** | **Automated Lockstep** | Flaky on mobile | Host-only control | Complete chaos |
| **Built-in Rain Sounds** | 🌧️ **Yes (Procedural)** | ❌ No | ❌ No | 🔇 Silent room |
| **Pure Wholesome Fun** | **100%** | 50% (desync confusion) | 40% (lag complaints) | 10% (out of sync) |

---

## 🛠️ The Gear Under the Hood

- **Next.js 15 & React 19** — Running the slickest liquid-glass retro cassette UI known to humankind.
- **Socket.io + Custom Node Server (`server.mjs`)** — Delivering state deltas in real-time so both listeners hear every note simultaneously.
- **WebRTC Mesh** — Direct browser-to-browser voice chat with clear, peer-to-peer audio.
- **Web Audio Synthesis** — Procedural pink-noise rain algorithms and warm synthetic vinyl textures.
- **Tailwind CSS & Lucide Icons** — Crafted with care for an aesthetic, relaxing experience.

---

## 🚀 Running Your Own Rooftop

### Step 1: Clone the Goods
```bash
git clone https://github.com/subhwastaken/Rooftop-fm.git
cd Rooftop-fm
```

### Step 2: Grab the Packages
```bash
npm install
```

### Step 3: Launch the Lounge
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser. Open it in a second tab (or on your phone) to enjoy instant synchronized music!

---

## 🌍 Sharing Across the Globe (No Port Forwarding)

Want to listen with someone across the city or across the ocean? Share your room easily:

```bash
# Spawn a free instant tunnel via Cloudflare
npx cloudflared tunnel --url http://localhost:3000
```
Copy the `https://xxxx.trycloudflare.com` URL, send it over, and enjoy the session together!

---

## ✨ Frequently Asked Questions (FAQ)

#### *Q: "Does my friend need an account?"*
**A:** Nope! No one needs an account. Just share the 6-character room code or URL and you're immediately in the lounge together.

#### *Q: "Can both people control the music?"*
**A:** Yes! It's a truly collaborative experience. Anyone can pick songs, pause, play, or scrub the timeline.

#### *Q: "Is this legal?"*
**A:** Yes! We use public YouTube embed protocols and open metadata resolvers. We love great music and bringing people together.

---

## 📜 Commands Cheatsheet

```bash
npm run dev        # Spin up the Socket.io sync server + Next.js in dev mode
npm run build      # Package the app for production
npm run start      # Run the optimized production server
npm run typecheck  # Ensure TypeScript is happy with our vibe
```

---

<div align="center">
  <p>Made with ❤️, lofi beats, and good vibes by <a href="https://github.com/subhwastaken">Subharup Nandi</a></p>
  <p>Licensed under <a href="./LICENSE">Apache-2.0</a></p>
</div>
