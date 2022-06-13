import { JobStep } from "./workflows-model";

/**
 * Options for `GithubCredentials.fromPersonalAccessToken`
 */
export interface GithubCredentialsPersonalAccessTokenOptions {
  readonly secret?: string;
}

/**
 * Options for `GithubCredentials.fromApp`
 */
export interface GithubCredentialsAppOptions {
  readonly appIdSecret?: string;
  readonly privateKeySecret?: string;
}

/**
 * Represents a method of providing GitHub API access for projen workflows.
 */
export class GithubCredentials {
  /**
   * Provide API access through a GitHub personal access token.
   *
   * The token must be added as a secret to the GitHub repo, and the name of the
   * secret can be specified here.
   *
   * @see https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
   * @default - a secret named "PROJEN_GITHUB_TOKEN"
   */
  public static fromPersonalAccessToken(
    options: GithubCredentialsPersonalAccessTokenOptions = {}
  ) {
    return new GithubCredentials({
      setupSteps: [],
      tokenRef: `\${{ secrets.${options.secret ?? "PROJEN_GITHUB_TOKEN"} }}`,
    });
  }

  /**
   * Provide API access through a GitHub App.
   *
   * The GitHub App must be installed on the GitHub repo, its App ID and a
   * private key must be added as secrets to the repo. The name of the secrets
   * can be specified here.
   *
   * @see https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app
   * @default - app id stored in "PROJEN_GITHUB_TOKEN" and private key stored in "PROJEN_APP_PRIVATE_KEY"
   */
  public static fromApp(options: GithubCredentialsAppOptions = {}) {
    const appIdSecret = options.appIdSecret ?? "PROJEN_APP_ID";
    const privateKeySecret =
      options.privateKeySecret ?? "PROJEN_APP_PRIVATE_KEY";

    return new GithubCredentials({
      setupSteps: [
        {
          name: "Generate token",
          id: "generate_token",
          uses: "tibdex/github-app-token@7ce9ffdcdeb2ba82b01b51d6584a6a85872336d4",
          with: {
            app_id: `\${{ secrets.${appIdSecret} }}`,
            private_key: `\${{ secrets.${privateKeySecret} }}`,
          },
        },
      ],
      tokenRef: "${{ steps.generate_token.outputs.token }}",
    });
  }

  private constructor(private readonly options: GithubCredentialsOptions) {}

  /**
   * Setup steps to obtain GitHub credentials.
   */
  public get setupSteps(): JobStep[] {
    return [...this.options.setupSteps];
  }

  /**
   * The value to use in a workflow when a GitHub token is expected. This
   * typically looks like "${{ some.path.to.a.value }}".
   */
  public get tokenRef(): string {
    return this.options.tokenRef;
  }
}

interface GithubCredentialsOptions {
  readonly setupSteps: JobStep[];
  readonly tokenRef: string;
}
