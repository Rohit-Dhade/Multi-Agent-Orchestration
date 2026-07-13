import express from "express";

import morgan from "morgan";

const app = express();
app.use(morgan("combined"));

app.get("/api/ai/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});


export default app;