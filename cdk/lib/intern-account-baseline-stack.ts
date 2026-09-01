import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudtrail from "aws-cdk-lib/aws-cloudtrail";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { NagSuppressions } from "cdk-nag";

export class InternAccountBaselineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. S3 Bucket for CloudTrail Logs
    const trailBucket = new s3.Bucket(this, "TrailBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true, // Prevents non-HTTPS traffic (Fixes cdk-nag S3.1)
    });

    // 2. CloudTrail (L2 Construct)
    new cloudtrail.Trail(this, "BaselineTrail", {
      trailName: "intern-baseline-trail",
      bucket: trailBucket,
      enableFileValidation: true, // Log file integrity validation (Fixes cdk-nag CloudTrail.1)
    });

    // 3. Monthly Budget (L1 Construct)
    new budgets.CfnBudget(this, "BaselineBudget", {
      budget: {
        budgetName: "Monthly-100USD-Budget",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: {
          amount: 100,
          unit: "USD",
        },
      },
    });
    NagSuppressions.addResourceSuppressions(trailBucket, [
      {
        id: "AwsSolutions-S1",
        reason:
          "Server access logging is omitted for this log bucket to prevent recursive logging loops and minimize unnecessary S3 costs in an intern sandbox account.",
      },
    ]);
  }
}
