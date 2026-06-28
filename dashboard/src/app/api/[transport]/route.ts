import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  logIdea, logContentIdea, addJournal, addTask, logTrade, logProject,
  updateClient, draftMessage, getToday,
} from "@/lib/kalebos-actions";

const text = (o: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(o) }] });

const mcp = createMcpHandler(
  (server) => {
    server.registerTool("get_today",
      { title: "Get today's context", description: "Kaleb OS snapshot: content ideas, open tasks, drafted scripts, active clients, open leads. Call this to know what's going on.", inputSchema: {} },
      async () => text(await getToday()));

    server.registerTool("log_idea",
      { title: "Log an idea", description: "Capture a general idea/thought Kaleb says into Kaleb OS.", inputSchema: { idea: z.string(), category: z.string().optional() } },
      async (a) => text(await logIdea(a)));

    server.registerTool("log_content_idea",
      { title: "Log a content idea", description: "Save a content idea for a brand. brand = me | ai | trading | a client slug.", inputSchema: { brand: z.string(), hook: z.string(), platform: z.enum(["reels", "linkedin", "x", "youtube"]).optional() } },
      async (a) => text(await logContentIdea(a)));

    server.registerTool("add_journal",
      { title: "Add a journal entry", description: "Save a meditation/reflection/gratitude journal entry.", inputSchema: { content: z.string(), kind: z.enum(["meditation", "reflection", "gratitude", "note"]).optional() } },
      async (a) => text(await addJournal(a)));

    server.registerTool("add_task",
      { title: "Add a task/reminder", description: "Add a to-do or reminder.", inputSchema: { title: z.string(), deadline: z.string().optional(), category: z.string().optional() } },
      async (a) => text(await addTask(a)));

    server.registerTool("log_trade",
      { title: "Log a trade", description: "Log a trade with the spoken process (transcript). Screenshots get attached on the Trades page.", inputSchema: { transcript: z.string(), symbol: z.string().optional(), side: z.enum(["long", "short"]).optional(), pnl: z.number().optional(), outcome: z.enum(["win", "loss", "breakeven"]).optional(), notes: z.string().optional() } },
      async (a) => text(await logTrade(a)));

    server.registerTool("log_project",
      { title: "Log a project update", description: "Record a project update (e.g. building Kaleb OS, DRYP Ledger). Creates the project if new.", inputSchema: { name: z.string(), note: z.string(), status: z.string().optional() } },
      async (a) => text(await logProject(a)));

    server.registerTool("update_client",
      { title: "Update a client", description: "Update a DRYP client by name: set health, move a lead's stage, and/or attach a note.", inputSchema: { name: z.string(), health: z.enum(["excellent", "good", "at_risk", "churning", "new"]).optional(), lead_stage: z.string().optional(), note: z.string().optional() } },
      async (a) => text(await updateClient(a)));

    server.registerTool("draft_message",
      { title: "Draft a message (needs approval)", description: "Draft an email/text to send. NEVER auto-sends — goes to Kaleb's approval queue.", inputSchema: { channel: z.enum(["email", "text", "dm"]), to: z.string(), body: z.string() } },
      async (a) => text(await draftMessage(a)));
  },
  {},
  { basePath: "/api", maxDuration: 60 }
);

// Simple bearer/key gate (MCP_SECRET). Open when unset (local dev).
function authorized(req: Request): boolean {
  const secret = process.env.MCP_SECRET;
  if (!secret) return true;
  const h = req.headers.get("authorization");
  if (h === `Bearer ${secret}`) return true;
  try { return new URL(req.url).searchParams.get("key") === secret; } catch { return false; }
}
async function guarded(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  return mcp(req);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
