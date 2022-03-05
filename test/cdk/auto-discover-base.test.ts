import { Project } from "../../src";
import { AutoDiscoverBase } from "../../src/cdk";

test("auto discover entrypoints", () => {
  // GIVEN
  const project = new Project({
    name: "project",
    outdir: __dirname,
  });

  // WHEN
  const autoDiscover = new TestAutoDiscover(project);

  // THEN
  expect(autoDiscover.entrypoints).toEqual(["testtree/abc.myext.ts"]);
});

class TestAutoDiscover extends AutoDiscoverBase {
  constructor(project: Project) {
    super(project, {
      extension: ".myext.ts",
      projectdir: "testtree",
    });
  }
}
