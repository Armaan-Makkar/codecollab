
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");

const executeCodeInDocker = (code, language) => {
  return new Promise((resolve) => {
    const executionId = crypto.randomUUID();

    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `codecollab-${executionId}-`)
    );

    const codePath = path.join(tempDir, "code");

    fs.writeFileSync(codePath, code);

    const dockerArgs = [
      "run",
      "--rm",

      // Network isolation
      "--network",
      "none",

      // Resource limits
      "--memory",
      "128m",
      "--cpus",
      "0.5",
      "--pids-limit",
      "50",

      // Language
      "-e",
      `LANGUAGE=${language}`,

      // Read-only code mount
      "-v",
      `${codePath}:/tmp/code:ro`,

      // Docker image
      "codecollab-runner",
    ];

    execFile(
      "docker",
      dockerArgs,
      {
        timeout: 5000,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        // Cleanup temporary files
        try {
          fs.rmSync(tempDir, {
            recursive: true,
            force: true,
          });
        } catch (cleanupError) {
          console.error(
            "Cleanup error:",
            cleanupError.message
          );
        }

        // Execution failed
        if (error) {
          resolve({
            success: false,
            output: stdout || "",
            error: stderr || error.message,
          });

          return;
        }

        // Execution successful
        resolve({
          success: true,
          output: stdout || "",
          error: stderr || "",
        });
      }
    );
  });
};

const executeCode = async (code, language) => {
  if (!code || typeof code !== "string") {
    throw new Error("Code is required");
  }

  const supportedLanguages = [
    "javascript",
    "python",
    "java",
    "cpp",
  ];

  if (!supportedLanguages.includes(language)) {
    throw new Error(
      `Unsupported language: ${language}`
    );
  }

  return executeCodeInDocker(code, language);
};

module.exports = {
  executeCode,
};

