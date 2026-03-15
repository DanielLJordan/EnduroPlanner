# EnduroPlanner

**iRacing endurance race management tool** — plan stints, track pit stops, monitor live fuel, and debrief after the race.

Built for teams running multi-hour endurance races in iRacing. All data is stored locally in the browser (no account required), with team-password access to keep the app locked down during races.

---

## Features

| Module | Description |
|---|---|
| **Race Setup** | Configure car, drivers, stint rules, and upload per-driver IBT telemetry |
| **Stint Scheduler** | Visual drag-and-drop stint planner with export to clipboard |
| **Live Dashboard** | Real-time race clock, fuel tracker, and iRacing WebSocket telemetry sync |
| **Fuel Planner** | Calculate stints-per-tank, total fuel needed, and safety margins |
| **Pit Stop Log** | Log and review every pit stop with lap time variance tracking |
| **Driver Stats** | Compare lap times and fuel usage across drivers from IBT data |
| **Race Debrief** | Post-race summary — driver time share, pit stop efficiency, highlights |

---

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tooling)
- **Tailwind CSS v3** (dark-themed UI)
- **Zustand** with `persist` middleware (all race data in `localStorage`)
- **React Router v6** (nested routes per race)
- Session-based team auth via `sessionStorage` (expires on browser close)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
VITE_TEAM_PASSWORD=your_team_password
```

The default password is `arete` if no `.env` is present.

> The password gates the entire app. It uses `sessionStorage` — team members must re-authenticate when they close the tab or refresh the page.

---

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. Deploy the `dist/` folder as a static site.

### Deploying to Cloudflare Pages

1. Connect the GitHub repo in Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_TEAM_PASSWORD=your_password`

---

## IBT Telemetry Upload

Each driver can upload their own `.ibt` file (found in `Documents/iRacing/telemetry/`).
The app parses lap times and fuel consumption, then:
- Displays per-driver averages in Driver Stats
- Computes a team average to pre-fill car setup fields in Race Setup

---

## Live iRacing Telemetry (Optional)

The Live Dashboard can connect to a local WebSocket bridge to pull real-time telemetry from iRacing:

```bash
npm install -g node-irsdk
irsdkserver
```

Then connect from the Dashboard settings panel (default: `ws://localhost:8182`).

---

## Project Structure

```
src/
├── components/       # Layout, NavBar, modals
├── pages/            # One file per route/module
├── store/            # Zustand store (useRaceStore)
├── types/            # Shared TypeScript interfaces
└── utils/            # Fuel calc, time helpers, IBT parser
```

---

## Roadmap

- [ ] Convex backend (real-time multi-device sync)
- [ ] Clerk authentication (replace password gate)
- [ ] Pit stopwatch (mobile-friendly)
- [ ] Full-screen driver display (for pit wall)
- [ ] Discord webhook for pit alerts
- [ ] Night shading on stint scheduler
- [ ] Multi-IBT session comparison

---

## License

Private — team use only.
