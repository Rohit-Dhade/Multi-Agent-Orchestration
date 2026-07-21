import { fileURLToPath } from "node:url";
import path from "node:path";
import { ChatMistralAI } from "@langchain/mistralai";
import { listfiles, readfiles, updateFiles } from "./tools.js";
import { createAgent } from "langchain";
import dotenv from "dotenv";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(currentDir, "../../.env");

dotenv.config({ path: envPath });

const apiKey = process.env.MISTRALAI_API_KEY;

if (!apiKey) {
  throw new Error(
    "Mistral API key is missing. Set MISTRAL_API_KEY or MISTRALAI_API_KEY."
  );
}

const model = new ChatMistralAI({
  model: "mistral-medium-latest",
  apiKey,
  temperature: 0.7,
});

const agent = createAgent({
  model,
  tools: [listfiles, readfiles, updateFiles],
  prompt: `You are a coding agent working inside a sandboxed project workspace.
  - Inspect the available files before making changes.
  - Use the provided tools to read and update files when the user asks to create or modify code.
  - Prefer creating or editing the necessary files directly in the workspace.
  - Summarize the changes you made clearly.`,
}).withConfig({
  recursionLimit: 50,
});

// await agent.invoke({
//   messages: [
//     {
//       role: "user",
//       content:
//         "create a snake game using react and tailwind css and make it working.",
//     },
//   ],
// });

export default agent;
