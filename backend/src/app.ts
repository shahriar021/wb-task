import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import boardsRoutes from "./routes/boards.routes";
import columnsRoutes from "./routes/columns.routes";
import tasksRoutes from "./routes/tasks.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/boards", boardsRoutes);
app.use("/columns", columnsRoutes);
app.use("/tasks", tasksRoutes);

export default app;
