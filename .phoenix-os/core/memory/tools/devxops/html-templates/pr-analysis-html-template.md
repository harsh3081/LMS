# GitHub PR Analysis HTML Template

**Intent**: Predefined HTML template for GitHub PR analysis reports with file categorization and metrics.

**Context**: Jinja2 template for embedding in `github-pr-analysis.py` script.

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

This template MUST be copied verbatim into the `github-pr-analysis.py` script at line 111 as:

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
    <title>GitHub PR Analysis Report - #{{ pr_number }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f4f4f4;
            color: #333;
        }
        h1, h2 {
            text-align: center;
            color: #333;
        }
        .summary {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #4CAF50;
            color: white;
        }
        .summary-table th {
            background-color: #333;
        }
        .category-table th {
            background-color: #2c3e50;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        .metric-value {
            font-weight: bold;
            color: #2196F3;
        }
        .size-small {
            color: #28a745;
            font-weight: bold;
        }
        .size-medium {
            color: #ffc107;
            font-weight: bold;
        }
        .size-large {
            color: #ff9800;
            font-weight: bold;
        }
        .size-xlarge {
            color: #dc3545;
            font-weight: bold;
        }
        .file-list {
            list-style: none;
            padding: 0;
        }
        .file-list li {
            padding: 5px;
            margin: 3px 0;
            background: #f8f9fa;
            border-left: 3px solid #4CAF50;
            font-family: monospace;
            font-size: 0.9em;
        }
        .category-section {
            background: white;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .category-section h3 {
            margin-top: 0;
            color: #2c3e50;
        }
    </style>
</head>
<body>
    <h1>📊 GitHub Pull Request Analysis</h1>
    <h2>PR #{{ pr_number }} → {{ base_branch }}</h2>

    <div class="summary">
        <h2>Summary Metrics</h2>
        <table class="summary-table">
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Files Changed</td><td class="metric-value">{{ stats.files_changed }}</td></tr>
            <tr><td>Lines Added</td><td class="metric-value" style="color: #28a745;">+{{ stats.additions }}</td></tr>
            <tr><td>Lines Deleted</td><td class="metric-value" style="color: #dc3545;">-{{ stats.deletions }}</td></tr>
            <tr><td>Total Changes</td><td class="metric-value">{{ stats.total_changes }}</td></tr>
            <tr><td>PR Size</td><td class="size-{{ size_class }}">{{ size_label }}</td></tr>
            <tr><td>Report Generated</td><td>{{ generated_at }}</td></tr>
        </table>
    </div>

    <h2>📁 Files by Category</h2>

    {% if file_categories.code %}
    <div class="category-section">
        <h3>💻 Code Files ({{ file_categories.code|length }})</h3>
        <ul class="file-list">
        {% for file in file_categories.code %}
            <li>{{ file }}</li>
        {% endfor %}
        </ul>
    </div>
    {% endif %}

    {% if file_categories.tests %}
    <div class="category-section">
        <h3>🧪 Test Files ({{ file_categories.tests|length }})</h3>
        <ul class="file-list">
        {% for file in file_categories.tests %}
            <li>{{ file }}</li>
        {% endfor %}
        </ul>
    </div>
    {% endif %}

    {% if file_categories.styles %}
    <div class="category-section">
        <h3>🎨 Style Files ({{ file_categories.styles|length }})</h3>
        <ul class="file-list">
        {% for file in file_categories.styles %}
            <li>{{ file }}</li>
        {% endfor %}
        </ul>
    </div>
    {% endif %}

    {% if file_categories.documentation %}
    <div class="category-section">
        <h3>📝 Documentation ({{ file_categories.documentation|length }})</h3>
        <ul class="file-list">
        {% for file in file_categories.documentation %}
            <li>{{ file }}</li>
        {% endfor %}
        </ul>
    </div>
    {% endif %}

    {% if file_categories.config %}
    <div class="category-section">
        <h3>⚙️ Configuration ({{ file_categories.config|length }})</h3>
        <ul class="file-list">
        {% for file in file_categories.config %}
            <li>{{ file }}</li>
        {% endfor %}
        </ul>
    </div>
    {% endif %}

    {% if file_categories.other %}
    <div class="category-section">
        <h3>📦 Other Files ({{ file_categories.other|length }})</h3>
        <ul class="file-list">
        {% for file in file_categories.other %}
            <li>{{ file }}</li>
        {% endfor %}
        </ul>
    </div>
    {% endif %}

    <h2>📋 All Changed Files</h2>
    <table class="category-table">
        <tr>
            <th>#</th>
            <th>File Path</th>
            <th>Category</th>
        </tr>
        {% for file in stats.files %}
        <tr>
            <td>{{ loop.index }}</td>
            <td style="font-family: monospace; font-size: 0.9em;">{{ file }}</td>
            <td>
                {% if '.js' in file or '.ts' in file or '.jsx' in file or '.tsx' in file %}💻 Code
                {% elif '.css' in file or '.scss' in file or '.sass' in file %}🎨 Style
                {% elif '.test.' in file or '.spec.' in file or '__tests__' in file %}🧪 Test
                {% elif '.md' in file or 'docs/' in file %}📝 Docs
                {% elif '.yml' in file or '.yaml' in file or '.json' in file %}⚙️ Config
                {% else %}📦 Other
                {% endif %}
            </td>
        </tr>
        {% endfor %}
    </table>

    <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 5px;">
        <p style="color: #666; font-size: 0.9em;">
            Generated by DxOps Guardian PR Analysis<br>
            Report Date: {{ generated_at }}
        </p>
    </div>

</body>
</html>
```

---

## Template Variables

The following Jinja2 variables MUST be provided by the Python script:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `pr_number` | int | Pull request number | `123` |
| `base_branch` | string | Target branch name | `"main"` |
| `stats` | dict | PR statistics object | See below |
| `stats.files` | list | Array of changed file paths | `["src/app.ts", "README.md"]` |
| `stats.files_changed` | int | Count of files changed | `15` |
| `stats.additions` | int | Lines added | `245` |
| `stats.deletions` | int | Lines deleted | `87` |
| `stats.total_changes` | int | Total changes (adds + dels) | `332` |
| `size_label` | string | PR size label | `"Small"`, `"Medium"`, `"Large"`, `"Extra Large"` |
| `size_class` | string | CSS class for size | `"small"`, `"medium"`, `"large"`, `"xlarge"` |
| `file_categories` | dict | Files grouped by category | See below |
| `file_categories.code` | list | Code files (.js, .ts, .jsx, .tsx) | `["src/app.ts"]` |
| `file_categories.tests` | list | Test files (.test., .spec., __tests__) | `["app.test.ts"]` |
| `file_categories.styles` | list | Style files (.css, .scss, .sass) | `["main.scss"]` |
| `file_categories.documentation` | list | Documentation files (.md, docs/) | `["README.md"]` |
| `file_categories.config` | list | Config files (.yml, .yaml, .json) | `["package.json"]` |
| `file_categories.other` | list | Other files | `["image.png"]` |
| `generated_at` | string | Report generation timestamp | `"2024-12-11 10:30:45 UTC"` |

---

## Python Script Integration

```python
# In github-pr-analysis.py

def generate_html_report(pr_number, base_branch, stats, output_file):
    """Generate HTML report from PR analysis data."""

    # Categorize files
    file_categories = {
        'code': [],
        'styles': [],
        'tests': [],
        'documentation': [],
        'config': [],
        'other': []
    }

    for file in stats['files']:
        category = categorize_file(file)
        file_categories[category].append(file)

    # Determine PR size
    size_label, size_class = determine_pr_size(stats['total_changes'])

    # Embedded template from memory
    html_template = """
    [PASTE TEMPLATE FROM ABOVE]
    """

    # Prepare data
    template_data = {
        'pr_number': pr_number,
        'base_branch': base_branch,
        'stats': stats,
        'size_label': size_label,
        'size_class': size_class,
        'file_categories': file_categories,
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

## PR Size Classification

| Size | Total Changes | CSS Class | Color |
|------|--------------|-----------|-------|
| Small | < 50 | `size-small` | Green (#28a745) |
| Medium | 50-199 | `size-medium` | Yellow (#ffc107) |
| Large | 200-499 | `size-large` | Orange (#ff9800) |
| Extra Large | ≥ 500 | `size-xlarge` | Red (#dc3545) |

---

## File Categorization Logic

| Category | Pattern | Icon |
|----------|---------|------|
| Code | `.js`, `.ts`, `.jsx`, `.tsx` | 💻 |
| Styles | `.css`, `.scss`, `.sass` | 🎨 |
| Tests | `.test.`, `.spec.`, `__tests__` | 🧪 |
| Documentation | `.md`, `docs/` | 📝 |
| Configuration | `.yml`, `.yaml`, `.json` | ⚙️ |
| Other | Everything else | 📦 |

---

## Design Notes

**Color Scheme**:
- Background: `#f4f4f4` (light gray)
- Primary: `#4CAF50` (green - for headers)
- Secondary: `#2c3e50` (dark blue - for category tables)
- Success: `#28a745` (green - additions)
- Danger: `#dc3545` (red - deletions)
- Info: `#2196F3` (blue - metrics)

**Layout**:
- Centered headers
- Card-based category sections with shadows
- Responsive tables with horizontal scroll
- Color-coded PR size indicators

**Typography**:
- Font: Arial, sans-serif
- Monospace for file paths: `font-family: monospace`

---

## See Also

**Related Memory**:
- [PR Workflow Patterns](../../github-actions/pr-workflow-patterns.md) - PR automation patterns
- [Workflow Patterns](../../github-actions/workflow-patterns.md) - CI integration

**Configuration**:
- Referenced in: `${config.memory.tools.devxops.html_templates.pr_analysis}`

---

END OF TEMPLATE
