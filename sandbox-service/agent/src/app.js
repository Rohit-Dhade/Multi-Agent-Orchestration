import express from "express";
import morgan from "morgan";
import fs from "fs";
import path from "path";

const WORKING_DIR = "/workspace";

const app = express();
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Sandbox Service Agent!",
    status: "success",
  });
});

/**
 * @route GET /list-files
 * @description Lists all files in the working directory and its subdirectories. Returns a JSON object containing the file paths relative to the working directory. Exclude directories like node_modules, .git, or dist.
 * @example .{
 *  "files":[
 *  "file1.txt",
 *  "src/file2.txt",
 *  "src/subdir/file3.txt"
 * ]
 * }
 */

app.get("/list-files", async (req, res) => {
  const listFiles = async (dir, basedir) => {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basedir, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === "dist"
        ) {
          continue; // Skip excluded directories
        }
        const subFiles = await listFiles(fullPath, relativePath);
        files.push(...subFiles);
      } else {
        files.push(relativePath);
      }
    }

    return files;
  };

  try {
    const files = await listFiles(WORKING_DIR, WORKING_DIR);
    res.status(200).json({
      message: "Files listed successfully",
      status: "success",
      files: files,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error occurred while listing files",
      status: "error",
    });
  }
});

/**
 * @route GET /read-files
 * @desc Read the contents of specified files in the working directory
 * @queryParam {string} files - Comma-separated list of file names to read
 * @returns {object} JSON object containing the contents of the specified files or error messages
 * @example GET /read-files?files=file1.txt,file2.txt
 *
 */

app.get("/read-files", async (req, res) => {
  const files = req.query.files;

  if (!files) {
    return res.status(400).json({
      message: "No files specified in the query parameters",
      status: "error",
    });
  }

  const fileList = files.split(",");

  const result = await Promise.all(
    fileList.map(async (file) => {
      const filePath = `${WORKING_DIR}/${file}`;
      try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        return {
          [filePath.replace(WORKING_DIR, "")]: content,
        };
      } catch (err) {
        return {
          [filePath.replace(WORKING_DIR, "")]: `Error reading file: ${err.message}`,
        };
      }
    }),
  );

  return res.status(200).json({
    message: "File read results",
    results: result,
    status: "success",
  });
});

/**
 * @route PATCH /update-file
 * @description Update the contents of a specified file in the request body. The request body should be a json array of
 * objects, each containing a "file" key with the file name and a "content" key with the new content for that file.
 */

app.patch("/update-files", async (req, res) => {
  const updates = req.body.updates;

  if (!Array.isArray(updates) || !updates) {
    return res.status(400).json({
      message:
        "Invalid request body. Expected an JSON object with an 'updates' property containing an array of file updates.",
      status: "error",
    });
  }

  const results = await Promise.all(
    updates.map(async (update) => {
      const { file, content } = update;
      const filePath = path.join(WORKING_DIR, file);

      try {
        await fs.promises.writeFile(filePath, content, "utf-8");
        return {
          [filePath.replace(WORKING_DIR, "")]: "File updated successfully",
        };
      } catch (err) {
        return {
          [filePath.replace(WORKING_DIR, "")]: `Error updating file: ${err.message}`,
        };
      }
    }),
  );

  res.status(200).json({
    message: "File update results",
    results: results,
    status: "success",
  });
});

/**
 * @route POST /create-files
 * @description Create new files with the specified names and contents in the request body. The request body should be a JSON array of objects containing a "file" property specifying the file path and a "content" property with the content for that file.
 */

app.post("/create-files", async (req, res) => {
  const files = req.body.files;

  if (!Array.isArray(files) || !files) {
    return res.status(400).json({
      message: "Invalid request body. Expected an array of file objects.",
      status: "error",
    });
  }

  const results = await Promise.all(
    files.map(async (fileObj) => {
      const { file, content } = fileObj;
      const filePath = path.join(WORKING_DIR, file);

      try {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, content, "utf-8");
        return {
          [filePath.replace(WORKING_DIR, "")]: "File created successfully",
        };
      } catch (err) {
        return {
          [filePath.replace(WORKING_DIR, "")]: `Error creating file: ${err.message}`,
        };
      }
    }),
  );

  res.status(200).json({
    message: "File creation results",
    results: results,
    status: "success",
  });
});

export default app;
