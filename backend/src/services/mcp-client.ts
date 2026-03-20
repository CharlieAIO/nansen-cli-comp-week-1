export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export class NansenMCPClient {
  private readonly endpoint = "https://mcp.nansen.ai/ra/mcp/";
  private readonly apiKey: string;
  private sessionId: string | null = null;
  private _tools: McpTool[] = [];
  private nextId = 1;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  get tools(): McpTool[] {
    return this._tools;
  }

  get connected(): boolean {
    return this.sessionId !== null && this._tools.length > 0;
  }

  async connect(): Promise<void> {
    await this.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: { roots: { listChanged: false } },
      clientInfo: { name: "nansen-arena", version: "1.0.0" },
    });
    await this.notify("notifications/initialized", {});
    const toolsResult = await this.send("tools/list", {}) as { tools?: McpTool[] };
    this._tools = toolsResult.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const result = await this.send("tools/call", { name, arguments: args }) as {
      content?: Array<{ type: string; text: string }>;
    };
    return result.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n") ?? "";
  }

  private async send(method: string, params: unknown): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "NANSEN-API-KEY": this.apiKey,
    };
    if (this.sessionId) headers["Mcp-Session-Id"] = this.sessionId;

    const res = await fetch(this.endpoint, { method: "POST", headers, body });

    const sid = res.headers.get("Mcp-Session-Id");
    if (sid) this.sessionId = sid;

    const contentType = res.headers.get("Content-Type") ?? "";
    if (contentType.includes("text/event-stream")) {
      const text = await res.text();
      return this.parseSSE(text);
    }

    const data = await res.json() as { result?: Record<string, unknown>; error?: unknown };
    if (data.error) throw new Error(`MCP error: ${JSON.stringify(data.error)}`);
    return data.result ?? {};
  }

  private async notify(method: string, params: unknown): Promise<void> {
    const body = JSON.stringify({ jsonrpc: "2.0", method, params });
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "NANSEN-API-KEY": this.apiKey,
    };
    if (this.sessionId) headers["Mcp-Session-Id"] = this.sessionId;
    await fetch(this.endpoint, { method: "POST", headers, body }).catch(() => {});
  }

  private parseSSE(text: string): Record<string, unknown> {
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          const json = JSON.parse(line.slice(6)) as { result?: Record<string, unknown>; error?: unknown };
          if (json.error) throw new Error(`MCP error: ${JSON.stringify(json.error)}`);
          if (json.result !== undefined) return json.result;
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("MCP error")) throw e;
        }
      }
    }
    return {};
  }
}
