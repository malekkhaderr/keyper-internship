# Access Notes — Environment Discovery

## 1. The Basics

**Account**

- Account ID: `746851697874`
- Type: Member account
- Access method: SSO federation via SAML identity provider (`arn:aws:iam::746851697874:saml-provider/...`)

**Allowed regions**

- No explicit restriction found at the console/permission-set level.
- **Cannot verify SCPs** — attempted Organizations → Policies → Service control policies, got: _"You don't have permissions to see this page, because the management account has not granted you the permissions to view policies."_
- Conclusion: region restrictions, if any, are **invisible from this account**. Treat as unknown, not as "no restriction" — the management account controls this layer and hasn't granted visibility.

**Budget — $75/month**
-- not set

---

## 2. Where Permissions Come From

> More than one layer stacks together — every layer must say Allow for an action to succeed.

| Layer                        | Name / Location found                                                  | What it controls                                                                                                             | Status                                                    |
| ---------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| SSO Permission Set           | Policies attached: **AdministratorAccess** + **IAMUserChangePassword** | Actions + resources allowed to me directly — AdministratorAccess is effectively full account control                         | Found                                                     |
| Service Control Policy (SCP) | Unknown — Organizations policy page not visible to this account        | Org-wide ceiling on top of everything else (regions, services, hard blocks) — overrides Permission Set even if it says Allow | **Cannot view — no access granted by management account** |

---

## 3. Three Lists

### Confident I CAN do

- Broad account-level actions within `746851697874`, per AdministratorAccess (create/modify/delete most resources, IAM changes, etc.) — **unless capped by a layer above I can't see**
- Change my own password (IAMUserChangePassword)

### Confident I CANNOT do

- View or modify Organization-level policies (SCPs) — explicitly denied visibility

### Genuinely do not know

- Whether any SCP restricts regions, services, or specific actions in this account — invisible to me

---

# Task 1.5 — Janitor & Systems Manager Notes

## Minimal Tagging Standard

- **`Owner`**: Identifies the responsible engineer (e.g., `malek`).
- **`Environment`**: Specifies operational stage (`dev`, `staging`, `prod`).
- **`TTL`**: Defines automated cleanup expiration policy (`2026-10-01`, `permanent`).

## Systems Manager Prerequisites

1. **SSM Agent**: Active inside the target instance operating system.
2. **IAM Instance Profile**: Attached EC2 role containing `AmazonSSMManagedInstanceCore`.
3. **Outbound Network Access**: Unrestricted HTTPS (port 443) outbound connectivity reaching AWS Systems Manager service endpoints.

## Quoted Access Failure Log

\`\`\`
UnauthorizedOperation: You are not authorized to perform this operation. User: arn:aws:sts::746851697874:assumed-role/JanitorStack-JanitorFunctionServiceRole.../JanitorFunction is not authorized to perform: ec2:DescribeInstances because no identity-based policy allows the ec2:DescribeInstances action
\`\`\`

## Error Analysis & Scoping Justification

- **Layer Stopped**: IAM Identity-Based Policy layer on the Lambda execution role.
- **Granted Actions**: `ec2:DescribeInstances` (for tag scanning) and `ec2:StopInstances` (for state management).
- **Resource Scoping**: Actions require `Resource: '*'` because EC2 describe and state operations do not support resource-level ARN restrictions in IAM policies.

## Denial Mechanics Distinction

- **Implicit Denial**: Default IAM state where an operation is denied simply because no policy statement grants explicit permission ("no identity-based policy allows..."). Resolved by attaching an `Allow` statement.
- **Explicit Denial**: Occurs when an explicit `"Effect": "Deny"` statement matches the request. An explicit deny overrides all `Allow` statements regardless of evaluation order or policy attachment point.
