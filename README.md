# LFT — Minimal Workout Tracker

[![Live Demo](https://img.shields.io/badge/Live_Demo-lft--log.vercel.app-black?style=flat-square&logo=vercel)](https://lft-log.vercel.app)

A minimalist, high-focus web application designed to track and log gym workout sessions in real time. Log exercises, sets, reps, and weights live while training, set rest timers, save custom workout plans/templates, and analyze workout history and progress stats.

**Live URL**: [https://lft-log.vercel.app](https://lft-log.vercel.app)

---

## Features

- **Live Session Tracking**: Log sets, reps, weights, and rest timers as you work out.
- **Workout Templates**: Create, save, and launch custom workout plans (e.g., Push/Pull/Legs).
- **Personal Records (PRs)**: Automatically tracks personal bests (highest weight, max volume, total reps).
- **History & Logs**: Review past workout sessions with exercise breakdowns.
- **Analytics & Stats**: Visual graphs and stats (using Recharts) to analyze training volume and progress over time.
- **Minimalist Dark UI**: Built with a clean, responsive monochrome design.

---

## Tech Stack

- **Framework**: React 19, Vite, TanStack Router, TanStack Start, Nitro
- **Styling**: Tailwind CSS, Radix UI Primitives, Lucide React Icons
- **Data Visualization**: Recharts
- **Storage**: Local Storage

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm or bun

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/Jugal-007/gym-tracker.git
   cd gym-tracker
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Run the development server:
   ```sh
   npm run dev
   ```

4. Build for production:
   ```sh
   npm run build
   ```
