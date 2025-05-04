import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readAllFileContents } from "./read-files";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import path from "path";
import fs from "fs";
import { importApiDocumentation } from "./theneo";
const OPENAI_API_KEY = "";

export function registerTools(server: McpServer) {
  // Read file tool
  server.tool(
    "write-or-updatedocs",
    "Write or update docs for api",
    {
      title: "Test",
    },
    async () => {
      try {
        const filePath = path.join(__dirname, "openapi.json");
        let currentApiContent = "There is no current openapi docs";
        if (fs.existsSync(filePath)) {
          currentApiContent = fs.readFileSync(filePath, "utf-8");
        }
        const contents = await readAllFileContents("src", true);
        const llm = new ChatOpenAI({
          model: "gpt-4o",
          apiKey: OPENAI_API_KEY,
        });

        const prompt = PromptTemplate.fromTemplate(
          `I want to create docs based on this codebase.
          I want to create openapi docs. I need Json format for openapi docs, json.
          return json in \`\`\`json\`\`\` format.
          There is current openapi docs:
          {currentApiContent}

          Codebase: {codebase}`
        );
        const chain = new LLMChain({
          llm,
          prompt,
        });

        const response = await chain.invoke({
          codebase: JSON.stringify(contents),
          currentApiContent,
        });
        try {
          const jsonString = extractJsonFromMarkdown(response.text);
          if (jsonString) {
            const json = JSON.parse(jsonString);
            fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
            await importApiDocumentation(json);
            return {
              content: [{ type: "text", text: JSON.stringify(json) }],
            };
          }
          throw new Error("No JSON found in the response");
        } catch (error) {
          console.error(`[write-docs] Error reading files: src`, error);
          throw new Error(`Error reading files: src`);
        }
      } catch (error) {
        console.error(`[write-docs] Error in docs generation:`, error);
        throw error;
      }
    }
  );
}

function extractJsonFromMarkdown(response: string): string | null {
  const match = response.match(/```json\s*([\s\S]*?)\s*```/);
  return match ? match[1].trim() : null;
}
