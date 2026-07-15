# Azure DevOps Work Item Operations

This document defines the implementation methods for Azure DevOps work item operations in Phoenix OS.

**CRITICAL REQUIREMENT**: All work item operations MUST use Azure DevOps native work item types. Always query the `System.WorkItemType` field from the Azure DevOps API to get the actual work item type. Never infer types from titles or other fields.

## Prerequisites

### Authentication Setup
```bash
# Install Azure CLI (if not already installed)
# Windows: https://aka.ms/installazurecliwindows
# Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
# macOS: brew install azure-cli

# Install Azure DevOps extension
az extension add --name azure-devops

# Login to Azure (OAuth flow, stores credentials in keyring)
az login

# Configure default organization and project
az devops configure --defaults organization=https://dev.azure.com/{organization} project={project}

# Verify configuration
az devops configure --list
```

### Check Authentication Status
```bash
# Verify you're logged in
az account show

# Check Azure DevOps extension version
az extension show --name azure-devops --query version
```

## Azure DevOps Native Work Item Types

### Available Work Item Types (Agile Process Template)
Azure DevOps uses hierarchical work item types:
- **Epic**: Large initiative spanning multiple sprints (top-level)
- **Feature**: Deliverable functionality under an Epic
- **User Story**: User perspective functionality for single sprint
- **Task**: Specific piece of work (child of User Story)
- **Bug**: Unexpected problem or behavior
- **Issue**: Impediment or risk

### Work Item Type Hierarchy
```
Epic
 └── Feature
      └── User Story
           ├── Task
           ├── Task
      └── Bug (can be standalone or linked to User Story)
```

## Finding Related Work Items

### Search by Keywords and Type
```bash
# Search for work items by title keywords
az boards query --wiql "SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State] FROM WorkItems WHERE [System.Title] CONTAINS 'Azure DevOps'"

# Search for specific work item type
az boards query --wiql "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.WorkItemType] = 'Feature'"

# Search for active User Stories
az boards query --wiql "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.WorkItemType] = 'User Story' AND [System.State] = 'Active'"

# Search assigned to me
az boards query --wiql "SELECT [System.Id], [System.Title], [System.WorkItemType] FROM WorkItems WHERE [System.AssignedTo] = @Me"
```

### List Work Items
```bash
# List all work items in current iteration
az boards work-item query --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.IterationPath] = @CurrentIteration"

# List recent work items (last 30 days)
az boards work-item query --wiql "SELECT [System.Id], [System.Title], [System.WorkItemType] FROM WorkItems WHERE [System.ChangedDate] >= @Today-30"
```

## Work Item CRUD Operations

### Get Work Item Details
```bash
# Get work item by ID (full details)
az boards work-item show --id {work-item-id}

# Get specific fields only
az boards work-item show --id {work-item-id} --fields System.Title System.State System.AssignedTo

# Get work item in JSON format
az boards work-item show --id {work-item-id} --output json

# Example: Get work item #290
az boards work-item show --id 290
```

### Extract Work Item Type
```bash
# Get work item type for specific ID
az boards work-item show --id {work-item-id} --query "fields.\"System.WorkItemType\"" --output tsv

# Example: Get type for work item #290
az boards work-item show --id 290 --query "fields.\"System.WorkItemType\"" --output tsv
# Output: Feature
```

### Create Work Item
```bash
# Create Feature
az boards work-item create \
  --type "Feature" \
  --title "Enable Azure DevOps support" \
  --description "Add platform abstraction layer for Azure DevOps" \
  --assigned-to "user@example.com"

# Create User Story linked to Feature
az boards work-item create \
  --type "User Story" \
  --title "Create Azure DevOps tool memory" \
  --description "Document Azure DevOps CLI patterns in memory layer" \
  --assigned-to "user@example.com" \
  --iteration "Sprint 1" \
  --area "Platform"

# Create Task linked to User Story
az boards work-item create \
  --type "Task" \
  --title "Document work item operations" \
  --description "Create work-item-operations.md memory file"
```

### Update Work Item
```bash
# Update work item state
az boards work-item update --id {work-item-id} --state "Active"

# Update work item fields
az boards work-item update --id {work-item-id} \
  --title "Updated title" \
  --assigned-to "user@example.com" \
  --state "Resolved"

# Add comment
az boards work-item update --id {work-item-id} --discussion "Work completed, ready for review"

# Example: Mark work item #290 as active
az boards work-item update --id 290 --state "Active"
```

### Link Work Items (Parent-Child Relationships)
```bash
# Link Task to User Story (parent)
az boards work-item relation add \
  --id {task-id} \
  --relation-type "Parent" \
  --target-id {user-story-id}

# Link User Story to Feature (parent)
az boards work-item relation add \
  --id {user-story-id} \
  --relation-type "Parent" \
  --target-id {feature-id}

# Link Feature to Epic (parent)
az boards work-item relation add \
  --id {feature-id} \
  --relation-type "Parent" \
  --target-id {epic-id}

# Example: Link Task #295 to User Story #290
az boards work-item relation add --id 295 --relation-type "Parent" --target-id 290
```

### Get Work Item Relationships
```bash
# Show all related work items
az boards work-item relation show --id {work-item-id}

# Get parent work item
az boards work-item relation show --id {work-item-id} --query "relations[?attributes.name=='Parent'].url" --output tsv

# Get child work items
az boards work-item relation show --id {work-item-id} --query "relations[?attributes.name=='Child'].url" --output tsv
```

## Work Item State Management

### Standard States (Agile Process)
- **New**: Just created, not yet started
- **Active**: Currently being worked on
- **Resolved**: Work completed, pending verification
- **Closed**: Verified and completed
- **Removed**: Work item removed/cancelled

### Transition Work Item State
```bash
# Start work (New → Active)
az boards work-item update --id {work-item-id} --state "Active"

# Complete work (Active → Resolved)
az boards work-item update --id {work-item-id} --state "Resolved"

# Close work (Resolved → Closed)
az boards work-item update --id {work-item-id} --state "Closed"

# Cancel work (Any → Removed)
az boards work-item update --id {work-item-id} --state "Removed"
```

## Mapping GitHub Issues to Azure DevOps Work Items

### Type Mapping
| GitHub Issue Type | Azure DevOps Work Item Type | Notes |
|-------------------|------------------------------|-------|
| Epic | Epic | Direct 1:1 mapping |
| Feature | Feature | Direct 1:1 mapping |
| Story | User Story | GitHub "Story" = Azure DevOps "User Story" |
| Task | Task | Direct 1:1 mapping |
| Bug | Bug | Direct 1:1 mapping |
| Chore | Task | Chores map to Tasks with custom tags |

### State Mapping
| GitHub State | Azure DevOps State | Notes |
|--------------|-------------------|-------|
| Open | New or Active | New if unassigned, Active if work started |
| Closed | Resolved or Closed | Use Resolved for review, Closed for verified |

### Field Mapping
| GitHub Field | Azure DevOps Field | Notes |
|--------------|-------------------|-------|
| `title` | `System.Title` | Direct mapping |
| `body` | `System.Description` | Direct mapping (HTML format) |
| `state` | `System.State` | See state mapping above |
| `assignees` | `System.AssignedTo` | Single assignee in Azure DevOps |
| `labels` | `System.Tags` | Comma-separated tags |
| `number` | `System.Id` | Work item ID |

## Phoenix OS Integration Patterns

### Fetch Work Item for Implementation
```bash
# Get work item details for spec generation
WORK_ITEM_ID=290
az boards work-item show --id $WORK_ITEM_ID --output json > work-item-$WORK_ITEM_ID.json

# Extract title and description for spec
TITLE=$(az boards work-item show --id $WORK_ITEM_ID --query "fields.\"System.Title\"" --output tsv)
DESCRIPTION=$(az boards work-item show --id $WORK_ITEM_ID --query "fields.\"System.Description\"" --output tsv)

# Get acceptance criteria (if custom field exists)
az boards work-item show --id $WORK_ITEM_ID --query "fields.\"Microsoft.VSTS.Common.AcceptanceCriteria\"" --output tsv
```

### Link Pull Request to Work Item
```bash
# Note: PR linking is done during PR creation in Azure Repos
# See repo-operations.md and pr-operations.md for details

# Verify work item links after PR creation
az boards work-item relation show --id {work-item-id} --query "relations[?attributes.name=='Pull Request']"
```

## Error Handling

### Common Errors and Solutions

**Error: "TF401349: Work item does not exist or you do not have permissions"**

**Error Context**:
- **What**: Work item query failed - cannot access work item {work-item-id}
- **Why**: Work item ID doesn't exist, or user lacks "Read Work Items" permission, or work item is in different project
- **Fix**: Verify work item exists: `az boards query --wiql "SELECT [System.Id] FROM WorkItems WHERE [System.Id] = {work-item-id}"`. If exists, request "Reader" or "Contributor" role from project admin. Verify project configuration: `az devops configure --list`
- **Alternative**: Use Azure DevOps web UI to verify work item existence and permissions. Check if work item is in different project/organization.
- **Impact**: Cannot fetch work item details, blocks implementation workflow, spec generation, and feature planning

**Error: "Please run 'az login' to setup account"**

**Error Context**:
- **What**: Azure CLI authentication not configured
- **Why**: User not logged in to Azure, or authentication token expired, or keyring credentials cleared
- **Fix**: Run `az login` to initiate OAuth flow and store credentials in system keyring. Then configure defaults: `az devops configure --defaults organization=https://dev.azure.com/{organization} project={project}`
- **Alternative**: Use service principal authentication for CI/CD: `az login --service-principal -u {client-id} -p {client-secret} --tenant {tenant-id}`
- **Impact**: Cannot execute any Azure DevOps operations, blocks all work item queries, updates, and PR operations

**Error: "The extension 'azure-devops' is not installed"**

**Error Context**:
- **What**: Azure DevOps CLI extension missing
- **Why**: Extension not installed with Azure CLI, or removed, or Azure CLI version too old
- **Fix**: Install extension: `az extension add --name azure-devops`. Verify installation: `az extension show --name azure-devops --query version`
- **Alternative**: Update Azure CLI to latest version: `az upgrade` (may include extension). Or use REST API directly.
- **Impact**: Cannot use `az boards` commands, blocks all work item operations via CLI

**Error: "VS403463: You do not have permission to create work items in this project"**

**Error Context**:
- **What**: Work item creation failed due to insufficient permissions
- **Why**: User account lacks "Contribute to this project" permission, or assigned "Reader" role only, or project has restricted work item creation
- **Fix**: Request "Contributor" or "Basic + Test Plans" access level from project admin. Verify current permissions: `az devops security permission show --id {project-id}`
- **Alternative**: Ask project admin to create work item on your behalf, or use different account with appropriate permissions
- **Impact**: Cannot create work items, blocks feature planning, bug reporting, and task creation workflows

## Best Practices

1. **Always verify work item type**: Use `System.WorkItemType` field, never infer from title
2. **Use parent-child linking**: Maintain hierarchy (Epic → Feature → User Story → Task)
3. **State transitions**: Follow proper workflow (New → Active → Resolved → Closed)
4. **Authentication**: Use `az login` for secure keyring-based auth (not PAT)
5. **Defaults configuration**: Set organization and project defaults to simplify commands
6. **Query optimization**: Use WIQL for complex queries, CLI for simple operations
7. **Batch operations**: Use `az boards work-item update` for multiple field updates

## See Also

- [Azure DevOps CLI Reference](https://learn.microsoft.com/en-us/cli/azure/boards)
- [Work Item Tracking REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/)
- [WIQL Syntax Reference](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
- [pr-operations.md](pr-operations.md) - Pull request operations
- [repo-operations.md](repo-operations.md) - Repository operations
- [pipeline-operations.md](pipeline-operations.md) - Pipeline operations

---

**Version**: 1.0.0
**Last Updated**: 2025-12-24
**Platform**: Azure DevOps
**Authentication**: Azure CLI (az login + keyring)
