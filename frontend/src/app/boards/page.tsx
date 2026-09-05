"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { clearSession, getToken, getStoredUser } from "@/lib/auth";
import type { Board, User } from "@/types";

export default function BoardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState("");
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setUser(getStoredUser<User>());
    loadBoards();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadBoards() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Board[]>("/boards");
      setBoards(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your boards.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    setCreating(true);
    try {
      const board = await api.post<Board>("/boards", { name: newBoardName.trim() });
      setNewBoardName("");
      setBoards((prev) => [...prev, board]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the board.");
    } finally {
      setCreating(false);
    }
  }

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Your boards</h1>
          {user?.email && <p className="text-ink/50 text-sm mt-1">Signed in as {user.email}</p>}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-ink/60 hover:text-ink border border-line rounded-md px-3 py-1.5"
        >
          Log out
        </button>
      </header>

      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <input
          type="text"
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
          placeholder="New board name"
          className="flex-1 rounded-md border border-line bg-white px-3 py-2 text-ink focus:border-signal outline-none"
        />
        <button
          type="submit"
          disabled={creating || !newBoardName.trim()}
          className="rounded-md bg-signal text-white px-4 py-2 font-medium hover:bg-signal/90 disabled:opacity-50 transition-colors"
        >
          Create board
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-ink/50">Loading boards…</p>
      ) : boards.length === 0 ? (
        <div className="border border-dashed border-line rounded-lg p-10 text-center">
          <p className="text-ink/60">
            No boards yet. Create one above to start organizing work.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                href={`/boards/${board.id}`}
                className="block rounded-lg border border-line bg-white p-5 hover:border-signal transition-colors"
              >
                <h2 className="font-medium text-ink">{board.name}</h2>
                <p className="text-sm text-ink/50 mt-1">
                  {board.members?.length ?? 1} member{(board.members?.length ?? 1) === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
