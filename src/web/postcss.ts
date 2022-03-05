import { NodeProject } from "../javascript";
import { JsonFile } from "../json";
import { TailwindConfig, TailwindConfigOptions } from "./tailwind";

export interface PostCssOptions {
  /**
   * @default "postcss.config.json"
   */
  readonly fileName?: string;

  /**
   * Install Tailwind CSS as a PostCSS plugin.
   *
   * @default true
   */
  readonly tailwind?: boolean;

  /**
   * Tailwind CSS options.
   */
  readonly tailwindOptions?: TailwindConfigOptions;
}

/**
 * Declares a PostCSS dependency with a default config file.
 */
export class PostCss {
  public readonly fileName: string;
  public readonly file: JsonFile;
  public readonly tailwind?: TailwindConfig;

  constructor(project: NodeProject, options?: PostCssOptions) {
    this.fileName = options?.fileName ?? "postcss.config.json";

    project.addDeps("postcss");

    const config: { [key: string]: any } = { plugins: {} };

    if (options?.tailwind ?? true) {
      config.plugins.tailwindcss = {};
      config.plugins.autoprefixer = {};
      this.tailwind = new TailwindConfig(project, options?.tailwindOptions);
      project.addDeps("tailwindcss", "autoprefixer");
    }

    this.file = new JsonFile(project, this.fileName, {
      obj: config,
      marker: false,
    });

    project.npmignore?.exclude(`/${this.fileName}`);
  }
}
