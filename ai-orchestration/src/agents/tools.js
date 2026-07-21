import axios from "axios";
import { tool } from "langchain";
import * as z from "zod";

/**
 * Creates sandbox tools bound to a specific sandbox agent service URL.
 * @param {string} sandboxServiceUrl - e.g. "http://sandbox-service-<id>:3000"
 */
export function createTools(sandboxServiceUrl) {
  const listfiles = tool(
    async ({}) => {
      console.log("=========================");
      console.log("using list files tool.");
      console.log("sandbox url:", sandboxServiceUrl);
      console.log("=========================");

      const response = await axios.get(`${sandboxServiceUrl}/list-files`);

      console.log("==========================");
      console.log("list files tool response:", response.data);
      console.log("==========================");

      return JSON.stringify(response.data.files);
    },
    {
      name: "listfiles",
      description:
        "List all files in the project directory. This is useful for understanding what files are available to work with.",
      schema: z.object({}),
    },
  );

  const readfiles = tool(
    async ({ files }) => {
      console.log("=========================");
      console.log("using read files tool.");
      console.log("=========================");

      const response = await axios.get(
        `${sandboxServiceUrl}/read-files?files=` + files.join(","),
      );

      console.log("==========================");
      console.log("read files tool response:", response.data);
      console.log("==========================");
      return JSON.stringify(response.data.results);
    },
    {
      name: "readfiles",
      description:
        "Read the contents of specified files. This is useful for examining the content of files that are relevant to the task at hand.",
      schema: z.object({
        files: z
          .array(z.string())
          .default([])
          .describe(
            "List of files absolute paths to read. These should be the files that were listed using listfiles tool or created later using the write_file tool.",
          ),
      }),
    },
  );

  const updateFiles = tool(
    async ({ files }) => {
      console.log("=========================");
      console.log("using update files tool.");
      console.log("=========================");

      const response = await axios.patch(
        `${sandboxServiceUrl}/update-files`,
        { updates: files },
      );

      console.log("==========================");
      console.log("update files tool response:", response.data);
      console.log("==========================");
      return JSON.stringify(response.data.results);
    },
    {
      name: "updateFiles",
      description:
        "Update the contents of specified files. This is useful for modifying the content of files that are relevant to the task at hand. This tool can also use to create new files by providing a new file name in the file field and the content to be added in the content field.",
      schema: z.object({
        files: z
          .array(
            z.object({
              file: z.string(),
              content: z.string(),
            }),
          )
          .default([])
          .describe(
            "List of file updates to apply. Each item should contain a file path and the new content.",
          ),
      }),
    },
  );

  return { listfiles, readfiles, updateFiles };
}
