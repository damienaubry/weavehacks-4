import http from "node:http";
import { loadRootEnv } from "@weavehacks/shared";
import { healthReport } from "./health";
import { runCompare } from "./compare";

loadRootEnv();

const PORT = Number(process.env.PORT ?? 3001);

/**
 * Brigade — orchestration runtime entrypoint. Exposes the spine's cross-cutting
 * endpoints (health + scoreboard). The hero-loop routes (Prep/Content/Critic) get
 * added next, on the direct-call orchestrator + W&B Inference runtime.
 */
const server = http.createServer(async (req, res) => {
  res.setHeader("content-type", "application/json");
  res.setHeader("access-control-allow-origin", "*");
  const url = (req.url ?? "/").split("?")[0];

  try {
    if (url === "/health") {
      const h = await healthReport();
      res.statusCode = h.ok ? 200 : 503;
      res.end(JSON.stringify(h, null, 2));
      return;
    }
    if (url === "/compare") {
      const board = await runCompare();
      res.end(JSON.stringify(board, null, 2));
      return;
    }
    if (url === "/" || url === "") {
      res.end(
        JSON.stringify(
          {
            name: "Brigade · orchestration runtime",
            project: "Brigade — multi-agent restaurant ops for Le Kyoto (see CLAUDE.md)",
            endpoints: ["/health", "/compare"],
          },
          null,
          2,
        ),
      );
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: (e as Error).message }));
  }
});

server.listen(PORT, () => {
  console.log(`[api] orchestration runtime on http://localhost:${PORT}  (/, /health, /compare)`);
});
