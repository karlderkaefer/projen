import { Project } from "./project";
import { synthSnapshot } from "./util/synth";

/**
 * A Testing static class with a .synth helper for getting a snapshots of construct outputs.
 * Useful for snapshot testing with Jest.
 *
 * @example `expect(Testing.synth(someProject)).toMatchSnapshot()`
 */
export class Testing {
  /**
   * Produces a simple JS object that represents the contents of the projects with field names being file paths.
   * @param project the project to produce a snapshot for
   * @return { [filename:string]: any }
   */
  public static synth(project: Project): Record<string, any> {
    return synthSnapshot(project);
  }

  private constructor() {} // utility
}
