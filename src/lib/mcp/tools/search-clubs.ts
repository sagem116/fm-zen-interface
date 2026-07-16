import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_clubs",
  title: "Search clubs",
  description: "Search football clubs by name (case-insensitive partial match). Returns up to `limit` clubs with id, name and country.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Text to match against club names."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const { data, error } = await sb()
      .from("clubs")
      .select("id, name, country_id")
      .ilike("name", `%${query}%`)
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { clubs: data ?? [] },
    };
  },
});
