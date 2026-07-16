import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_competitions",
  title: "List competitions",
  description: "List available competitions (leagues/cups) in the database. Optionally filter by name.",
  inputSchema: {
    query: z.string().trim().optional().describe("Optional filter for competition name."),
    limit: z.number().int().min(1).max(100).optional().describe("Max results (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    let q = sb().from("competition_stats").select("*").limit(limit ?? 50);
    if (query) q = q.ilike("competition_name", `%${query}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { competitions: data ?? [] },
    };
  },
});
