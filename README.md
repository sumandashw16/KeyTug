# Typing Tug of War

Two players type the same text. Correct characters pull the rope. Wrong key = red + beep + Backspace required.

## Run (dev)

npm run install:all

npm run dev

Client: http://localhost:5173 Server: http://localhost:3001

(Vite proxies /socket.io to the server. To play across a LAN: `npm --prefix client run dev -- --host`.)

## Run (production, single port)

npm run build

npm start # http://localhost:3001 serves client/dist + sockets

## Rules

- Win when you are `winningDifference * (opponent's share) / 50` correct characters ahead

(50/50 handicap => exactly `winningDifference`).

- Server owns: room state, countdown start time, progress validation, winner.

- Client types locally with zero network dependency; progress is sent afterwards.