const fs = require("fs");
const { spawnSync } = require("child_process");

const CODE_PATH = "/tmp/code";
const WORK_DIR = "/tmp/codecollab";

const language = process.env.LANGUAGE;

fs.mkdirSync(WORK_DIR, { recursive: true });

const code = fs.readFileSync(CODE_PATH, "utf8");

const runCommand = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: WORK_DIR,
    encoding: "utf8",
    timeout: 5000,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

// --------------------------------------------------
// JAVASCRIPT
// --------------------------------------------------

if (language === "javascript") {
  try {
    eval(code);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

// --------------------------------------------------
// PYTHON
// --------------------------------------------------

else if (language === "python") {
  const filePath = `${WORK_DIR}/main.py`;

  fs.writeFileSync(filePath, code);

  runCommand("python3", [filePath]);
}

// --------------------------------------------------
// JAVA
// --------------------------------------------------

else if (language === "java") {
  const filePath = `${WORK_DIR}/Main.java`;

  fs.writeFileSync(filePath, code);

  const compile = spawnSync(
    "javac",
    [filePath],
    {
      cwd: WORK_DIR,
      encoding: "utf8",
      timeout: 5000,
    }
  );

  if (compile.error) {
    console.error(compile.error.message);
    process.exit(1);
  }

  if (compile.status !== 0) {
    console.error(
      compile.stderr || "Java compilation failed"
    );

    process.exit(1);
  }

  runCommand("java", [
    "-cp",
    WORK_DIR,
    "Main",
  ]);
}

// --------------------------------------------------
// C++
// --------------------------------------------------

else if (language === "cpp") {
  const sourcePath = `${WORK_DIR}/main.cpp`;
  const executablePath = `${WORK_DIR}/main`;

  fs.writeFileSync(sourcePath, code);

  const compile = spawnSync(
    "g++",
    [
      sourcePath,
      "-o",
      executablePath,
    ],
    {
      cwd: WORK_DIR,
      encoding: "utf8",
      timeout: 5000,
    }
  );

  if (compile.error) {
    console.error(compile.error.message);
    process.exit(1);
  }

  if (compile.status !== 0) {
    console.error(
      compile.stderr || "C++ compilation failed"
    );

    process.exit(1);
  }

  runCommand(executablePath, []);
}

// --------------------------------------------------
// UNSUPPORTED LANGUAGE
// --------------------------------------------------

else {
  console.error(
    `Unsupported language: ${language}`
  );

  process.exit(1);
}