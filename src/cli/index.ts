import { resolve } from "path";
import * as yargs from "yargs";
import { PROJEN_RC, PROJEN_VERSION } from "../common";
import { TaskRuntime } from "../task-runtime";
import { synth } from "./synth";
import { discoverTaskCommands } from "./tasks";

const DEFAULT_RC = resolve(PROJEN_RC);

async function main() {
  const ya = yargs;
  ya.commandDir("cmds");

  const runtime = new TaskRuntime(".");
  discoverTaskCommands(runtime, ya);

  ya.recommendCommands();
  ya.strictCommands();
  ya.showHelpOnFail(false);
  ya.wrap(yargs.terminalWidth());
  ya.option("post", {
    type: "boolean",
    default: true,
    desc: "Run post-synthesis steps such as installing dependencies. Use --no-post to skip",
  });
  ya.option("watch", {
    type: "boolean",
    default: false,
    desc: "Keep running and resynthesize when projenrc changes",
    alias: "w",
  });
  ya.options("debug", { type: "boolean", default: false, desc: "Debug logs" });
  ya.options("rc", {
    desc: "path to .projenrc.js file",
    default: DEFAULT_RC,
    type: "string",
  });
  ya.completion();
  ya.help();

  // do not use the default yargs '--version' implementation since it is
  // global by default (it appears on all subcommands)
  ya.version(false);
  ya.option("version", {
    type: "boolean",
    description: "Show version number",
    global: false,
  });

  const args = ya.argv;

  if (args.debug) {
    process.env.DEBUG = "true";
  }

  // no command means synthesize
  if (args._.length === 0) {
    if (args.version) {
      console.log(PROJEN_VERSION);
      process.exit(0);
    }
    await synth(runtime, {
      post: args.post as boolean,
      watch: args.watch as boolean,
      rcfile: args.rc as string,
    });
  }
}

main().catch((e) => {
  console.error(e.stack);
  process.exit(1);
});
