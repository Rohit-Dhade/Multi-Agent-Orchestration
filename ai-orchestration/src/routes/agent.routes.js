import { Router } from "express";
import agent from "../agents/code.agent.js";

const agentRouter = Router();

agentRouter.post("/invoke", async (req, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ error: "A non-empty 'message' string is required." });
    }

    const response = await agent.invoke({
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    return res.status(200).json({
      message: response,
    });
  } catch (error) {
    console.error("Error invoking agent: ", error);
    res.status(500).json({ error: "Failed to invoke agent" });
  }
});

export default agentRouter;
