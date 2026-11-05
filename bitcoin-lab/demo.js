// Demo of Bitcoin Lab: answers the page's API calls from a snapshot in demo-data/, and plays a new block on demand.
// Built into the demo by Skripte/demo_bauen.py; not part of the app.
(() => {
  const realFetch = window.fetch.bind(window);
  let sim = null; // the newest simulated block, once there is one
  const file = (path) => "demo-data/" + path.replace(/^\/api\//, "").replace(/[/?=]/g, "_") + ".json";
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  window.fetch = async (input, options = {}) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.startsWith("/api/")) return realFetch(input, options);
    if ((options.method || "GET") !== "GET") return reply({ error: "This is a demo: nothing here changes a node." }, 403);
    const res = await realFetch(file(url));
    if (!res.ok) return res;
    const data = await res.json();
    // The status poll would put the snapshot's height back under a simulated block.
    if (url === "/api/status" && sim) data.blockHeight = sim.blockHeight;
    return reply(data);
  };

  // /api/events: the snapshot's block once on connect, as the server does, then whatever the button plays.
  const listeners = [];
  let base = null;
  realFetch(file("/api/event_block")).then((r) => r.json()).then((b) => { base = b; emit(b); }).catch(() => {});
  function emit(block) {
    const e = new MessageEvent("block", { data: JSON.stringify(block) });
    for (const fn of listeners) fn(e);
  }
  window.EventSource = class {
    constructor() { this.readyState = 1; }
    addEventListener(type, fn) { if (type === "block") listeners.push(fn); }
    close() { this.readyState = 2; }
  };
  window.EventSource.CLOSED = 2;

  const POOLS = ["Foundry USA", "AntPool", "ViaBTC", "F2Pool", "SpiderPool", "MARA Pool"];
  async function play() {
    if (!base) return;
    const prev = sim || base;
    // The peer that delivers it: one of the best in the snapshot's ranking, as on a real node.
    const ranking = await (await realFetch(file("/api/peers/ranking"))).json();
    const best = ranking.filter((p) => p.live && p.firstPct > 20);
    const peer = best.length ? best[Math.floor(Math.random() * best.length)] : ranking[0];
    const hash = "00000000000000000000" + [...crypto.getRandomValues(new Uint8Array(22))].map((b) => b.toString(16).padStart(2, "0")).join("");
    sim = { ...prev, id: prev.id + 1, blockHash: hash.slice(0, 64), blockHeight: prev.blockHeight + 1, detectedAt: Date.now(),
      pool: null, poolName: null, poolTag: null, firstPeers: [{ address: peer.address, trustedLabel: peer.trustedLabel || null }] };
    emit(sim);
    // The pool is read from the coinbase a few seconds later, as on a real node.
    const name = POOLS[Math.floor(Math.random() * POOLS.length)];
    setTimeout(() => { sim = { ...sim, pool: name, poolName: name }; emit(sim); }, 3000);
  }
  document.addEventListener("click", (e) => { if (e.target.closest("#demo-block")) play(); });
})();
