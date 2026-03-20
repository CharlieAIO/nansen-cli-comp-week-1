import cors from "cors";
import express from "express";
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
});
