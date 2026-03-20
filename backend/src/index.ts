import cors from "cors";
import express from "express";
import { ensureArenaRunning } from "./lib/arena-service";
import arenaRouter from "./routes/arena";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL ?? "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());
app.use("/api/arena", arenaRouter);

app.listen(Number(PORT), () => {
  console.log(`Backend listening on :${PORT}`);
  void ensureArenaRunning()
    .then((active) => {
      if (active?.record.state) {
        console.log(`Arena booted: ${active.record.state.id}`);
      } else {
        console.log("Arena boot returned no active state");
      }
    })
    .catch((error) => {
      console.error(`Arena boot failed: ${error instanceof Error ? error.message : String(error)}`);
    });
});
