import { Tools } from "../github/workflows-model";

export type JsiiPacmakTarget = "js" | "go" | "java" | "python" | "dotnet";

/**
 * GitHub workflow job steps for setting up the tools required for various JSII targets.
 */
export const JSII_TOOLCHAIN: Record<JsiiPacmakTarget, Tools> = {
  js: {},
  java: { java: { version: "11.x" } },
  python: { python: { version: "3.x" } },
  go: { go: { version: "^1.16.0" } },
  dotnet: { dotnet: { version: "3.x" } },
};
