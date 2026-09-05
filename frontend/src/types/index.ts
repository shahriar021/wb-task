export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  user?: User;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  position: number;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  order: number;
  tasks: Task[];
}

export interface Board {
  id: string;
  name: string;
  ownerId: string;
  columns?: Column[];
  members?: BoardMember[];
}
