import { Stack, StackProps, Duration } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import * as path from "path";

export class JanitorStack extends Stack {
  public readonly janitorLambda: lambda.Function;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const janitorLambda = new lambda.Function(this, "JanitorFunction", {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambda/janitor")),
      timeout: Duration.seconds(30),
      environment: {
        DRY_RUN: "true",
      },
    });

    // Add minimal EC2 permissions
    janitorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ec2:DescribeInstances", "ec2:StopInstances"],
        resources: ["*"],
      }),
    );

    // 1. Suppress IAM4 on the Lambda Execution Role (Managed Policy)
    if (janitorLambda.role) {
      NagSuppressions.addResourceSuppressions(
        janitorLambda.role,
        [
          {
            id: "AwsSolutions-IAM4",
            reason:
              "Allow basic execution role for CloudWatch logging in dev/learning sandbox.",
            appliesTo: [
              "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            ],
          },
        ],
        true,
      );

      // 2. Suppress IAM5 on the DefaultPolicy construct directly under the Role node
      const defaultPolicy =
        janitorLambda.role.node.tryFindChild("DefaultPolicy");
      if (defaultPolicy) {
        NagSuppressions.addResourceSuppressions(defaultPolicy, [
          {
            id: "AwsSolutions-IAM5",
            reason:
              "EC2 DescribeInstances and StopInstances require wildcard resource scope in IAM policies.",
            appliesTo: ["Resource::*"],
          },
        ]);
      }
    }

    const rule = new events.Rule(this, "JanitorScheduleRule", {
      schedule: events.Schedule.rate(Duration.hours(1)),
    });
    rule.addTarget(new targets.LambdaFunction(janitorLambda));

    this.janitorLambda = janitorLambda;
  }
}
