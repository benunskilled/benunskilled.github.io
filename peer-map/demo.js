// Demo of Peer Map: serves api/peers from the snapshot, keeps the block's age running, and plays a new block on
// demand. Built into the demo by Skripte/demo_bauen.py; not part of the app.
(() => {
  const realFetch = window.fetch.bind(window);
  const loadedAt = Date.now();
  let snap = null, simAt = 0;
  const POOLS = ["Foundry USA", "AntPool", "ViaBTC", "F2Pool", "SpiderPool", "MARA Pool"];
  window.fetch = async (input, options) => {
    const url = typeof input === "string" ? input : input.url;
    if (!/^(\.\/)?api\/peers/.test(url)) return realFetch(input, options);
    if (!snap) snap = await (await realFetch("api/peers")).json();
    const d = structuredClone(snap);
    // The age as if the page had been asking all along, from the snapshot's block or the simulated one.
    if (d.last_block) d.last_block.age_ms = simAt ? Date.now() - simAt : d.last_block.age_ms + (Date.now() - loadedAt);
    d.next_in = 10;
    return new Response(JSON.stringify(d), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  async function play() {
    if (!snap) return;
    const b = snap.last_block;
    // Delivered by one of your outbound or manual peers, as most blocks are.
    const out = snap.peers.filter((p) => p.group !== "inbound" && p.network === "ipv4");
    const peer = out[Math.floor(Math.random() * out.length)];
    const name = POOLS[Math.floor(Math.random() * POOLS.length)];
    const hash = "00000000000000000000" + [...crypto.getRandomValues(new Uint8Array(22))].map((x) => x.toString(16).padStart(2, "0")).join("");
    snap.last_block = { ...b, hash: hash.slice(0, 64), height: b.height + 1, pool: name, pool_name: name, pool_source: "address", first_peers: peer ? [peer.addr] : [] };
    simAt = Date.now();
    snap.fetched_at = Math.floor(simAt / 1000);
    // The page asks again when it becomes visible; that is the quickest way in without touching the app.
    document.dispatchEvent(new Event("visibilitychange"));
  }
  document.addEventListener("click", (e) => { if (e.target.closest("#demo-block")) play(); });
})();
