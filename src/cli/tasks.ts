import * as chalk from "chalk";
import * as yargs from "yargs";
import * as logging from "../logging";
import { TaskRuntime } from "../task-runtime";

/**
 * Reads .projen/tasks.json and adds CLI commands for all tasks.
 * @param ya yargs
 */
export function discoverTaskCommands(runtime: TaskRuntime, ya: yargs.Argv) {
  const tasks = runtime.manifest.tasks ?? {};
  for (const task of Object.values(tasks)) {
    ya.command(
      task.name,
      task.description ?? "",
      taskCommandHandler(task.name)
    );
  }

  function taskCommandHandler(taskName: string) {
    return (args: yargs.Argv) => {
      args.option("inspect", {
        alias: "i",
        desc: "show all steps in this task",
      });

      const argv = args.argv;

      if (argv.inspect) {
        return inspectTask(taskName);
      } else {
        try {
          runtime.runTask(taskName);
        } catch (e) {
          logging.error(e.message);
          process.exit(1);
        }
      }
    };
  }

  function inspectTask(name: string, indent = 0) {
    const writeln = (s: string) => console.log(" ".repeat(indent) + s);

    const task = runtime.tryFindTask(name);
    if (!task) {
      throw new Error(`${name}: unable to resolve subtask with name "${name}"`);
    }

    if (task.description) {
      writeln(`${chalk.underline("description")}: ${task.description}`);
    }

    for (const [k, v] of Object.entries(task.env ?? {})) {
      writeln(`${chalk.underline("env")}: ${k}=${v}`);
    }

    for (const step of task.steps ?? []) {
      if (step.spawn) {
        writeln(`- ${chalk.bold(step.spawn)}`);
        inspectTask(step.spawn, indent + 2);
      } else if (step.exec) {
        writeln(`- exec: ${step.exec}`);
      } else if (step.builtin) {
        writeln(`- builtin: ${step.builtin}`);
      }
    }
  }
}
