import {
  EC2Client,
  DescribeInstancesCommand,
  StopInstancesCommand,
  Instance,
} from "@aws-sdk/client-ec2";
import { Handler } from "aws-lambda";

const ec2 = new EC2Client();
const REQUIRED_TAGS: string[] = ["Owner", "Environment", "TTL"];
const DRY_RUN: boolean = process.env.DRY_RUN === "true";

export const handler: Handler = async (event) => {
  const data = await ec2.send(
    new DescribeInstancesCommand({
      Filters: [{ Name: "instance-state-name", Values: ["running"] }],
    }),
  );

  const instancesToStop: string[] = [];

  for (const reservation of data.Reservations || []) {
    for (const instance of (reservation.Instances || []) as Instance[]) {
      const existingTags: string[] = (instance.Tags || []).map(
        (t) => t.Key || "",
      );
      const missingTags: string[] = REQUIRED_TAGS.filter(
        (tag) => !existingTags.includes(tag),
      );

      if (missingTags.length > 0 && instance.InstanceId) {
        console.log(
          `[TARGET IDENTIFIED] Instance ${instance.InstanceId} is missing tags: ${missingTags.join(", ")}`,
        );
        instancesToStop.push(instance.InstanceId);
      }
    }
  }

  if (instancesToStop.length === 0) {
    console.log("No non-compliant running instances found.");
    return;
  }

  if (DRY_RUN) {
    console.log(
      `[DRY RUN] Would stop instances: ${instancesToStop.join(", ")}`,
    );
  } else {
    console.log(`[ACTION] Stopping instances: ${instancesToStop.join(", ")}`);
    await ec2.send(new StopInstancesCommand({ InstanceIds: instancesToStop }));
  }
};
