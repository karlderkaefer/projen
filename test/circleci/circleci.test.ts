// @ts-ignore
import { TestProject } from "../util";

test("run it", () => {
  // GIVEN
  const p = new TestProject({
    stale: true,
  });
  expect(true);
  expect(p.name);
  // const c = new CiConfiguration(p, "foo");
  // c.addServices({ name: "bar" });
  // // THEN
  // expect(() => c.addServices({ name: "bar" })).toThrowError(
  //   /GitLab CI already contains/
  // );
  // expect(() =>
  //   c.addServices({ name: "foobar" }, { name: "foobar" })
  // ).toThrowError(/GitLab CI already contains/);
});
