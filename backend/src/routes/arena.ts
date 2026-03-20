import { Router, Request, Response } from "express";
import { ensureArenaRunning } from "../lib/arena-service";
import { getAllArenas, getArenaInstance, getArenaRecord, setActiveArena } from "../lib/arena-store";
import type { ArenaConfig } from "../lib/types";

const router = Router();

// POST /api/arena/start
router.post("/start", async (_req: Request, res: Response) => {
  try {
    const body = _req.body as Partial<ArenaConfig>;
    const active = await ensureArenaRunning(body);
    res.json({ arenaId: active?.record.state.id ?? null, state: active?.record.state ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/arena/current
router.get("/current", async (_req: Request, res: Response) => {
  try {
    const active = await ensureArenaRunning();
    if (!active) {
      res.json({ arenaId: null, state: null });
      return;
    }
    res.json({ arenaId: active.record.state.id, state: active.record.state });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/arena/status/:id
router.get("/status/:id", (req: Request, res: Response) => {
  const record = getArenaRecord(req.params.id);
  if (!record) {
    res.status(404).json({ arenaId: req.params.id, state: null });
    return;
  }
  res.json({ arenaId: req.params.id, state: record.state });
});

// GET /api/arena/stream/:id (SSE)
router.get("/stream/:id", (req: Request, res: Response) => {
  const record = getArenaRecord(req.params.id);
  if (!record) {
    res.status(404).send("Arena not found");
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Send initial snapshot
  res.write(`data: ${JSON.stringify({ event: "snapshot", data: record.state })}\n\n`);

  const unsubscribe = record.subscribe((event: unknown) => {
    res.write(`data: ${JSON.stringify({ event: (event as { type: string }).type, data: event, state: record.state })}\n\n`);
  });

  req.on("close", () => {
    unsubscribe();
    res.end();
  });
});

// POST /api/arena/stop/:id
router.post("/stop/:id", (req: Request, res: Response) => {
  const instance = getArenaInstance(req.params.id);
  if (!instance) {
    res.status(404).json({ ok: false, message: "Arena not found" });
    return;
  }
  if (instance.orchestrator) {
    (instance.orchestrator as { abort?: () => void }).abort?.();
  }
  setActiveArena(null);
  res.json({ ok: true });
});

// GET /api/arena/results/:id
router.get("/results/:id", (req: Request, res: Response) => {
  const record = getArenaRecord(req.params.id);
  if (!record) {
    res.status(404).json({ message: "Arena not found" });
    return;
  }
  res.json({ arenaId: req.params.id, state: record.state });
});

// GET /api/arena/history
router.get("/history", (_req: Request, res: Response) => {
  res.json(getAllArenas());
});

export default router;
