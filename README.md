# KeyTug: Typing Tug of War

**Type faster. Stay accurate. Pull harder.**

A real-time multiplayer typing game. Everyone types the same text, every correct character pulls the rope toward your team, and a wrong key stops you until you fix it.

### [Play it live: keytug.onrender.com](https://keytug.onrender.com/)

> The free server sleeps when idle, so the first visit can take 30 to 60 seconds.

## Features

- 1v1 or teams of any size, with spectators
- Play vs bots (Easy to Expert) or with friends via a room code
- Custom player weights so weaker players can get a handicap
- Win lead and time limit set by the host
- Instant local typing, red mistakes, and Backspace to fix
- Post-match scoreboard with MVPs
- Lobby and post-match chat
- Accounts (optional) or play as a guest

## Tech stack

React, Vite, TypeScript, Node.js, Express, Socket.IO, PostgreSQL (Neon), hosted on Render.

## Run locally

```bash
git clone https://github.com/sumandashw16/KeyTug.git
cd KeyTug
npm run install:all
npm run dev
```

Open http://localhost:5173 in two browser windows.

For accounts, create `server/.env`:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=verify-full
JWT_SECRET=a-long-random-string
```

Without `DATABASE_URL`, the game still works and everyone plays as a guest.

## Deploy on Render

| Setting | Value |
|---|---|
| Build Command | `npm --prefix server install --include=dev && npm --prefix client install --include=dev && npm run build` |
| Start Command | `npm start` |
| Env vars | `NODE_VERSION=20`, `DATABASE_URL`, `JWT_SECRET` |

## Notes

Rooms are kept in server memory, so a restart ends active games. Run a single instance.

## License

MIT
