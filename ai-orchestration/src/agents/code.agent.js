import { fileURLToPath } from "node:url";
import path from "node:path";
import { ChatMistralAI } from "@langchain/mistralai";
import { createTools } from "./tools.js";
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

const AGENT_PROMPT = `You are a coding agent working inside a sandboxed Vite + React project workspace.

IMPORTANT — Project Structure Rules:
- This is a VITE project, NOT Create React App. Follow Vite conventions strictly.
- Entry point is index.html at the PROJECT ROOT (not public/index.html).
- React entry is src/main.jsx (not src/index.js).
- React components use the .jsx extension (e.g. src/App.jsx, not src/App.js).
- Do NOT create a public/index.html or src/index.js — these are CRA conventions and will be ignored by Vite.
- Do NOT replace package.json with react-scripts dependencies. The project already has vite, @vitejs/plugin-react, react, react-dom installed.
- Only modify files inside src/ and index.html at the root. Never touch vite.config.js, package.json, or node_modules.

Workflow:
1. ALWAYS call listfiles first to inspect the existing project structure.
2. Read relevant existing files before overwriting them.
3. Use updateFiles to write your changes.
4. Summarize exactly which files were changed and why.`;

/**
 * Creates an agent bound to a specific sandbox service.
 * @param {string} sandboxServiceUrl - e.g. "http://sandbox-service-<uuid>:3000"
 */
export function createCodeAgent(sandboxServiceUrl) {
  const { listfiles, readfiles, updateFiles } = createTools(sandboxServiceUrl);

  return createAgent({
    model,
    tools: [listfiles, readfiles, updateFiles],
    prompt: AGENT_PROMPT,
  }).withConfig({
    recursionLimit: 50,
  });
}
