// @vitest-environment node
import net from "node:net";
import { afterEach, expect, test } from "vitest";
import { findFreePort, isPortFree } from "./free-port.mjs";

const servers = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((s) => new Promise((r) => s.close(r))),
  );
});

function occupy(port) {
  return new Promise((resolve) => {
    const server = net
      .createServer()
      .listen(port, "127.0.0.1", () => resolve(server));
    servers.push(server);
  });
}

async function someFreePort() {
  const server = await occupy(0);
  const { port } = server.address();
  await new Promise((r) => server.close(r));
  servers.splice(servers.indexOf(server), 1);
  return port;
}

test("空いているポートはそのまま使う", async () => {
  const port = await someFreePort();
  expect(await isPortFree(port)).toBe(true);
  expect(await findFreePort(port)).toBe(port);
});

test("使われていれば次の空いている番号を使う", async () => {
  const port = await someFreePort();
  await occupy(port);
  expect(await isPortFree(port)).toBe(false);
  const found = await findFreePort(port);
  expect(found).toBeGreaterThan(port);
  expect(await isPortFree(found)).toBe(true);
});

test("指定した範囲がすべて使われていたらエラー", async () => {
  const port = await someFreePort();
  await occupy(port);
  await expect(findFreePort(port, { attempts: 1 })).rejects.toThrow(
    `${port}〜${port} 番のポートがすべて使われています`,
  );
});
