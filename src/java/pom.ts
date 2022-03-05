import { resolve } from "../_resolve";
import { Component } from "../component";
import {
  Dependencies,
  DependencyCoordinates,
  DependencyType,
} from "../dependencies";
import { Project } from "../project";
import { toMavenVersionRange } from "../util/semver";
import { XmlFile } from "../xmlfile";

const POM_XML_ATTRS = {
  "@xsi:schemaLocation":
    "http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd",
  "@xmlns": "http://maven.apache.org/POM/4.0.0",
  "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
};

/**
 * Options for `Pom`.
 */
export interface PomOptions {
  /**
   * This is generally unique amongst an organization or a project. For example,
   * all core Maven artifacts do (well, should) live under the groupId
   * org.apache.maven. Group ID's do not necessarily use the dot notation, for
   * example, the junit project. Note that the dot-notated groupId does not have
   * to correspond to the package structure that the project contains. It is,
   * however, a good practice to follow. When stored within a repository, the
   * group acts much like the Java packaging structure does in an operating
   * system. The dots are replaced by OS specific directory separators (such as
   * '/' in Unix) which becomes a relative directory structure from the base
   * repository. In the example given, the org.codehaus.mojo group lives within
   * the directory $M2_REPO/org/codehaus/mojo.
   * @default "org.acme"
   * @featured
   */
  readonly groupId: string;

  /**
   * The artifactId is generally the name that the project is known by. Although
   * the groupId is important, people within the group will rarely mention the
   * groupId in discussion (they are often all be the same ID, such as the
   * MojoHaus project groupId: org.codehaus.mojo). It, along with the groupId,
   * creates a key that separates this project from every other project in the
   * world (at least, it should :) ). Along with the groupId, the artifactId
   * fully defines the artifact's living quarters within the repository. In the
   * case of the above project, my-project lives in
   * $M2_REPO/org/codehaus/mojo/my-project.
   * @default "my-app"
   * @featured
   */
  readonly artifactId: string;

  /**
   * This is the last piece of the naming puzzle. groupId:artifactId denotes a
   * single project but they cannot delineate which incarnation of that project
   * we are talking about. Do we want the junit:junit of 2018 (version 4.12), or
   * of 2007 (version 3.8.2)? In short: code changes, those changes should be
   * versioned, and this element keeps those versions in line. It is also used
   * within an artifact's repository to separate versions from each other.
   * my-project version 1.0 files live in the directory structure
   * $M2_REPO/org/codehaus/mojo/my-project/1.0.
   * @default "0.1.0"
   * @featured
   */
  readonly version: string;

  /**
   * Project packaging format.
   *
   * @default "jar"
   */
  readonly packaging?: string;

  /**
   * Description of a project is always good. Although this should not replace
   * formal documentation, a quick comment to any readers of the POM is always
   * helpful.
   *
   * @default undefined
   * @featured
   */
  readonly description?: string;

  /**
   * The URL, like the name, is not required. This is a nice gesture for
   * projects users, however, so that they know where the project lives.
   *
   * @default undefined
   * @featured
   */
  readonly url?: string;
}

/**
 * A Project Object Model or POM is the fundamental unit of work in Maven. It is
 * an XML file that contains information about the project and configuration
 * details used by Maven to build the project.
 */
export class Pom extends Component {
  /**
   * The name of the pom file.
   */
  public readonly fileName: string;

  /**
   * Maven group ID.
   */
  public readonly groupId: string;

  /**
   * Maven artifact ID.
   */
  public readonly artifactId: string;

  /**
   * Project version.
   */
  public readonly version: string;

  /**
   * Maven packaging format.
   */
  public readonly packaging: string;

  /**
   * Project display name.
   */
  public readonly name?: string;

  /**
   * Project description.
   */
  public readonly description?: string;

  /**
   * Project URL.
   */
  public readonly url?: string;

  private readonly properties: Record<string, any> = {};

  constructor(project: Project, options: PomOptions) {
    super(project);

    this.fileName = "pom.xml";
    this.groupId = options.groupId;
    this.artifactId = options.artifactId;
    this.version = options.version;
    this.packaging = options.packaging ?? "jar";
    this.name = project.name;
    this.description = options.description;
    this.url = options.url;

    new XmlFile(project, this.fileName, { obj: () => this.synthPom() });
  }

  /**
   * Adds a key/value property to the pom.
   * @param key the key
   * @param value the value
   */
  public addProperty(key: string, value: string) {
    this.properties[key] = value;
  }

  /**
   * Adds a runtime dependency.
   *
   * @param spec Format `<groupId>/<artifactId>@<semver>`
   */
  public addDependency(spec: string) {
    this.project.deps.addDependency(spec, DependencyType.RUNTIME);
  }

  /**
   * Adds a test dependency.
   *
   * @param spec Format `<groupId>/<artifactId>@<semver>`
   */
  public addTestDependency(spec: string) {
    this.project.deps.addDependency(spec, DependencyType.TEST);
  }

  /**
   * Adds a build plugin to the pom.
   *
   * The plug in is also added as a BUILD dep to the project.
   *
   * @param spec dependency spec (`group/artifact@version`)
   * @param options plugin options
   */
  public addPlugin(spec: string, options: PluginOptions = {}) {
    for (const dep of options.dependencies ?? []) {
      this.project.deps.addDependency(dep, DependencyType.BUILD);
    }
    return this.project.deps.addDependency(spec, DependencyType.BUILD, options);
  }

  private synthPom() {
    return resolve(
      {
        project: {
          ...POM_XML_ATTRS,
          modelVersion: "4.0.0",
          groupId: this.groupId,
          artifactId: this.artifactId,
          version: this.version,
          packaging: this.packaging,
          name: this.name,
          description: this.description,
          url: this.url,
          properties: this.properties,
          ...this.synthDependencies(),
        },
      },
      { omitEmpty: true }
    );
  }

  private synthDependencies() {
    const deps = this.project.deps.all;
    if (deps.length === 0) {
      return;
    }

    const dependencies: any[] = [];
    const plugins: any[] = [];

    for (const dep of deps) {
      switch (dep.type) {
        case DependencyType.PEER:
        case DependencyType.RUNTIME:
          dependencies.push(mavenCoords(dep));
          break;

        case DependencyType.TEST:
          dependencies.push({
            ...mavenCoords(dep),
            scope: "test",
          });
          break;

        // build maps to plugins
        case DependencyType.BUILD:
          plugins.push({
            ...mavenCoords(dep),
            ...pluginConfig(dep.metadata as PluginOptions),
          });
          break;

        default:
          throw new Error(`unsupported dependency type: ${dep.type}`);
      }
    }

    return {
      build: { plugins: { plugin: plugins } },
      dependencies: { dependency: dependencies },
    };
  }
}

/**
 * Options for Maven plugins.
 */
export interface PluginOptions {
  /**
   * Plugin key/value configuration
   * @default {}
   */
  readonly configuration?: { [key: string]: any };

  /**
   * Plugin executions
   * @default []
   */
  readonly executions?: PluginExecution[];

  /**
   * You could configure the dependencies for the plugin.
   *
   * Dependencies are in `<groupId>/<artifactId>@<semver>` format.
   *
   * @default []
   */
  readonly dependencies?: string[];
}

/**
 * Plugin execution definition.
 */
export interface PluginExecution {
  /**
   * The ID.
   */
  readonly id: string;

  /**
   * Which Maven goals this plugin should be associated with.
   */
  readonly goals: string[];
}

/**
 * Parses maven groupId and artifactId from a dependency name.
 *
 *     name    <=> <groupId>/<artifactId>
 *     version <=> <version>
 */
function mavenCoords(dep: DependencyCoordinates) {
  const name = dep.name;
  const parts = name.split("/");
  if (parts.length !== 2) {
    throw new Error(
      `invalid maven coordinates in dependency named "${name}". format is "<groupId>/<artifactId>". For example "org.junit.jupiter/junit-jupiter-engine"`
    );
  }

  return {
    groupId: parts[0],
    artifactId: parts[1],
    version: dep.version ? toMavenVersionRange(dep.version) : undefined,
  };
}

function pluginConfig(options: PluginOptions = {}) {
  return {
    configuration: options.configuration,
    dependencies:
      options.dependencies && options.dependencies.length > 0
        ? {
            dependency: options.dependencies?.map((d) =>
              mavenCoords(Dependencies.parseDependency(d))
            ),
          }
        : undefined,
    executions: options.executions?.map((e) => ({
      execution: {
        id: e.id,
        goals: e.goals.map((goal) => ({ goal })),
      },
    })),
  };
}
