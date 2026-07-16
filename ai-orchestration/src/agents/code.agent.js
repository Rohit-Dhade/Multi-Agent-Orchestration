import { ChatMistralAI } from "@langchain/mistralai";
import { listfiles, readfiles, updateFiles } from "./tools.js";
import { createAgent } from "langchain";
import dotenv from "dotenv";

dotenv.config();

const model = new ChatMistralAI({
  model: "mistral-medium-latest",
  apiKey: process.env.MISTRALAI_API_KEY,
});

const agent = createAgent({
  model,
  tools: [listfiles, readfiles, updateFiles],
}).withConfig({
  recursionLimit: 50,
});

await agent.invoke({
    messages: [
        {
            role: "user",
            content:
              "create a snake game using react and tailwind css and make it working.",
        },
    ],
});

export default model;
