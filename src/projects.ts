import * as path from "path";
import * as vm from "vm";
import { resolveProjectType } from "./inventory";
import { renderJavaScriptOptions } from "./javascript/render-options";
import { InitProjectOptionHints } from "./option-hints";

export interface CreateProjectOptions {
  /**
   * Directory that the project will be generated in.
   */
  readonly dir: string;

  /**
   * Fully-qualified name of the project type (usually formatted
   * as `module.ProjectType`).
   * @example `projen.TypescriptProject`
   */
  readonly projectFqn: string;

  /**
   * Project options. Only JSON-like values can be passed in (strings,
   * booleans, numbers, enums, arrays, and objects that are not
   * derived from classes).
   *
   * Consult the API reference of the project type you are generating for
   * information about what fields and types are available.
   */
  readonly projectOptions: Record<string, any>;

  /**
   * Should we render commented-out default options in the projenrc file?
   * Does not apply to projenrc.json files.
   *
   * @default InitProjectOptionHints.FEATURED
   */
  readonly optionHints?: InitProjectOptionHints;

  /**
   * Should we call `project.synth()` or instantiate the project (could still
   * have side-effects) and render the .projenrc file.
   *
   * @default true
   */
  readonly synth?: boolean;

  /**
   * Should we execute post synthesis hooks? (usually package manager install).
   *
   * @default true
   */
  readonly post?: boolean;
}

/**
 * Programmatic API for projen.
 */
export class Projects {
  /**
   * Creates a new project with defaults.
   *
   * This function creates the project type in-process (with in VM) and calls
   * `.synth()` on it (if `options.synth` is not `false`).
   *
   * At the moment, it also generates a `.projenrc.js` file with the same code
   * that was just executed. In the future, this will also be done by the project
   * type, so we can easily support multiple languages of projenrc.
   */
  public static createProject(options: CreateProjectOptions) {
    createProject(options);
  }

  private constructor() {}
}

function createProject(opts: CreateProjectOptions) {
  const projectType = resolveProjectType(opts.projectFqn);

  // Default project resolution location
  let mod = "./index";

  // External projects need to load the module from the modules directory
  if (projectType.moduleName !== "projen") {
    try {
      mod = path.dirname(
        require.resolve(path.join(projectType.moduleName, "package.json"), {
          paths: [process.cwd()],
        })
      );
    } catch (err) {
      throw new Error(
        `External project module '${projectType.moduleName}' could not be resolved.`
      );
    }
  }

  // "dir" is exposed as a top-level option to require users to specify a value for it
  opts.projectOptions.outdir = opts.dir;

  // pass the FQN of the project type to the project initializer so it can
  // generate the projenrc file.
  const { renderedOptions } = renderJavaScriptOptions({
    bootstrap: true,
    comments: opts.optionHints ?? InitProjectOptionHints.FEATURED,
    type: projectType,
    args: opts.projectOptions,
    omitFromBootstrap: ["outdir"],
  });

  // generate a random variable name because jest tests appear to share
  // VM contexts, causing
  //
  // > SyntaxError: Identifier 'project' has already been declared
  //
  // errors if this isn't unique
  const varName = "project" + Math.random().toString(36).slice(2);
  const initProjectCode = `const ${varName} = new ${projectType.typename}(${renderedOptions});`;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require(mod);
  const ctx = vm.createContext(module);

  const synth = opts.synth ?? true;
  const postSynth = opts.post ?? true;
  process.env.PROJEN_DISABLE_POST = (!postSynth).toString();
  vm.runInContext(
    [initProjectCode, synth ? `${varName}.synth();` : ""].join("\n"),
    ctx
  );
}
