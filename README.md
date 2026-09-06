# Mini Kanban Board

A full-stack Kanban board with user accounts, board sharing with access control, and a drag-and-drop task board with conflict-free reordering.

Built for the Webbriks Full-Stack Engineering technical assessment.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, dnd-kit |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (token-based) |
| DevOps | Docker Compose |

## Features

- **Auth:** register/login, JWT-based sessions
- **Boards:** create, rename, delete; each board has an owner
- **Sharing:** owners can share a board with any other registered user by email (editor/viewer roles)
- **Access control:** every board/column/task route checks the requester is the board's owner or an invited member — unauthorized users get a 404, not a 403, so board existence isn't leaked to non-members
- **Columns & tasks:** full CRUD
- **Drag-and-drop task movement:** reorder within a column, or move to a specific position in a different column
- **Conflict-free ordering:** tasks use a floating-point `position` field. Moving a task sets its position to the midpoint between its new neighbors, so a move only ever writes a single row — no re-indexing every other task, and no race conditions between concurrent moves elsewhere on the board. If float precision is ever exhausted in one spot, the column automatically rebalances to integer positions as a fallback.

## Project structure

```
kanban-board/
├── backend/         Express + Prisma API
├── frontend/        Next.js app
├── docker-compose.yml
└── README.md
```

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)
- Docker Desktop (for Postgres, and optionally the whole stack)

## Local setup

### 1. Clone and start Postgres

```bash
git clone <your-repo-url>
cd kanban-board
docker compose up postgres -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
pnpm install
```

The first install may ask you to approve native build scripts (`bcrypt`, Prisma's engine binaries):

```bash
pnpm approve-builds
```
Select `bcrypt` and the Prisma packages, then confirm.

Run migrations and start the API:

```bash
pnpm exec prisma migrate dev --name init
pnpm dev
```

The API runs at **http://localhost:4000**.

> Note: this project is pinned to Prisma 5.20.0. Ignore any "update available" prompt suggesting Prisma 8 — that's currently a pre-release with a different CLI (migration commands are restructured), and isn't compatible with this setup.

### 3. Frontend

In a new terminal:

```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev
```

The app runs at **http://localhost:3000**.

### 4. Try it out

1. Register an account at `/register`
2. Create a board
3. Add a few columns (e.g. "To Do", "In Progress", "Done") and some tasks
4. Drag tasks between columns — refresh the page to confirm the new order persisted
5. Share the board with a second registered account by email, and confirm access control by logging in as that account

## Running everything with Docker Compose

```bash
docker compose up --build
```

This brings up Postgres, the backend (port 4000), and the frontend (port 3000) together. Migrations run automatically on backend startup.

## Environment variables

**backend/.env**
```
DATABASE_URL="postgresql://kanban_user:kanban_pass@localhost:5432/kanban_db?schema=public"
JWT_SECRET="change_this_secret_in_production"
PORT=4000
```

**frontend/.env**
```
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

## API reference

All routes except `/auth/*` require `Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Log in, returns a JWT |
| GET | `/boards` | List boards you own or are a member of |
| POST | `/boards` | Create a board |
| GET | `/boards/:boardId` | Get a board with its columns and tasks |
| PATCH | `/boards/:boardId` | Rename a board |
| DELETE | `/boards/:boardId` | Delete a board (owner only) |
| POST | `/boards/:boardId/share` | Share a board with a user by email — body: `{ email, role? }` |
| POST | `/columns/board/:boardId` | Create a column |
| PATCH | `/columns/:columnId` | Rename a column |
| DELETE | `/columns/:columnId` | Delete a column |
| POST | `/tasks/column/:columnId` | Create a task |
| PATCH | `/tasks/:taskId` | Edit a task |
| DELETE | `/tasks/:taskId` | Delete a task |
| PATCH | `/tasks/:taskId/move` | Move/reorder a task — body: `{ targetColumnId, targetIndex }` |

## Design notes

- **Access control** lives in `boardAccessMiddleware`, applied to every board-scoped route. It resolves the relevant board (directly, or via a column/task ID), then checks the requester is the owner or a `BoardMember` before allowing the request through. Non-members get a 404 rather than a 403, so the middleware doesn't confirm a private board's existence to people who shouldn't see it.
- **Task ordering** uses a `Float` `position` column rather than integer indices. This means reordering is O(1) — a move only touches the one task being moved, never its neighbors — which keeps ordering stable and avoids write conflicts when multiple people rearrange the same board at once.
- **Frontend drag-and-drop** is built with dnd-kit. On drop, the app optimistically updates the UI immediately, then calls the move endpoint in the background; if that call fails, it reloads the board from the server so the UI never drifts from the source of truth.

## Deployment

Not deployed — this submission runs locally via the steps above (deployment was listed as optional in the assessment brief).
