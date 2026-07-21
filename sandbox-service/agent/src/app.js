import express from "express";
import morgan from "morgan";
import fs from "fs";
import path from "path";

const DEFAULT_WORKSPACE_ROOT = process.env.SANDBOX_WORKSPACE_ROOT || "/workspace";
const FALLBACK_WORKSPACE_ROOT = path.resolve(process.cwd(), ".sandbox-workspace");

const getWorkspaceRoot = async () => {
  const preferredRoot = process.env.SANDBOX_WORKSPACE_ROOT || DEFAULT_WORKSPACE_ROOT;
  try {
    await fs.promises.access(preferredRoot, fs.constants.W_OK);
    return preferredRoot;
  } catch {
    await fs.promises.mkdir(FALLBACK_WORKSPACE_ROOT, { recursive: true });
    return FALLBACK_WORKSPACE_ROOT;
  }
};

const WORKING_DIR = await getWorkspaceRoot();

const resolveWorkspacePath = (file) => {
  const normalizedFile = file.trim();
  const withoutWorkspacePrefix = normalizedFile.replace(/^\/workspace\/?/, "");
  const candidatePath = withoutWorkspacePrefix.startsWith("/")
    ? withoutWorkspacePrefix.slice(1)
    : withoutWorkspacePrefix;

  return path.resolve(WORKING_DIR, candidatePath);
};

const toWorkspaceRelativePath = (resolvedPath) => {
  const relativePath = path.relative(WORKING_DIR, resolvedPath);
  return `/${relativePath.replace(/\\/g, "/")}`;
};

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
    const files = await listFiles(WORKING_DIR, "");
    res.status(200).json({
      message: "Files listed successfully",
      status: "success",
      files: files,
    });
  } catch (err) {
    console.error("list-files error:", err);
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
      const normalizedFile = file.trim();
      const resolvedPath = resolveWorkspacePath(normalizedFile);
      const relativePath = path.relative(WORKING_DIR, resolvedPath);

      if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        return {
          [normalizedFile]: `Error reading file: path escapes workspace`,
        };
      }

      try {
        const content = await fs.promises.readFile(resolvedPath, "utf-8");
        return {
          [toWorkspaceRelativePath(resolvedPath)]: content,
        };
      } catch (err) {
        return {
          [toWorkspaceRelativePath(resolvedPath)]: `Error reading file: ${err.message}`,
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

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({
      message:
        "Invalid request body. Expected an JSON object with an 'updates' property containing an array of file updates.",
      status: "error",
    });
  }

  const normalizedUpdates = updates.map((update) => {
    if (typeof update === "string") {
      return { file: update, content: "" };
    }

    return update;
  });

  const results = await Promise.all(
    normalizedUpdates.map(async (update) => {
      const { file, content } = update;

      if (typeof file !== "string" || typeof content !== "string") {
        return {
          ["invalid-update"]: "Each update entry must contain string 'file' and 'content' fields.",
        };
      }

      const normalizedFile = file.trim();
      const resolvedPath = resolveWorkspacePath(normalizedFile);
      const relativePath = path.relative(WORKING_DIR, resolvedPath);

      if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        return {
          [normalizedFile]: `Error updating file: path escapes workspace`,
        };
      }

      try {
        await fs.promises.mkdir(path.dirname(resolvedPath), { recursive: true });
        await fs.promises.writeFile(resolvedPath, content, "utf-8");
        return {
          [toWorkspaceRelativePath(resolvedPath)]: "File updated successfully",
        };
      } catch (err) {
        return {
          [toWorkspaceRelativePath(resolvedPath)]: `Error updating file: ${err.message}`,
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
      const normalizedFile = file.trim();
      const resolvedPath = resolveWorkspacePath(normalizedFile);
      const relativePath = path.relative(WORKING_DIR, resolvedPath);

      if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        return {
          [normalizedFile]: `Error creating file: path escapes workspace`,
        };
      }

      try {
        await fs.promises.mkdir(path.dirname(resolvedPath), { recursive: true });
        await fs.promises.writeFile(resolvedPath, content, "utf-8");
        return {
          [toWorkspaceRelativePath(resolvedPath)]: "File created successfully",
        };
      } catch (err) {
        return {
          [toWorkspaceRelativePath(resolvedPath)]: `Error creating file: ${err.message}`,
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
