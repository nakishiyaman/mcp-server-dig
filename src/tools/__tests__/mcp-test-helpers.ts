/**
 * MCP integration test helpers.
 * Provides a real MCP Client connected to the dig server via InMemoryTransport.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createSandboxServer } from "../../index.js";

let client: Client;
let closeHandles: { client: Client; closeTransports: () => Promise<void> };

/**
 * Create and connect an MCP client to the dig server.
 * Call once in beforeAll, and call closeMcpClient in afterAll.
 */
export async function createTestMcpClient(): Promise<Client> {
  const server = createSandboxServer();
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);

  client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);

  closeHandles = {
    client,
    closeTransports: async () => {
      await client.close();
      await server.close();
    },
  };

  return client;
}

/**
 * Close the MCP client and server transports.
 */
export async function closeMcpClient(): Promise<void> {
  if (closeHandles) {
    await closeHandles.closeTransports();
  }
}

/**
 * Extract text content from a callTool result.
 */
export function getToolText(
  result: Awaited<ReturnType<Client["callTool"]>>,
): string {
  const content = result.content as Array<{ type: string; text: string }>;
  return content[0].text;
}

/**
 * Check if a callTool result is an error response.
 */
export function isToolError(
  result: Awaited<ReturnType<Client["callTool"]>>,
): boolean {
  return result.isError === true;
}
