# AWS Account Security Baseline Checklist

| Baseline Item | Expressible in CDK? | CDK Construct Level | Engineering Rationale & Implementation Details |
| --- | --- | --- | --- |
| **1. CloudTrail (Multi-Region Trail)** | **Yes** | **Rich Construct (L2)** | Expressed via `aws-cloudtrail.Trail`. Automatically provisions and attaches underlying S3 bucket policies, configures multi-region recording, and wires cryptographic log delivery without manual policy creation. |
| **2. CloudTrail Log File Validation** | **Yes** | **Rich Construct (L2)** | Set directly via the `enableFileValidation: true` prop on `aws-cloudtrail.Trail`. Enforces cryptographic SHA-256 hash digests and RSA signatures on delivered log files. |
| **3. CloudTrail S3 Bucket Hardening** | **Yes** | **Rich Construct (L2)** | Configured via `aws-s3.Bucket` (`encryption`, `blockPublicAccess: BLOCK_ALL`, `enforceSSL: true`). Automatically enforces HTTPS transport security and blocks public access. |
| **4. AWS Config** | **Yes** | **Rich Construct (L2 / L1 blend)** | Expressed via `aws-config.ConfigurationRecorder` and `aws-config.ManagedRule`. Offers high-level abstractions to capture global resource configuration state and detect drift. |
| **5. IAM Access Analyzer** | **Yes** | **Raw Resource (L1)** | Expressed via `aws-accessanalyzer.CfnAnalyzer`. AWS CDK does not provide a dedicated L2 construct for Access Analyzer; requires raw 1:1 CloudFormation declarations. |
| **6. Budget Verification ($75/Month)** | **Yes** | **Raw Resource (L1)** | Expressed via `aws-budgets.CfnBudget`. No official L2 construct exists in `aws-cdk-lib`; requires configuring raw CloudFormation property dictionaries. |
| **7. Account-Level S3 Block Public Access** | **Yes** | **Raw Resource (L1)** | Expressed via `aws-s3.CfnAccountPublicAccessBlock`. Controls global account settings rather than individual S3 bucket properties. |
| **8. Default EBS Encryption** | **Partial** | **Custom Resource (AWS SDK)** | **No native CloudFormation resource exists** to enable account-level EBS encryption. Requires a CDK `AwsCustomResource` invoking the EC2 API (`EnableEbsEncryptionByDefault`) on stack deployment. |
| **9. Zero IAM Users & No Static Keys** | **No** | **Not Possible (Continuous Enforcement)** | **CloudFormation cannot declare the absence or non-existence of resources.** You cannot write "there are zero users". Requires an **AWS Config Rule** (`iam-user-no-policies-check`) + EventBridge/Lambda to detect and remediate non-compliant user creation. |
| **10. Cost Explorer Verification** | **No** | **Not Possible (Account Feature)** | Cost Explorer is an account-level interface feature enabled by AWS upon account creation. It cannot be declared, synthesized, or managed as a CloudFormation resource. |

---

## Detailed Section Breakdown

### 1. CloudTrail (Multi-Region Trail)

* **What it does:** Records API activity and user actions across all AWS regions and logs events to an S3 bucket.
* **Why it matters:** Provides a complete forensic audit log of account actions, essential for incident response and tracking breaches.
* **How you verified it is on:** Navigated to **CloudTrail > Trails** and verified that the active trail has **Apply trail to all regions** set to `Yes`.
* **What it would cost you if it were off:** Total blindness during a security incident, making it impossible to determine how an attacker gained access or what resources they modified.

---

### 2. CloudTrail Log File Validation

* **What it does:** Generates cryptographic hash digests (SHA-256 with RSA signatures) to continuously verify the integrity of stored log files.
* **Why it matters:** Proves that audit logs have not been altered, injected, or deleted post-incident.
* **How you verified it is on:** Checked the trail settings in the CloudTrail console under **General details** to confirm **Log file validation** is set to `Enabled`.
* **What it would cost you if it were off:** Loss of forensic integrity; an attacker could tamper with historical logs to wipe evidence of their presence without triggering an alert.

---

### 3. CloudTrail S3 Bucket Hardening (Encrypted, Versioned, Private)

* **What it does:** Secures log storage by enforcing default encryption, bucket versioning, and strict public access restrictions.
* **Why it matters:** Centralized log buckets are a primary target for attackers seeking to destroy evidence.
* **How you verified it is on:** Inspected the S3 bucket's **Properties** (Encryption: `Enabled`, Versioning: `Enabled`) and **Permissions** (**Block *all* public access**: `On`).
* **What it would cost you if it were off:** Attackers could directly modify or delete log files stored in S3, permanently destroying forensic evidence.

---

### 4. AWS Config

* **What it does:** Continuously monitors, records, and tracks configuration changes and relationships among AWS resources.
* **Why it matters:** Allows you to audit historical infrastructure changes and verify compliance against security baselines over time.
* **How you verified it is on:** Navigated to **AWS Config > Settings** and verified that recording is set to `On` for **All supported resource types**.
* **What it would cost you if it were off:** Inability to track configuration drift, leaving you unaware of when or how critical security misconfigurations were introduced.

---

### 5. IAM Access Analyzer

* **What it does:** Uses automated reasoning to analyze resource-based policies and detect resources exposed outside the account boundary.
* **Why it matters:** Automatically flags unintended public or cross-account exposure without requiring manual JSON policy audits.
* **How you verified it is on:** Checked **IAM > Access Analyzer** to confirm an active analyzer exists with the zone of trust set to the current account.
* **What it would cost you if it were off:** Silent misconfigurations that expose S3 buckets, KMS keys, or IAM roles to external third parties.

---

### 6. Budget Verification ($75/Month) & Spend Control

* **What it does:** Monitors spend against a $75 limit and issues alerts at 50% ($37.50), 80% ($60.00), and 100% ($75.00) thresholds.
* **Why it matters:** Acts as an early warning system against unexpected resource usage or unauthorized crypto-mining workloads.
* **How you verified it is on:** Opened **AWS Budgets** in the Billing console and reviewed the pre-configured $75/month budget settings.
* **What it would cost you if it were off:** Unlimited financial liability caused by run-away infrastructure costs or compromised credentials running expensive compute resources.

---

### 7. Account-Level S3 Block Public Access

* **What it does:** Applies an account-wide security override that blocks public ACLs and public bucket policies for all S3 buckets.
* **Why it matters:** Acts as a centralized guardrail preventing individual human errors from exposing data publicly.
* **How you verified it is on:** Navigated to **S3 > Account and organization settings > Block Public Access settings for this account** and confirmed **Block *all* public access** is set to `On`.
* **What it would cost you if it were off:** High risk of accidental data exposure, potential regulatory fines, and reputational damage.

---

### 8. Default EBS Encryption

* **What it does:** Automatically encrypts all newly created Elastic Block Store (EBS) volumes in the selected region using AWS KMS.
* **Why it matters:** Ensures data-at-rest protection for virtual machine storage without relying on manual configuration during deployment.
* **How you verified it is on:** Navigated to **EC2 Dashboard > Data protection and security** (or account settings) and confirmed **Always encrypt new EBS volumes** is set to `Enabled`.
* **What it would cost you if it were off:** Unencrypted disks and snapshots that could expose sensitive data if leaked or accessed without authorization.

---

### 9. Zero IAM Users & No Static Access Keys

* **What it does:** Eliminates long-term IAM user credentials and forces all access through IAM Identity Center (SSO).
* **Why it matters:** Long-term API access keys are a major attack vector for credential leaks and automated exploitation.
* **How you verified it is on:** Navigated to **IAM > Users** and confirmed the user count is **0**.
* **What it would cost you if it were off:** High exposure to credential theft, hardcoded secret leaks in source code, and unmonitored persistent access.

---

### 10. Cost Explorer Verification

* **What it does:** Provides detailed visualization, analysis, and forecasting of account costs and usage trends.
* **Why it matters:** Enables visibility into spending patterns and allows quick identification of unexpected cost anomalies.
* **How you verified it is on:** Opened **Billing and Cost Management > Cost Explorer** and launched the console without access restriction errors.
* **What it would cost you if it were off:** Inability to analyze spending trends or identify cost anomalies early in the billing cycle.