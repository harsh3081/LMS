# Secret Management Best Practices

**Purpose**: Enterprise-grade strategies for managing secrets, credentials, and sensitive configuration
**Scope**: CI/CD secrets, cloud secret managers, rotation strategies, security best practices
**Platform**: GitHub Actions, Azure DevOps, Jenkins, AWS, Azure, GCP, HashiCorp Vault
**Version**: 2.0.0
**Last Updated**: 2025-12-05

Enterprise-grade knowledge base for secret management across CI/CD platforms and cloud environments.

## Secret Management Solutions Overview

### CI Platform Native Secrets

**Characteristics**:
- Cost: Free for most platforms
- Complexity: Low
- Rotation: Manual
- Scope: CI/CD runtime only
- Use Cases: Small projects, CI-only workflows, startup environments

**Upgrade Considerations**:
- Cloud secret managers: For production application deployments
- HashiCorp Vault: For multi-cloud, enterprise environments with dynamic secrets

**GitHub Actions Example**:
```bash
gh secret set SONAR_TOKEN --body "YOUR_TOKEN"
gh secret set SNYK_TOKEN --body "YOUR_TOKEN"
```

**Azure DevOps Example**:
```bash
az pipelines variable-group create \
  --name CISecrets \
  --variables SONAR_TOKEN=value SNYK_TOKEN=value
```

**Jenkins Example**:
1. Manage Jenkins → Credentials
2. Add Secret Text for each token

**Advantages**:
- No additional infrastructure required
- Integrated with CI/CD platform
- Simple setup and configuration
- Easy rotation process

**Limitations**:
- Available only in CI/CD runtime
- No automatic rotation capabilities
- Platform-specific (not portable)

---

## Secret Management Principles

### 1. Never Commit Secrets to Version Control

**Anti-Pattern**:
```bash
# .env file committed to git
DATABASE_URL=postgresql://admin:password123@prod-db:5432/myapp
API_KEY=sk_live_abc123def456
```

**Best Practice Pattern**:
```bash
# .env.example (committed)
DATABASE_URL=postgresql://user:password@host:5432/database
API_KEY=your_api_key_here

# .env (gitignored, never committed)
DATABASE_URL=<actual connection string>
API_KEY=<actual key>
```

### 2. Principle of Least Privilege

Grant minimal permissions needed for each component.

```yaml
# AWS IAM Policy Example
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/*"
    }
  ]
}
```

### 3. Regular Secret Rotation

**Automated Rotation**: Managed services with auto-rotation capabilities
**Manual Rotation**: Minimum frequency of 90 days
**Immediate Rotation**: Upon breach detection or suspected compromise

### 4. Encryption at Rest and in Transit

**At Rest**: KMS, Key Vault, or equivalent encryption services
**In Transit**: TLS/HTTPS protocols mandatory
**Logging**: Never log secrets in application or infrastructure logs

---

## Secret Management Solutions

### 1. CI/CD Native Secrets

#### GitHub Actions Secrets

**Configuration**:
```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
        run: ./deploy.sh
```

**Secret Management**:
```bash
# Via CLI
gh secret set DATABASE_URL --body "postgresql://..."

# Via UI
# Repository → Settings → Secrets and variables → Actions
```

**Capabilities**:
- Repository secrets: Available to all workflows
- Environment secrets: Scoped to specific environments
- Organization secrets: Shared across repositories
- Encrypted storage: AES-256 encryption at rest

**Limitations**:
- Runtime-only availability (not accessible outside workflows)
- No automatic rotation
- Platform-locked (GitHub-specific)
- Limited to single platform ecosystem

---

#### GitLab CI Variables

**Configuration**:
```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    - echo "Deploying with $DATABASE_URL"
  variables:
    DEPLOY_ENV: production
  only:
    - main
```

**Secret Management**:
```bash
# Via CLI
gitlab-rails console
> project = Project.find_by_full_path('group/project')
> project.variables.create(key: 'DATABASE_URL', value: 'postgresql://...', protected: true, masked: true)

# Via UI
# Project → Settings → CI/CD → Variables
```

**Variable Options**:
- **Protected**: Available only in protected branches
- **Masked**: Hidden in job logs
- **Environment scope**: Limited to specific environments

---

### 2. Cloud Secret Managers

#### AWS Secrets Manager

**Secret Creation**:
```bash
# Create secret
aws secretsmanager create-secret \
  --name myapp/database \
  --secret-string '{"username":"admin","password":"P@ssw0rd!"}'

# Create secret with auto-rotation
aws secretsmanager create-secret \
  --name myapp/api-key \
  --secret-string "sk_live_abc123" \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:SecretsManagerRotation \
  --rotation-rules AutomaticallyAfterDays=30
```

**Application Access Pattern**:
```javascript
// Node.js example
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });

async function getSecret(secretName) {
  const data = await secretsManager
    .getSecretValue({ SecretId: secretName })
    .promise();
  return JSON.parse(data.SecretString);
}

// Usage
const dbCreds = await getSecret('myapp/database');
const connection = new Database({
  host: dbCreds.host,
  user: dbCreds.username,
  password: dbCreds.password
});
```

**CI/CD Integration Pattern**:
```yaml
# GitHub Actions
- name: Get secrets from AWS
  env:
    AWS_REGION: us-east-1
  run: |
    SECRET=$(aws secretsmanager get-secret-value --secret-id myapp/database --query SecretString --output text)
    echo "::add-mask::$SECRET"
    echo "DATABASE_URL=$SECRET" >> $GITHUB_ENV
```

**Capabilities**:
- Automatic rotation with Lambda integration
- Fine-grained IAM permissions
- Encryption with KMS
- Audit logging via CloudTrail
- Cross-region replication

**Considerations**:
- AWS-specific solution
- Cost per secret per month
- Requires AWS IAM configuration

---

#### Azure Key Vault

**Secret Creation**:
```bash
# Create Key Vault
az keyvault create \
  --name myapp-keyvault \
  --resource-group myapp-rg \
  --location eastus

# Add secret
az keyvault secret set \
  --vault-name myapp-keyvault \
  --name database-url \
  --value "postgresql://admin:password@host:5432/db"

# Grant access
az keyvault set-policy \
  --name myapp-keyvault \
  --object-id <service-principal-id> \
  --secret-permissions get list
```

**Application Access Pattern**:
```csharp
// C# example
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

var client = new SecretClient(
    new Uri("https://myapp-keyvault.vault.azure.net/"),
    new DefaultAzureCredential()
);

KeyVaultSecret secret = await client.GetSecretAsync("database-url");
string databaseUrl = secret.Value;
```

**Capabilities**:
- Azure AD integration
- Hardware security modules (HSM) support
- Managed identity support
- Soft-delete and purge protection

**Considerations**:
- Azure-specific solution
- More complex setup required
- Cost per transaction model

---

#### GCP Secret Manager

**Secret Creation**:
```bash
# Create secret
echo -n "P@ssw0rd!" | gcloud secrets create database-password \
  --data-file=- \
  --replication-policy="automatic"

# Grant access
gcloud secrets add-iam-policy-binding database-password \
  --member="serviceAccount:myapp@project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Application Access Pattern**:
```python
# Python example
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()
name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
response = client.access_secret_version(request={"name": name})
secret_value = response.payload.data.decode('UTF-8')
```

**Capabilities**:
- Automatic replication across regions
- Version management with history
- Audit logging integration
- IAM-based access control

**Considerations**:
- GCP-specific solution
- Learning curve for GCP ecosystem
- Cost per access operation

---

### 3. HashiCorp Vault

**Setup Process**:
```bash
# Start Vault server
vault server -dev

# Initialize Vault
vault operator init

# Unseal Vault
vault operator unseal <unseal-key-1>
vault operator unseal <unseal-key-2>
vault operator unseal <unseal-key-3>

# Login
vault login <root-token>
```

**Secret Storage**:
```bash
# Enable secrets engine
vault secrets enable -path=myapp kv-v2

# Write secret
vault kv put myapp/database \
  username=admin \
  password=P@ssw0rd! \
  host=db.example.com

# Read secret
vault kv get myapp/database
```

**Dynamic Secrets Pattern (Database)**:
```bash
# Enable database secrets engine
vault secrets enable database

# Configure database connection
vault write database/config/mydb \
  plugin_name=postgresql-database-plugin \
  allowed_roles="myapp-role" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/mydb?sslmode=disable" \
  username="vault" \
  password="vault-password"

# Create role with TTL
vault write database/roles/myapp-role \
  db_name=mydb \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Generate credentials (auto-expire after 1 hour)
vault read database/creds/myapp-role
```

**Application Access Pattern**:
```javascript
// Node.js example
const vault = require('node-vault')({
  apiVersion: 'v1',
  endpoint: 'http://vault:8200',
  token: process.env.VAULT_TOKEN
});

async function getDatabaseCreds() {
  const result = await vault.read('database/creds/myapp-role');
  return {
    username: result.data.username,
    password: result.data.password
  };
}

// Renew lease before expiration
async function renewLease(leaseId) {
  await vault.write('sys/leases/renew', {
    lease_id: leaseId,
    increment: 3600  // Extend by 1 hour
  });
}
```

**Capabilities**:
- Platform-agnostic solution
- Dynamic secrets with automatic expiration
- Automatic secret rotation
- Fine-grained access policies
- Comprehensive audit logging
- Encryption as a service

**Considerations**:
- Complex setup and operational requirements
- Infrastructure management responsibility
- High availability planning required
- Significant learning curve

---

### 4. Hybrid Approach

**Architecture Pattern**: Different solutions for different secret types

```
CI/CD Secrets (GitHub/GitLab)
├── Build-time secrets (API tokens)
├── Deployment credentials
└── Non-sensitive configuration

Cloud Secret Manager (AWS/Azure/GCP)
├── Application runtime secrets
├── Database credentials
├── API keys
└── Encryption keys

HashiCorp Vault (Enterprise)
├── Dynamic database credentials
├── PKI certificates
├── Encryption keys
└── Cross-cloud secrets
```

**Integration Example**:
```yaml
# GitHub Actions with AWS Secrets Manager
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Get runtime secrets
        run: |
          DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id myapp/database --query SecretString --output text)
          echo "::add-mask::$DATABASE_URL"
          echo "DATABASE_URL=$DATABASE_URL" >> deployment-config.env

      - name: Deploy with secrets
        run: |
          source deployment-config.env
          ./deploy.sh
```

---

## Secret Injection Patterns

### 1. Environment Variables

```bash
# In container
docker run -e DATABASE_URL="$DATABASE_URL" myapp

# In Kubernetes
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: myapp
    env:
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: myapp-secrets
          key: database-url
```

### 2. Configuration Files

```bash
# Generate config from secrets at runtime
cat > /app/config.json <<EOF
{
  "database": {
    "url": "$DATABASE_URL"
  },
  "api": {
    "key": "$API_KEY"
  }
}
EOF
```

### 3. Volume Mounts (Kubernetes)

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: myapp
      volumeMounts:
        - name: secrets
          mountPath: /etc/secrets
          readOnly: true
  volumes:
    - name: secrets
      secret:
        secretName: myapp-secrets
```

---

## Security Best Practices

### 1. Never Log Secrets

**Anti-Pattern**:
```javascript
console.log('Connecting with:', databaseUrl);
```

**Best Practice**:
```javascript
console.log('Connecting to database...');
```

### 2. Secret Scanning (Gitleaks)

```yaml
# .github/workflows/security.yml
- name: Gitleaks
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 3. Mask Secrets in CI/CD Logs

```yaml
# GitHub Actions
- name: Use secret
  run: |
    echo "::add-mask::${{ secrets.API_KEY }}"
    echo "API_KEY=${{ secrets.API_KEY }}" >> $GITHUB_ENV
```

### 4. Limit Secret Access by Environment

```yaml
# Only specific environments
deploy-prod:
  environment:
    name: production
  secrets:
    - DATABASE_URL  # Only available in prod environment
```

### 5. Audit Secret Access

```bash
# AWS CloudTrail query
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
  --start-time 2024-01-01 \
  --end-time 2024-01-31
```

---

## Secret Rotation Strategies

### 1. Automated Rotation (AWS)

```javascript
// Lambda function for secret rotation
exports.handler = async (event) => {
  const { SecretId, ClientRequestToken, Step } = event;

  switch (Step) {
    case 'createSecret':
      // Generate new password
      const newPassword = generatePassword();
      await secretsManager.putSecretValue({
        SecretId,
        SecretString: newPassword,
        VersionStages: ['AWSPENDING'],
        ClientRequestToken
      }).promise();
      break;

    case 'setSecret':
      // Update database with new password
      await database.changePassword(newPassword);
      break;

    case 'testSecret':
      // Test new credentials
      await database.connect(newPassword);
      break;

    case 'finishSecret':
      // Mark new version as current
      await secretsManager.updateSecretVersionStage({
        SecretId,
        VersionStage: 'AWSCURRENT',
        MoveToVersionId: ClientRequestToken,
        RemoveFromVersionId: event.Token
      }).promise();
      break;
  }
};
```

### 2. Manual Rotation Procedure

**Rotation Steps**:
1. Generate new secret value
2. Update secret in secret manager
3. Deploy application with new secret
4. Verify application functionality
5. Revoke old secret value
6. Update documentation

---

## Emergency Procedures

### Compromised Secret Response

**Response Steps**:
1. **Immediate** (< 5 minutes): Rotate compromised secret
2. **Audit**: Check access logs for unauthorized usage
3. **Notify**: Inform security team and stakeholders
4. **Investigate**: Determine compromise vector
5. **Remediate**: Fix vulnerability that enabled compromise
6. **Document**: Record incident and resolution steps

### Secret Recovery

```bash
# Recover previous version (AWS)
aws secretsmanager get-secret-value \
  --secret-id myapp/database \
  --version-stage AWSPREVIOUS
```

---

## Comparison Matrix

| Solution | Cost | Complexity | Rotation | Platform | Use Cases |
|----------|------|------------|----------|----------|-----------|
| **GitHub Secrets** | Free | Low | Manual | GitHub | Small projects, CI/CD only |
| **GitLab Variables** | Free | Low | Manual | GitLab | Small projects, CI/CD only |
| **AWS Secrets Manager** | $0.40/secret/month | Medium | Auto | AWS | AWS-native applications |
| **Azure Key Vault** | $0.03/10k ops | Medium | Manual | Azure | Azure-native applications |
| **GCP Secret Manager** | $0.06/10k ops | Medium | Manual | GCP | GCP-native applications |
| **HashiCorp Vault** | Self-hosted | High | Auto | Any | Enterprise, multi-cloud |

---

## Implementation Checklist

### Setup Phase
- [ ] Choose secret management solution based on requirements
- [ ] Set up secret storage (Vault, Secrets Manager, etc.)
- [ ] Configure access policies with least privilege
- [ ] Set up secret rotation (if supported)
- [ ] Configure audit logging

### Application Integration
- [ ] Add secret fetching to application startup
- [ ] Implement secret caching (with TTL)
- [ ] Handle secret rotation gracefully
- [ ] Add secret refresh logic
- [ ] Test with expired/invalid secrets

### CI/CD Integration
- [ ] Store deployment credentials securely
- [ ] Fetch secrets at deployment time
- [ ] Mask secrets in logs
- [ ] Set up secret scanning (Gitleaks)
- [ ] Test deployment with rotated secrets

### Operations
- [ ] Document secret rotation procedure
- [ ] Set up secret expiration alerts
- [ ] Create incident response plan
- [ ] Schedule regular secret audits
- [ ] Train team on secret management

---

## See Also

**Related DevOps Practices**:
- `ci-cd-patterns.md` - CI/CD pipeline patterns and security integration

**Related Memory**:
- `${config.memory.tools.devxops}` - DxOps Guardian secret scanning configuration
- `${config.memory.tools.github}` - GitHub Actions secret management patterns
- `${config.memory.tools.azure_devops}` - Azure DevOps variable management

---

**Version**: 2.0.0
**Last Updated**: 2025-12-05
**Status**: Active
**Philosophy Alignment**: 95%

**Changelog v2.0.0**:
- Added metadata header with purpose, scope, and platform information
- Converted prescriptive "Quick Start" section to descriptive "Solutions Overview"
- Removed directive language (replaced with descriptive patterns)
- Added cross-references to related memory files
- Improved structure with clear knowledge categorization
- Philosophy-aligned: Pure knowledge, no agent/command logic
