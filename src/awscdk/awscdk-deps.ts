import * as semver from "semver";
import { Component } from "../component";
import { DependencyType } from "../dependencies";
import { Project } from "../project";

/**
 * Options for `AwsCdkDeps`
 */
export interface AwsCdkDepsCommonOptions {
  /**
   * Minimum version of the AWS CDK to depend on.
   *
   * @default "2.1.0"
   */
  readonly cdkVersion: string;

  /**
   * Minimum version of the `constructs` library to depend on.
   *
   * @default - for CDK 1.x the default is "3.2.27", for CDK 2.x the default is
   * "10.0.5".
   */
  readonly constructsVersion?: string;

  /**
   * Use pinned version instead of caret version for CDK.
   *
   * You can use this to prevent mixed versions for your CDK dependencies and to prevent auto-updates.
   * If you use experimental features this will let you define the moment you include breaking changes.
   */
  readonly cdkVersionPinning?: boolean;

  /**
   * Which AWS CDKv1 modules this project requires
   *
   * @deprecated For CDK 2.x use "deps" instead. (or "peerDeps" if you're building a library)
   */
  readonly cdkDependencies?: string[];

  /**
   * If this is enabled (default), all modules declared in `cdkDependencies` will be also added as
   * normal `dependencies` (as well as `peerDependencies`).
   *
   * This is to ensure that downstream consumers actually have your CDK dependencies installed
   * when using npm < 7 or yarn, where peer dependencies are not automatically installed.
   * If this is disabled, `cdkDependencies` will be added to `devDependencies` to ensure
   * they are present during development.
   *
   * Note: this setting only applies to construct library projects
   *
   * @default true
   * @deprecated Not supported in CDK v2.
   */
  readonly cdkDependenciesAsDeps?: boolean;

  /**
   * Warning: NodeJS only.
   * Install the @aws-cdk/assert library?
   *
   * @default - will be included by default for AWS CDK >= 1.0.0 < 2.0.0
   * @deprecated The @aws-cdk/assert library is deprecated in favor of
   * @aws-cdk/assertions (in V1) and included in `aws-cdk-lib` for V2.
   */
  readonly cdkAssert?: boolean;

  /**
   * Install the assertions library?
   *
   * Only needed for CDK 1.x. If using CDK 2.x then
   * assertions is already included in 'aws-cdk-lib'
   *
   * @default - will be included by default for AWS CDK >= 1.111.0 < 2.0.0
   */
  readonly cdkAssertions?: boolean;

  /**
   * AWS CDK modules required for testing.
   *
   * @deprecated For CDK 2.x use 'devDeps' (in node.js projects) or 'testDeps' (in java projects) instead
   */
  readonly cdkTestDependencies?: string[];
}

export interface AwsCdkDepsOptions extends AwsCdkDepsCommonOptions {
  /**
   * The type of dependency to use for runtime AWS CDK and `constructs` modules.
   *
   * For libraries, use peer dependencies and for apps use runtime dependencies.
   */
  readonly dependencyType: DependencyType;
}

/**
 * Language-specific AWS CDK package names.
 */
export interface AwsCdkPackageNames {
  /**
   * Fully qualified name of the core framework package for CDKv1
   */
  readonly coreV1: string;
  /**
   * Fully qualified name of the core framework package for CDKv2
   */
  readonly coreV2: string;
  /**
   * Fully qualified name of the constructs library package
   */
  readonly constructs: string;
  /**
   * Fully qualified name of the assertions library package
   */
  readonly assertions: string;
  /**
   * Fully qualified name of the assert library package
   * Can be empty as it's only really available for javascript projects
   */
  readonly assert?: string;
}

/**
 * Manages dependencies on the AWS CDK.
 */
export abstract class AwsCdkDeps extends Component {
  /**
   * The dependency requirement for AWS CDK (e.g. `^2.0.0`).
   */
  public readonly cdkVersion: string;

  /**
   * The minimum version of the AWS CDK (e.g. `2.0.0`).
   */
  public readonly cdkMinimumVersion: string;

  /**
   * Whether CDK dependencies are added as normal dependencies (and peer dependencies).
   * @deprecated Not used for CDK 2.x
   */
  public readonly cdkDependenciesAsDeps: boolean;

  /**
   * The major version of the AWS CDK (e.g. 1, 2, ...)
   */
  public readonly cdkMajorVersion: number;

  private readonly dependencyType: DependencyType;

  private readonly _packageNames: AwsCdkPackageNames;

  constructor(project: Project, options: AwsCdkDepsOptions) {
    super(project);

    this.cdkDependenciesAsDeps = options.cdkDependenciesAsDeps ?? true;

    this.dependencyType = options.dependencyType;
    this._packageNames = this.packageNames();

    const framework = determineFrameworkVersion(options);

    this.cdkVersion = framework.range;
    this.cdkMajorVersion = framework.major;
    this.cdkMinimumVersion = framework.minimum;

    this.addFrameworkDependency(options);

    // assert/assertions library
    this.addV1AssertionLibraryDependency(options);

    // constructs library
    this.addConstructsDependency(options.constructsVersion);

    // user-defined v1 dependencies (will only fail in CDK v2 if these have values)
    this.addV1Dependencies(...(options.cdkDependencies ?? []));
    this.addV1DevDependencies(...(options.cdkTestDependencies ?? []));
  }

  /**
   * Adds dependencies to AWS CDK modules.
   *
   * The type of dependency is determined by the `dependencyType` option.
   *
   * This method is not supported in CDK v2. Use `project.addPeerDeps()` or
   * `project.addDeps()` as appropriate.
   *
   * @param deps names of cdk modules (e.g. `@aws-cdk/aws-lambda`).
   */
  public addV1Dependencies(...deps: string[]) {
    if (deps.length > 0 && this.cdkMajorVersion !== 1) {
      throw new Error(
        "addV1Dependencies() is not supported for CDK 2.x and above, use addDeps() or addPeerDeps() instead"
      );
    }

    // this will add dependencies based on the type requested by the user
    // for libraries, this will be "peer" and for apps it will be "runtime"
    this.addV1DependenciesByType(this.dependencyType, ...deps);

    // add deps as runtime deps if `cdkDepsAsDeps` is true
    if (this.cdkDependenciesAsDeps) {
      this.addV1DependenciesByType(DependencyType.RUNTIME, ...deps);
    }
  }

  /**
   * Adds AWS CDK modules as dev dependencies.
   *
   * This method is not supported in CDK v2. Use `project.addPeerDeps()` or
   * `project.addDeps()` as appropriate.
   *
   * @param deps fully qualified names of cdk modules (e.g. `@aws-cdk/aws-lambda`).
   */
  public addV1DevDependencies(...deps: string[]) {
    if (deps.length > 0 && this.cdkMajorVersion !== 1) {
      throw new Error(
        "addV1DevDependencies() is not supported for CDK 2.x and above, use addDevDeps()/addTestDeps() instead"
      );
    }

    this.addV1DependenciesByType(DependencyType.BUILD, ...deps);
  }

  private addConstructsDependency(requestedVersion: string | undefined) {
    if (requestedVersion && !semver.parse(requestedVersion)) {
      throw new Error(
        `"constructsVersion" cannot be parsed as a semver version: ${requestedVersion}`
      );
    }

    const defaultVersion = this.cdkMajorVersion === 1 ? "3.2.27" : "10.0.5";
    const versionRequirement = `^${requestedVersion ?? defaultVersion}`;

    const constructsMajorVersion = semver.minVersion(versionRequirement)?.major;
    if (!constructsMajorVersion) {
      throw new Error(
        `Cannot determine major version of constructs version '${versionRequirement}'`
      );
    }

    switch (this.cdkMajorVersion) {
      case 1:
        if (constructsMajorVersion !== 3) {
          throw new Error("AWS CDK 1.x requires constructs 3.x");
        }
        break;

      case 2:
        if (constructsMajorVersion !== 10) {
          throw new Error("AWS CDK 2.x requires constructs 10.x");
        }
        break;
    }

    this.project.deps.addDependency(
      `${this._packageNames.constructs}@${versionRequirement}`,
      this.dependencyType
    );

    return versionRequirement;
  }

  /**
   * Adds a dependency on the AWS CDK framework (e.g. `@aws-cdk/core` for V1 or `aws-cdk-lib` for V1).
   */
  private addFrameworkDependency(options: AwsCdkDepsOptions) {
    switch (this.cdkMajorVersion) {
      case 1:
        this.addV1Dependencies(this._packageNames.coreV1);
        break;

      case 2:
        if (options.cdkDependencies !== undefined) {
          throw new Error(
            'cdkDependencies is not used for CDK 2.x. Use "peerDeps" or "deps" instead'
          );
        }
        if (options.cdkDependenciesAsDeps !== undefined) {
          throw new Error("cdkDependenciesAsDeps is not used for CDK 2.x");
        }
        if (options.cdkTestDependencies !== undefined) {
          throw new Error(
            'cdkTestDependencies is not used for CDK 2.x. Use "devDeps" or "testDeps" instead'
          );
        }

        this.project.deps.addDependency(
          `${this._packageNames.coreV2}@${this.cdkVersion}`,
          this.dependencyType
        );
        break;

      default:
        throw new Error(
          `Unsupported AWS CDK major version ${this.cdkMajorVersion}.x`
        );
    }
  }

  private addV1AssertionLibraryDependency(options: AwsCdkDepsOptions) {
    if (this.cdkMajorVersion !== 1) {
      if (options.cdkAssert !== undefined) {
        throw new Error(
          "cdkAssert is not used for CDK 2.x. Use the assertions library that is provided in aws-cdk-lib"
        );
      }
      if (options.cdkAssertions !== undefined) {
        throw new Error(
          "cdkAssertion is not used for CDK 2.x. Use the assertions library that is provided in aws-cdk-lib"
        );
      }

      return;
    }

    const testDeps = new Array<string>();

    if ((options.cdkAssert ?? true) && this._packageNames.assert) {
      testDeps.push(this._packageNames.assert);
    }

    // @aws-cdk/assertions is only available starting v1.111.0
    if (
      semver.gte(this.cdkMinimumVersion, "1.111.0") &&
      (options.cdkAssertions ?? true)
    ) {
      testDeps.push(this._packageNames.assertions);
    }

    this.addV1DependenciesByType(DependencyType.TEST, ...testDeps);
  }

  /**
   * Adds a set of dependencies with the user-specified dependency type.
   * @param deps The set of dependency specifications
   */
  private addV1DependenciesByType(type: DependencyType, ...modules: string[]) {
    for (const module of modules) {
      this.project.deps.addDependency(`${module}@${this.cdkVersion}`, type);
    }
  }

  /**
   * Return a configuration object with information about package naming in various languages
   */
  protected abstract packageNames(): AwsCdkPackageNames;
}

function determineFrameworkVersion(options: AwsCdkDepsOptions) {
  const ver = semver.parse(options.cdkVersion);
  if (!ver) {
    throw new Error(
      `"cdkVersion" cannot be parsed as a semver version: ${options.cdkVersion}`
    );
  }

  return {
    minimum: ver.format(),
    range: options.cdkVersionPinning
      ? options.cdkVersion
      : `^${options.cdkVersion}`,
    major: ver.major,
  };
}
