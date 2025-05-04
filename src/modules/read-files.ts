import { promises as fs } from "fs";
import path from "path";

/**
 * Gets absolute path from a relative path
 * @param relativePath Path relative to project root
 * @returns Absolute path
 */
export function getAbsolutePath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}

/**
 * Lists all files and folders in a directory with exclusion filters
 * @param directoryPath Path to the directory to read
 * @returns Promise that resolves to an object containing arrays of file and folder paths
 */
export async function listDirectoryContents(
  directoryPath: string
): Promise<{ files: string[]; folders: string[] }> {
  // Convert to absolute path if it's not already
  const absolutePath = path.isAbsolute(directoryPath)
    ? directoryPath
    : getAbsolutePath(directoryPath);

  try {
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });

    const files: string[] = [];
    const folders: string[] = [];

    // Define excluded directories
    const excludedDirs = ["node_modules", ".git", "dist"];

    // Define excluded files
    const excludedFiles = [
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "api-docs.json",
      "webpack.config.js",
      ".gitignore",
    ];

    for (const entry of entries) {
      const fullPath = path.join(absolutePath, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (!excludedDirs.includes(entry.name)) {
          folders.push(fullPath);
        }
      } else if (entry.isFile()) {
        // Skip excluded files
        if (!excludedFiles.includes(entry.name)) {
          files.push(fullPath);
        }
      }
    }

    return { files, folders };
  } catch (error) {
    console.error(`Error reading directory ${absolutePath}:`, error);
    throw error;
  }
}

/**
 * Reads all files in a directory and returns their paths
 * @param directoryPath Path to the directory to read
 * @param recursive Whether to read subdirectories recursively (default: false)
 * @param filter Optional filter function to include only specific files
 * @returns Promise that resolves to an array of file paths
 */
export async function readAllFiles(
  directoryPath: string,
  recursive: boolean = false,
  filter?: (filePath: string) => boolean
): Promise<string[]> {
  // Convert to absolute path if it's not already
  const absolutePath = path.isAbsolute(directoryPath)
    ? directoryPath
    : getAbsolutePath(directoryPath);

  try {
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });

    let filePaths: string[] = [];

    // Define excluded directories at function scope
    const excludedDirs = ["node_modules", ".git", "dist"];

    // Internal exclusion filter
    const internalFilter = (filePath: string): boolean => {
      // Check if path contains any excluded directory
      if (excludedDirs.some((dir) => filePath.includes(dir))) {
        return false;
      }

      // Array of excluded files
      const excludedFiles = [
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "api-docs.json",
        "webpack.config.js",
        ".gitignore",
      ];
      const fileName = path.basename(filePath);
      if (excludedFiles.includes(fileName)) {
        return false;
      }

      // Apply additional filter if provided
      return filter ? filter(filePath) : true;
    };

    for (const entry of entries) {
      const fullPath = path.join(absolutePath, entry.name);

      // Skip excluded directories early
      if (entry.isDirectory() && excludedDirs.includes(entry.name)) {
        continue;
      }

      if (entry.isDirectory() && recursive) {
        const subDirFiles = await readAllFiles(fullPath, recursive, filter);
        filePaths = [...filePaths, ...subDirFiles];
      } else if (entry.isFile()) {
        if (internalFilter(fullPath)) {
          filePaths.push(fullPath);
        }
      }
    }

    return filePaths;
  } catch (error) {
    console.error(`Error reading directory ${absolutePath}:`, error);
    throw error;
  }
}

/**
 * Reads all files in a directory and returns their contents
 * @param directoryPath Path to the directory to read
 * @param recursive Whether to read subdirectories recursively (default: false)
 * @param filter Optional filter function to include only specific files
 * @returns Promise that resolves to an array of objects with path and content
 */
export async function readAllFileContents(
  directoryPath: string,
  recursive: boolean = false,
  filter?: (filePath: string) => boolean
): Promise<Array<{ path: string; content: string }>> {
  const filePaths = await readAllFiles(directoryPath, recursive, filter);

  const fileContents = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const content = await fs.readFile(filePath, "utf8");
        return { path: filePath, content };
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return { path: filePath, content: "" };
      }
    })
  );

  return fileContents;
}
