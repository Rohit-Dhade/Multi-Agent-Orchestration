import express from "express";
import agentRouter from "./routes/agent.routes.js";
import morgan from "morgan";

const app = express();
app.use(morgan("combined"));


app.get("/api/status/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});


app.use("/api/ai" , agentRouter);


export default app;