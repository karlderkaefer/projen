import * as path from "path";
import { Project, ProjectOptions } from "../src";
import { SampleDir, SampleFile } from "../src/sample-file";
import { synthSnapshot } from "./util";

test("sample file from text contents", () => {
  // GIVEN
  const project = new TestProject();

  // WHEN
  new SampleFile(project, "welcome.txt", { contents: "hello\nworld" });

  // THEN
  expect(synthSnapshot(project)["welcome.txt"]).toMatch("hello\nworld");
});

test("sample file from source", () => {
  // GIVEN
  const project = new TestProject();

  // WHEN
  new SampleFile(project, "logo.svg", {
    sourcePath: path.resolve(__dirname, "..", "logo", "projen.svg"),
  });

  // THEN
  expect(synthSnapshot(project)["logo.svg"]).toMatch(
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'
  );
});

test("sample directory from files", () => {
  // GIVEN
  const project = new TestProject();

  // WHEN
  new SampleDir(project, "public", {
    files: {
      "foo.txt": "Hello world!",
      "bar.txt": "Test test test",
    },
  });

  // THEN
  const snapshot = synthSnapshot(project);
  expect(snapshot["public/foo.txt"]).toMatch("Hello world!");
  expect(snapshot["public/bar.txt"]).toMatch("Test test test");
});

test("sample directory from source", () => {
  // GIVEN
  const project = new TestProject();

  // WHEN
  new SampleDir(project, "public", {
    sourceDir: path.resolve(__dirname, "..", "assets", "web", "react"),
  });

  // THEN
  const snapshot = synthSnapshot(project);
  expect(snapshot["public/robots.txt"].length).toBeGreaterThan(0);
  expect(snapshot["public/index.html"].length).toBeGreaterThan(0);
  expect(Object.keys(snapshot["public/manifest.json"]).length).toBeGreaterThan(
    0
  );
});

test("sample directory from source with overwritten files", () => {
  // GIVEN
  const project = new TestProject();

  // WHEN
  new SampleDir(project, "public", {
    files: {
      "index.html": "<!doctype html><body>Hello world!</body>",
    },
    sourceDir: path.resolve(__dirname, "..", "assets", "web", "react"),
  });

  // THEN
  const snapshot = synthSnapshot(project);
  expect(snapshot["public/index.html"]).toMatch(
    "<!doctype html><body>Hello world!</body>"
  );
  expect(snapshot["public/robots.txt"].length).toBeGreaterThan(0);
  expect(Object.keys(snapshot["public/manifest.json"]).length).toBeGreaterThan(
    0
  );
});

export class TestProject extends Project {
  constructor(options: Omit<ProjectOptions, "name"> = {}) {
    super({
      name: "my-project",
      ...options,
    });
  }
}
