import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import dotenv from "dotenv";

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateCode } from "./tools/generate-code.js";
import { checkBestPractices } from "./tools/best-practices.js";
import { autoCommitAndPush } from "./tools/github-commit.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Suppress console output to avoid interfering with stdio transport
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

// Redirect stdout logs to stderr to keep stdio clean for MCP protocol
console.log = (...args) => originalError("[LOG]", ...args);
console.warn = (...args) => originalError("[WARN]", ...args);
console.error = (...args) => originalError("[ERROR]", ...args);

dotenv.config({ path: join(__dirname, "./.env") });

const server = new McpServer({
    name: "Afnan_mcp",
    version: "1.0.0",
    capabilities: {
        resource: {},
        tools: {},
        prompts: {}
    }

})

server.tool(
    "generate-code",
    "Generate code based on description",
    {
        description: z.string(),
        language: z.string().default("javascript"),
        framework: z.string().optional(),
        rootpath: z.string()
    },
    {
        title: "Code Generator",
        readonlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
    },
    async (params) => {
        try {
            const data = await generateCode(params);
            return {
                content: [
                    { type: "text", text: JSON.stringify(data, null, 2) }
                ]
            }
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : String(error);
            return {
                content: [
                    { type: "text", text: errorMessage }
                ]
            }

        }
    }

);

//tool 2 : checking-best-practices
server.tool(
    "checking-best-practices",
    "Check code for best practives andcoding standaeds on description",
    {
        description: z.string(),
        language: z.string(),
        framework: z.string().optional(),
        strictMode: z.boolean().optional(),
    },
    {
        title: "best practices Chceker",
        readonlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    },
    async (params) => {
        try {
            return await checkBestPractices(params);
        } catch (error) {
            return {
                content: [
                    { type: "text", text: `Error checking best Practices: ${error.message}` }
                ]
            }

        }
    }

);

//tool 3 : github commit
server.tool(
    "github-commit",
    "Check code for best practives andcoding standaeds on description",
    {
        localPath: z.string(),
        repo: z.string(),
        branch: z.string(),
        message: z.string(),
    },
    {
        title: "Github Commit Tool",
        readonlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
    },
    async (params) => {
        try {
            await autoCommitAndPush(params);
        } catch (error) {
            return {
                content: [
                    { type: "text", text: `Error creating Github Commit: ${error.message}` }
                ]
            }

        }
        return {};
    });
async function main() {

    const transport = new StdioServerTransport();
    await server.connect(transport);

}

main()