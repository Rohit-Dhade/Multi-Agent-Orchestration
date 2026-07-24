import { Router } from "express";
import { agent } from "../agents/code.agent.js";

const agentRouter = Router();

agentRouter.post("/invoke", async (req, res) => {
  try {
    const { message, sandboxId } = req.body;

    if (typeof message !== "string" || message.trim() === "") {
      return res
        .status(400)
        .json({ error: "A non-empty 'message' string is required." });
    }

    if (typeof sandboxId !== "string" || sandboxId.trim() === "") {
      return res
        .status(400)
        .json({ error: "A non-empty 'sandboxId' string is required." });
    }

    const response = await agent.invoke(
      {
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      },
      {
        context: {
          sandboxId,
        },
      },
    );

    return res.status(200).json({
      message: response,
    });
  } catch (error) {
    console.error("Error invoking agent: ", error);
    res.status(500).json({ error: "Failed to invoke agent" });
  }
});

export default agentRouter;
