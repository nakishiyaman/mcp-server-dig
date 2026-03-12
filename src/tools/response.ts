/**
 * MCP tool response helpers.
 *
 * Provides consistent response formatting across all tools,
 * including proper isError flag usage and output truncation.
 */

import { z } from "zod";

const MAX_OUTPUT_LENGTH = 50_000;

type McpTextContent = { type: "text"; text: string };
type McpToolResponse = {
  content: McpTextContent[];
  isError?: boolean;
};

/** Zod schema for the output_format parameter shared by all tools. */
export const outputFormatSchema = z
  .enum(["text", "json"])
  .optional()
  .default("text")
  .describe("Output format: 'text' (default, human-readable) or 'json' (structured data)");

/**
 * Format a tool response in either text or JSON mode.
 *
 * @param data - The structured data object (used for JSON output)
 * @param textFormatter - A function that produces the human-readable text
 * @param outputFormat - "text" or "json"
 */
export function formatResponse(
  data: unknown,
  textFormatter: () => string,
  outputFormat: string,
): McpToolResponse {
  return outputFormat === "json"
    ? successResponse(JSON.stringify(data, null, 2))
    : successResponse(textFormatter());
}

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
