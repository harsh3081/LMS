# Gitleaks HTML Report Template

**Intent**: Predefined HTML template for Gitleaks secret scanning reports with consistent styling.

**Context**: Jinja2 template for embedding in `gitleaks-html-generator.py` script.

---
**Memory Type**: Long-Term (LT)
**Category**: HTML Templates (tools/devxops/html-templates)
**Update Authority**: PR-based updates only
---

**Version**: 1.0.0
**Last Updated**: 2024-12-11
**Status**: Production-Ready

---

## Template Usage

This template MUST be copied verbatim into the `gitleaks-html-generator.py` script at line 30 as:

```python
html_template = """
[PASTE FULL TEMPLATE BELOW]
"""
```

---

## Jinja2 HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gitleaks Security Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            color: #333;
        }
        .container {
            width: 90%;
            margin: 20px auto;
            background: white;
            padding: 20px;
            box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow-x: auto;
        }
        h1 {
            text-align: center;
            color: #dc3545;
        }
        h3 {
            background: #007bff;
            color: white;
            padding: 10px;
            border-radius: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            table-layout: fixed;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
            word-wrap: break-word;
            overflow: hidden;
        }
        th {
            background-color: #dc3545;
            color: white;
        }
        .summary-table td {
            font-weight: bold;
            background-color: #f8f9fa;
        }
        .secret {
            font-family: monospace;
            color: red;
        }
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-x: auto;
        }
    </style>
</head>
<body>

<div class="container">
    <h1>🔒 Gitleaks Security Report</h1>

    <h3>📝 Summary</h3>
    <table class="summary-table">
        <tr><td>Total Issues Found</td><td>{{ total_findings }}</td></tr>
        <tr><td>Unique Files Affected</td><td>{{ unique_files }}</td></tr>
        <tr><td>Unique Rule Types</td><td>{{ unique_rules }}</td></tr>
        <tr><td>Report Generated</td><td>{{ generated_at }}</td></tr>
    </table>

    <h3>🔎 Detected Secrets</h3>
    {% if total_findings > 0 %}
    <div style="overflow-x: auto;">
        <table>
            <tr>
                <th>Rule ID</th>
                <th>Description</th>
                <th>File</th>
                <th>Line</th>
                <th>Secret</th>
                <th>Commit</th>
                <th>Author</th>
            </tr>
            {% for finding in findings %}
            <tr>
                <td>{{ finding.RuleID }}</td>
                <td>{{ finding.Description }}</td>
                <td>{{ finding.File }}</td>
                <td>{{ finding.StartLine }}</td>
                <td class="secret"><pre>{{ finding.Secret[:50] }}{% if finding.Secret|length > 50 %}...{% endif %}</pre></td>
                <td>{{ finding.Commit[:8] if finding.Commit else 'N/A' }}</td>
                <td>{{ finding.Author if finding.Author else 'N/A' }}</td>
            </tr>
            {% endfor %}
        </table>
    </div>
    {% else %}
    <div style="text-align: center; padding: 40px; color: #28a745; font-size: 1.2em;">
        <div style="font-size: 3em;">✅</div>
        <h2>No Secrets Detected</h2>
        <p>Your repository is clean! No hardcoded secrets were found.</p>
    </div>
    {% endif %}
</div>

</body>
</html>
```

---

## Template Variables

The following Jinja2 variables MUST be provided by the Python script:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `findings` | list | Array of secret findings from Gitleaks JSON | `[{RuleID: "...", File: "...", ...}]` |
| `total_findings` | int | Count of secrets found | `3` |
| `unique_files` | int | Count of unique files with secrets | `2` |
| `unique_rules` | int | Count of unique rule types triggered | `2` |
| `generated_at` | string | Report generation timestamp | `"2024-12-11 10:30:45 UTC"` |

---

## Python Script Integration

```python
# In gitleaks-html-generator.py

def generate_html_report(data, output_file):
    """Generate HTML report using Jinja2 template."""

    # Embedded template from memory
    html_template = """
    [PASTE TEMPLATE FROM ABOVE]
    """

    # Prepare data
    findings = data if isinstance(data, list) else []
    unique_files = len(set(f.get('File', '') for f in findings))
    unique_rules = len(set(f.get('RuleID', '') for f in findings))

    template_data = {
        'findings': findings,
        'total_findings': len(findings),
        'unique_files': unique_files,
        'unique_rules': unique_rules,
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')
    }

    # Render
    template = Template(html_template)
    html_output = template.render(**template_data)

    # Write
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_output)
```

---

## Design Notes

**Color Scheme**:
- Background: `#f4f4f4` (light gray)
- Container: `white`
- Primary: `#dc3545` (red - for security warnings)
- Secondary: `#007bff` (blue - for sections)
- Success: `#28a745` (green - for clean reports)

**Layout**:
- Responsive width: 90% max
- Rounded corners: 8px
- Box shadow for depth
- Horizontal scroll for wide tables

**Typography**:
- Font: Arial, sans-serif
- Monospace for secrets: `pre` tag

---

## See Also

**Related Memory**:
- [Gitleaks Config](../gitleaks-config.md) - Gitleaks configuration patterns
- [Workflow Patterns](../../github-actions/workflow-patterns.md) - CI integration

**Configuration**:
- Referenced in: `${config.memory.tools.devxops.html_templates.gitleaks}`

---

END OF TEMPLATE
