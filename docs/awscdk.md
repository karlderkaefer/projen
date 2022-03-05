# AWS Cloud Projects

We support two types of projects for cloud development powered by the AWS Cloud
Development Kit (AWS CDK): **apps** and **libraries**. Apps represent complete
cloud applications while libraries vend constructs which can be consumed by
other libraries or by apps. Libraries are published to public or internal
package managers (npm, PyPI, Maven, NuGet, etc) while apps are deployed into AWS
environments.

This section describes features that are available in both cloud libraries and
applications. See [AWS CDK Construct Library](./awscdk-construct.md) and [AWS
CDK Applications](./awscdk-apps.md) for specific details about libraries and
applications.

## AWS Lambda Functions

AWS Lambda is a serverless compute platform which executes short running code
within a managed runtime environment.

To define AWS Lambda functions, create a file with a `.lambda.ts` suffix under
the source tree with AWS Lambda handler code.

For example, say we create `src/resize-image.lambda.ts` with the following
content:

```ts
export async function handler(event: any) {
  console.log('I am resizing the image now!');
}
```

Now run:

```sh
$ npx projen
```

You'll notice that a new file `src/resize-image-function.ts` has been added to
your project. This is a generated source file which exports a construct named
`ResizeImageFunction`. This construct is a subclass of
`@aws-cdk/aws-lambda.Function`, bound to your specific handler. This means that
you don't need to specify neither the `code` nor the `runtime` options when you
add it to your app:

```ts
import { ResizeImageFunction } from './resize-image-function.ts';

const handler = new ResizeImageFunction(this, 'ResizeImageFunction', {
  env: {
    FOO: '1234',
  },

  // all lambda options are supported...
});
```

Under the hood, we also added a compilation task to your project which creates a
.zip bundle for each handler. This bundle is created with
[esbuild](https://github.com/evanw/esbuild) and includes only your handler code
and all of its dependencies. This means that you can freely install and use any
dependencies in your project and use them in your handlers. You can manually
bundle your handler by executing the `bundle:HANDLER` or `bundle:watch:HANDLER`
tasks.

To customize this behavior for all functions, use `lambdaOptions` at the project
level. For example:

```ts
const { awscdk } = require('projen');

new AwsCdkConstructLibrary({
  // ...
  lambdaOptions: {
    // target node.js runtime
    runtime: awscdk.LambdaRuntime.NODEJS_14_X,

    bundlingOptions: {
      // list of node modules to exclude from the bundle
      externals: [ 'aws-sdk' ],
      sourcemap: true,
    }
  }
});
```

You can also disable auto-discovery by setting `lambdaAutoDiscover` to
`false` and then create explicitly add a `awscdk.LambdaFunction` component for
each function in your project. This will allow you to perform more
customizations as needed.

```ts
const { awscdk } = require('projen');

const p = new AwsCdkTypeScriptApp({
  lambdaAutoDiscover: false
});

new awscdk.LambdaFunction(p, {
  entrypoint: 'src/foo.lambda.ts', // .lambda.ts extension is still required
  runtime: aws_lambda.Runtime.NODEJS_12_X,
});
```

## Integration Snapshot Tests

Files in the `test/` tree with the `.integ.ts` suffix are recognized as
*integration snapshot tests*.

Each test is a simple CDK app (e.g. calls `app.synth()`) which exercises certain
construct(s) within the project. A test is considered passing if the app can be
successfully deployed.

To create/update the snapshot, developers are expected to execute the task
`integ:NAME:deploy` with AWS credentials for their personal development
environment. This task will deploy the test app to their account. Upon
successful deployment (i.e. the test passed), the snapshot will be captured and
stored under a directory called `xxx.integ.snapshot` next to the test
entrypoint. This directory should be committed to the repository.

During builds (either local or within a workflow), the task `integ:NAME:assert`
will be executed. This task synthesizes the test app and compares the output to
the captured snapshot. The build will fail if the output differs.

For each integration test, the following set of tasks are created:

|Task|Description|
|----|-----------|
|`integ:NAME:deploy`|Deploys & destroys the test app and updates the snapshot.|
|`integ:NAME:assert`|Synthesizes the test app and compares it with the snapshot (this is the task that runs during build)|
|`integ:NAME:snapshot`|Synthesizes the test app and updates the snapshot (not recommended to use because it bypasses deployment).|
|`integ:NAME:destroy`|Destroys a previously deployed test app.|

### Writing test assertions

You can write your test assertions as AWS Lambda handlers and use [CDK
Triggers](https://github.com/awslabs/cdk-triggers) to execute them as part of
the deployment.

Here is an example of a test:

```ts
import { App,Stack } from '@aws-cdk/core';
import { ConstructUnderTest } from '../src';
import { AfterCreate } from 'cdk-triggers';
import { AssertSomeStuffFunction } from './assert-some-stuff-function.ts'; // <-- generated

const app = new App();
const stack = new Stack(app, 'Test');

// this is the construct we want to test
const testee = new ConstructUnderTest(stack, 'ConstructUnderTest');

// execute a lambda handler with some assertions after all testee 
// resources are created
new AfterCreate(stack, 'RunAssertions', {
  resources: [testee],
  handler: new AssertSomeStuffFunction(stack, 'AssertSomeStuffFunction', {
    env: {
      URL: testee.url // <-- some reference to the created construct
    }
  }),
});
```

## Watch

> Only relevant for app projects

The `watch` command will use [cdk watch] in order to trigger deployments (with
opportunistic hot-swapping) when source files or asset bundles are updated.
`cdk.json` will automatically be configured to watch both source code changes
and bundles, and rebuild bundles as needed.

[cdk watch]: https://aws.amazon.com/blogs/developer/increasing-development-speed-with-cdk-watch/

To start watching, set up your environment with AWS credentials and `AWS_REGION`
pointing to your development AWS account and execute:

```sh
npx projen watch
```

This will:

* Bundle your assets (if you have any).
* Perform an initial deployment of your app into your development environment.
* Start watching for changes.

If you change a source file in your project, this change will be picked up by
`cdk watch`, assets will be re-bundled and a hotswap deployment will be
performed. For example, if you only change some AWS Lambda code, the CDK CLI
will simply update the AWS Lambda service with the location of your new code
bundle instead of going through an AWS CloudFormation deployment.

## Roadmap

* Additional bundling targets: web apps, ECS
* Local execution for AWS Lambda, ECS containers, Step Functions
* Support different provisioning engines (CloudFormation/Terraform) using Terraform L2 support
* Generate types for strong-typing AWS Lambda/ECS environment bindings.
