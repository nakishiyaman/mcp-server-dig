/**
 * MCP tool response helpers.
 *
 * Provides consistent response formatting across all tools,
 * including proper isError flag usage and output truncation.
 */

const MAX_OUTPUT_LENGTH = 50_000;

type McpTextContent = { type: "text"; text: string };
type McpToolResponse = {
  content: McpTextContent[];
  isError?: boolean;
};

/** Build a successful MCP response, truncating if necessary. */
export function successResponse(text: string): McpToolResponse {
  if (text.length > MAX_OUTPUT_LENGTH) {
    const truncated =
      text.slice(0, MAX_OUTPUT_LENGTH) +
      `\n\n[Output truncated at ${MAX_OUTPUT_LENGTH} characters]`;
    return { content: [{ type: "text", text: truncated }] };
  }
  return { content: [{ type: "text", text }] };
}

/** Build an error MCP response with isError: true. */
export function errorResponse(error: unknown): McpToolResponse {
  const message =
    error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}
