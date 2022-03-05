import { PROJEN_RC } from "../../src/common";
import { mergeTsconfigOptions, TypeScriptProject } from "../../src/typescript";
import { synthSnapshot } from "../util";

describe("mergeTsconfigOptions", () => {
  test("merging includes", () => {
    const mergedTsconfigOptions = mergeTsconfigOptions(
      {
        include: ["typescript.test.ts"],
        compilerOptions: {},
      },
      {
        include: ["abc"],
        compilerOptions: {},
      }
    );

    expect(mergedTsconfigOptions).toEqual(
      expect.objectContaining({
        include: ["typescript.test.ts", "abc"],
      })
    );
  });

  test("merging excludes", () => {
    const mergedTsconfigOptions = mergeTsconfigOptions(
      {
        exclude: ["typescript.test.ts"],
        compilerOptions: {},
      },
      {
        exclude: ["abc"],
        compilerOptions: {},
      }
    );

    expect(mergedTsconfigOptions).toEqual(
      expect.objectContaining({
        exclude: ["typescript.test.ts", "abc"],
      })
    );
  });

  test("merging compilerOptions", () => {
    const mergedTsconfigOptions = mergeTsconfigOptions(
      {
        compilerOptions: {
          esModuleInterop: false,
        },
      },
      {
        compilerOptions: {
          esModuleInterop: true,
        },
      }
    );

    expect(mergedTsconfigOptions).toEqual(
      expect.objectContaining({
        compilerOptions: {
          esModuleInterop: true,
        },
      })
    );
  });
});

test("tsconfig prop is propagated to eslint and jest tsconfigs", () => {
  const prj = new TypeScriptProject({
    name: "test",
    defaultReleaseBranch: "test",
    tsconfig: {
      include: ["typescript.test.ts"],
      compilerOptions: {
        esModuleInterop: true,
      },
    },
  });

  const out = synthSnapshot(prj);

  expect(out["tsconfig.json"]).toEqual(
    expect.objectContaining({
      include: expect.arrayContaining([
        `${prj.srcdir}/**/*.ts`,
        "typescript.test.ts",
      ]),
      compilerOptions: expect.objectContaining({
        esModuleInterop: true,
      }),
    })
  );

  expect(out["tsconfig.dev.json"]).toEqual(
    expect.objectContaining({
      include: expect.arrayContaining([
        PROJEN_RC,
        `${prj.srcdir}/**/*.ts`,
        `${prj.testdir}/**/*.ts`,
        "typescript.test.ts",
      ]),
      compilerOptions: expect.objectContaining({
        esModuleInterop: true,
      }),
    })
  );

  expect(out["tsconfig.dev.json"]).toEqual(
    expect.objectContaining({
      include: expect.arrayContaining([
        PROJEN_RC,
        `${prj.srcdir}/**/*.ts`,
        `${prj.testdir}/**/*.ts`,
        "typescript.test.ts",
      ]),
      compilerOptions: expect.objectContaining({
        esModuleInterop: true,
      }),
    })
  );
});

test("sources and compiled output can be collocated", () => {
  const prj = new TypeScriptProject({
    name: "test",
    defaultReleaseBranch: "test",
    libdir: "lib",
    srcdir: "lib",
  });

  expect(prj.tsconfig?.exclude).not.toContain("/lib");

  const snapshot = synthSnapshot(prj);
  expect(snapshot[".gitignore"]).toMatchSnapshot();
  expect(snapshot[".npmignore"]).toMatchSnapshot();
});

test("tsconfigDevFile can be used to control the name of the tsconfig dev file", () => {
  const prj = new TypeScriptProject({
    name: "test",
    defaultReleaseBranch: "test",
    tsconfigDevFile: "tsconfig.foo.json",
    libdir: "lib",
    srcdir: "lib",
  });

  expect(prj.tsconfigDev.fileName).toBe("tsconfig.foo.json");

  const snapshot = synthSnapshot(prj);
  expect(snapshot["tsconfig.foo.json"]).not.toBeUndefined();
});

test("projenrc.ts", () => {
  const prj = new TypeScriptProject({
    name: "test",
    defaultReleaseBranch: "main",
    projenrcTs: true,
  });

  const snapshot = synthSnapshot(prj);
  expect(snapshot[".projen/tasks.json"].tasks.default).toStrictEqual({
    description: "Synthesize project files",
    name: "default",
    steps: [{ exec: "ts-node --project tsconfig.dev.json .projenrc.ts" }],
  });
});
