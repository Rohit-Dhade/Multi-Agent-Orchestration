import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import app from '../src/app.js';

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

test('PATCH /update-files writes content into the sandbox workspace', async () => {
  const { server, port } = await startServer();
  const workspaceRoot = process.env.SANDBOX_WORKSPACE_ROOT || '/workspace';
  const targetFile = path.join(workspaceRoot, 'src', 'agent-test-output.txt');
  const cleanup = async () => {
    await fs.rm(targetFile, { force: true });
    await fs.rm(path.join(workspaceRoot, 'src'), { recursive: true, force: true });
    server.close();
  };

  try {
    const response = await fetch(`http://127.0.0.1:${port}/update-files`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [{ file: 'src/agent-test-output.txt', content: 'hello from sandbox' }],
      }),
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.match(JSON.stringify(body), /File updated successfully/);

    const fileContent = await fs.readFile(targetFile, 'utf8');
    assert.equal(fileContent, 'hello from sandbox');
  } finally {
    await cleanup();
  }
});
