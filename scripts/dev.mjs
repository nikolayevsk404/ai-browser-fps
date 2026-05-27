import { spawn } from "node:child_process";

const processes = [
  ["shared", ["run", "dev", "-w", "shared"]],
  ["server", ["run", "dev", "-w", "server"]],
  ["client", ["run", "dev", "-w", "client"]]
];

let clientUrl = null;

const children = processes.map(([name, args]) => {
  const child = spawn("npm", args, {
    detached: process.platform !== "win32",
    stdio: ["inherit", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => handleOutput(name, chunk));
  child.stderr.on("data", (chunk) => handleOutput(name, chunk));

  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      shutdown(code ?? (signal ? 1 : 0));
    }
  });

  return { name, child };
});

let shuttingDown = false;

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));
process.on("exit", () => killChildren());

function handleOutput(name, chunk) {
  const text = chunk.toString();
  process.stdout.write(text);

  if (name === "server" && text.includes("Server listening")) {
    console.log(`Game client available at ${clientUrl ?? "http://localhost:5173/"}`);
    return;
  }

  if (name !== "client") {
    return;
  }

  const match = text.match(/Local:\s+(http:\/\/localhost:\d+\/?)/);
  if (!match || match[1] === clientUrl) {
    return;
  }

  clientUrl = match[1];
  console.log(`Game client available at ${clientUrl}`);
}

function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  killChildren();
  setTimeout(() => process.exit(exitCode), 250);
}

function killChildren() {
  for (const { child } of children) {
    if (child.killed || child.exitCode !== null) {
      continue;
    }

    try {
      if (process.platform === "win32") {
        child.kill("SIGTERM");
      } else {
        process.kill(-child.pid, "SIGTERM");
      }
    } catch {
      child.kill("SIGTERM");
    }
  }
}
