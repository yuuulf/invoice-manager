import net from "node:net";

/** host:port で待ち受けられるか（ほかで使われていないか） */
export function isPortFree(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, host);
  });
}

/**
 * start から順に空いているポートを探す。attempts 個調べても見つからなければ例外。
 * @param {number} start
 * @param {{ host?: string, attempts?: number }} [options]
 */
export async function findFreePort(
  start,
  { host = "127.0.0.1", attempts = 50 } = {},
) {
  for (let port = start; port < start + attempts; port++) {
    if (await isPortFree(port, host)) return port;
  }
  throw new Error(
    `${start}〜${start + attempts - 1} 番のポートがすべて使われています`,
  );
}
