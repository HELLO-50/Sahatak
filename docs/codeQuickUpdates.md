# Code Navigation & Quick Updates Guide - Sahatak Telemedicine Platform

## Table of Contents
1. [Overview](#overview)
2. [VS Code Search Tools](#vs-code-search-tools)
3. [Command Line Tools](#command-line-tools)
4. [Common Search Patterns](#common-search-patterns)
5. [Quick Update Workflows](#quick-update-workflows)
6. [File Navigation Strategies](#file-navigation-strategies)
7. [Performance Tips](#performance-tips)

---

## Overview

This guide teaches new developers how to quickly find and update code in the Sahatak codebase. Mastering these techniques will dramatically speed up your development workflow and help you understand the codebase structure.

### When to Use Which Tool

```
Task                          | Best Tool        | Alternative
------------------------------|------------------|------------------
Find specific text           | VS Code Search   | grep
Find files by name           | Ctrl+P          | find command
Navigate to function         | Ctrl+Shift+O    | VS Code Search
Replace across files         | VS Code Replace | sed command
Find API endpoints          | grep patterns   | VS Code Search
Locate CSS classes         | VS Code Search   | grep
Find HTML elements         | VS Code Search   | Browser DevTools
```

---

## VS Code Search Tools

### 1. Quick File Open (Ctrl+P / Cmd+P)

**Use when:** You know the file name or part of it

**Examples:**
```
admin.html          → Find admin dashboard
appointment         → Find appointment-related files
main.css           → Find main stylesheet
api                → Find API-related files
.js                → Show all JavaScript files
```

**Pro Tips:**
- Type partial names: `admin` finds `admin.html`, `admin.js`, etc.
- Use extensions: `.py` shows all Python files
- Navigate with arrow keys, Enter to open

### 2. Global Search (Ctrl+Shift+F / Cmd+Shift+F)

**Use when:** You need to find text across multiple files

**Basic Search Examples:**
```javascript
// Find all API calls
ApiHelper.makeRequest

// Find specific functions
function bookAppointment

// Find CSS classes
.dashboard-card

// Find HTML elements
id="appointment-form"

// Find database models
class User
```

**Advanced Search Options:**
- **Match Case** (Aa): Case-sensitive search
- **Match Whole Word** (Ab): Exact word matches only
- **Use Regular Expression** (.*): Pattern-based search

### 3. Regular Expression Patterns

**Use when:** You need complex search patterns

```javascript
// Find all console.log statements
console\.log\(.*\)

// Find all function declarations
function\s+\w+\s*\(

// Find all API endpoints
@app\.route\(['"].*['"]

// Find all event listeners
addEventListener\(['"].*['"]

// Find all CSS class assignments
class\s*=\s*['"][^'"]*['"]

// Find all database queries
\.(query|filter|get)\(

// Find all error handling
catch\s*\(.*\)\s*\{

// Find all HTML form inputs
<input[^>]*type=['"].*['"]
```

### 4. Search Within Files (Ctrl+F / Cmd+F)

**Use when:** Searching within the currently open file

**Quick Tips:**
```
Ctrl+F          → Open search box
F3              → Find next
Shift+F3        → Find previous
Ctrl+H          → Find and replace
Alt+Enter       → Select all occurrences
Ctrl+D          → Select next occurrence
```

### 5. Go to Symbol (Ctrl+Shift+O / Cmd+Shift+O)

**Use when:** You want to navigate to functions, classes, or methods in current file

**Examples:**
- In JavaScript: Functions, classes, variables
- In Python: Functions, classes, methods
- In CSS: CSS rules and selectors
- In HTML: IDs and important elements

---

## Command Line Tools

### 1. grep (Linux/Mac) / findstr (Windows)

**Use when:** You need powerful text searching from command line

**Basic grep syntax:**
```bash
# Find text in all files
grep -r "ApiHelper" .

# Find in specific file types
grep -r "function" --include="*.js" .

# Case insensitive search
grep -ri "appointment" .

# Show line numbers
grep -rn "class User" .

# Find files containing pattern
grep -rl "Chart.js" .
```

**Common Sahatak searches:**
```bash
# Find all API endpoints
grep -r "@app.route" backend/

# Find all JavaScript functions
grep -r "function " frontend/

# Find all CSS classes
grep -r "\." frontend/assets/css/

# Find all form submissions
grep -r "addEventListener.*submit" frontend/

# Find all database models
grep -r "class.*db.Model" backend/
```

### 2. find Command

**Use when:** You need to find files by name, type, or properties

**Basic find syntax:**
```bash
# Find files by name
find . -name "*.js"
find . -name "*appointment*"

# Find files by type
find . -type f -name "*.css"

# Find and execute command
find . -name "*.py" -exec grep -l "User" {} \;
```

**Sahatak-specific examples:**
```bash
# Find all HTML files
find . -name "*.html"

# Find all Python routes
find backend/ -name "*.py" -path "*/routes/*"

# Find all CSS files
find frontend/assets/css/ -name "*.css"

# Find all JavaScript components
find frontend/assets/js/ -name "*.js"
```

### 3. Advanced Pattern Search Tools

**Pattern-Based Search:**
Some advanced tools allow pattern-based searching with specific syntax:

**Advanced grep patterns for patterns:**
```bash
# Find numbered sections
grep -rE "### [0-9]+\." docs/

# Find function definitions
grep -rE "function [a-zA-Z_][a-zA-Z0-9_]*\(" --include="*.js" .

# Find class definitions  
grep -rE "class [A-Z][a-zA-Z0-9_]*" --include="*.py" .

# Find route decorators
grep -rE "@[a-zA-Z_]+\.route" --include="*.py" .

# Find HTML IDs and classes
grep -rE "(id|class)=\"[^\"]*\"" --include="*.html" .
```

---

## Common Search Patterns

### 1. Finding API-Related Code

**Frontend API Calls:**

*How to search in VS Code:*
1. Press `Ctrl+Shift+F` (Global Search)
2. For regex patterns, click the `.*` button to enable regex mode
3. Enter one of these search patterns:

```javascript
ApiHelper.makeRequest    // Simple text search
fetch\(                 // Regex: finds fetch( calls
axios\(                 // Regex: finds axios( calls  
\.post\(                // Regex: finds .post( calls
\.get\(                 // Regex: finds .get( calls
```

**Backend API Endpoints:**

*How to search in VS Code:*
1. Press `Ctrl+Shift+F` (Global Search)
2. For regex patterns, click the `.*` button to enable regex mode
3. Enter one of these search patterns:

```python
@app.route              // Simple text search
@.*_bp.route           // Regex: finds @auth_bp.route, @admin_bp.route, etc.
def.*\(\):             // Regex: finds function definitions
return APIResponse     // Simple text search
```

### 2. Finding Database Operations

**Database Models:**

*How to search in VS Code:*
1. Press `Ctrl+Shift+F` (Global Search)
2. For regex patterns, click the `.*` button to enable regex mode
3. Enter one of these search patterns:

```python
class.*\(db.Model\)     // Regex: finds class User(db.Model), etc.
db\.session\.          // Regex: finds db.session.add, db.session.commit, etc.
\.query\.              // Regex: finds .query.filter, .query.all, etc.
\.filter               // Simple text search for filter operations
db\.Column             // Regex: finds database column definitions
```

**Database Queries:**

*How to search in VS Code:*
1. Press `Ctrl+Shift+F` (Global Search)
2. These are simple text searches (no regex needed):

```python
User.query              // Finds User.query.filter, User.query.all, etc.
Appointment.query       // Finds appointment-related queries
db.session.add         // Finds database inserts
db.session.commit      // Finds database commits
```

### 3. Finding Frontend Components

**HTML Elements:**

*How to search in VS Code:*
1. Press `Ctrl+Shift+F` (Global Search)
2. For regex patterns, click the `.*` button to enable regex mode
3. Enter one of these search patterns:

```html
id=".*"                // Regex: finds id="appointment-form", id="login-btn", etc.
class=".*"             // Regex: finds class="btn btn-primary", etc.
<form                  // Simple text: finds form elements
<button                // Simple text: finds button elements  
<input                 // Simple text: finds input elements
data-.*=               // Regex: finds data-toggle=, data-target=, etc.
```

**CSS Classes:**

*How to search in VS Code:*
1. Press `Ctrl+Shift+F` (Global Search)
2. For regex patterns, click the `.*` button to enable regex mode
3. Enter one of these search patterns:

```css
\.dashboard            // Regex: finds .dashboard, .dashboard-card, etc.
\.btn                  // Regex: finds .btn, .btn-primary, etc.
\.form                 // Regex: finds .form, .form-control, etc.
\.card                 // Regex: finds .card, .card-header, etc.
@media                 // Simple text: finds media queries
```

**JavaScript Functions:**

*How to search in VS Code:*
1. Press `Ctrl+Shift+F` (Global Search)
2. For regex patterns, click the `.*` button to enable regex mode
3. Enter one of these search patterns:

```javascript
function.*\(           // Regex: finds function declarations
addEventListener       // Simple text: finds event listeners
document\.getElementById  // Regex: finds getElementById calls
document\.querySelector  // Regex: finds querySelector calls
```

### 4. Finding Form Handling

**Form Elements:**
```html
<!-- HTML Forms -->
<form.*id
method="POST"
action=".*"
type="submit"
```

**JavaScript Form Handling:**
```javascript
// Form JavaScript
handleSubmit
preventDefault
FormData
serialize
```

**Backend Form Processing:**
```python
# Python Form Processing
request.form
request.get_json
@.*methods.*POST
```

### 5. Finding Authentication Code

**Frontend Auth:**
```javascript
// Auth patterns
localStorage.*token
sessionStorage
login
logout
isAuthenticated
```

**Backend Auth:**
```python
# Backend auth patterns
@login_required
@jwt_required
current_user
session\[
```

---

## Quick Update Workflows

### 1. Global Find and Replace

**VS Code Steps:**
1. Press `Ctrl+Shift+H` (Find and Replace in Files)
2. Enter search term
3. Enter replacement term
4. Review matches in preview
5. Click "Replace All" or replace individually

**Example Workflows:**

**Change API endpoint:**
```javascript
// Find: /api/appointments
// Replace: /api/v2/appointments
// Files: *.js, *.html
```

**Update CSS class names:**
```css
/* Find: old-class-name */
/* Replace: new-class-name */
/* Files: *.css, *.html, *.js */
```

**Rename function calls:**
```javascript
// Find: oldFunctionName\(
// Replace: newFunctionName(
// Use regex: enabled
```

### 2. Multi-file Editing

**VS Code Multi-cursor:**
1. `Ctrl+D` to select next occurrence
2. `Ctrl+Shift+L` to select all occurrences
3. `Alt+Click` to add cursor at position
4. Type to edit all selected text simultaneously

**Example Use Cases:**
- Rename variables across files
- Add similar code to multiple functions
- Update import statements
- Modify similar HTML elements

### 3. File-specific Updates

**Within Single File:**
```
Ctrl+F          → Find in file
Ctrl+H          → Replace in file
F2              → Rename symbol (variables, functions)
Ctrl+Shift+O    → Go to symbol
Ctrl+G          → Go to line number
```

---

## File Navigation Strategies

### 1. Understanding Sahatak File Structure

```
sahatak/
├── frontend/
│   ├── pages/           # HTML pages
│   │   ├── admin/       # Admin pages
│   │   ├── dashboard/   # Dashboard pages
│   │   └── common/      # Shared pages
│   ├── assets/
│   │   ├── js/          # JavaScript files
│   │   │   ├── components/  # JS components
│   │   │   └── admin.js     # Admin functionality
│   │   ├── css/         # Stylesheets
│   │   └── images/      # Images and icons
├── backend/
│   ├── routes/          # API route definitions
│   ├── models/          # Database models
│   ├── utils/           # Utility functions
│   └── app.py           # Main application file
└── docs/                # Documentation
```

### 2. Quick Navigation Shortcuts

**VS Code File Explorer:**
```
Ctrl+Shift+E    → Focus file explorer
Ctrl+0          → Focus sidebar
Ctrl+1          → Focus editor
Ctrl+`          → Toggle terminal
```

**File Switching:**
```
Ctrl+Tab        → Switch between recent files
Ctrl+P          → Quick open file
Ctrl+Shift+P    → Command palette
```

### 3. Finding Related Files

**When working on a feature, typically you'll need:**

**Frontend Feature:**
1. HTML file (`pages/`)
2. JavaScript file (`assets/js/`)
3. CSS file (`assets/css/`)
4. Backend API (`backend/routes/`)

**Search Strategy:**
```bash
# Find all appointment-related files
grep -rl "appointment" --include="*.js" .
grep -rl "appointment" --include="*.html" .
grep -rl "appointment" --include="*.css" .
grep -rl "appointment" --include="*.py" .
```

---

## Performance Tips

### 1. VS Code Performance

**Optimize Search:**
- Use file type filters (`.js`, `.py`, `.html`)
- Exclude large directories (`node_modules/`, `.git/`)
- Use "Match Case" when appropriate
- Limit search scope to specific folders

**VS Code Settings:**
```json
{
    "search.exclude": {
        "**/node_modules": true,
        "**/bower_components": true,
        "**/*.code-search": true,
        "**/.git": true,
        "**/env": true,
        "**/__pycache__": true
    },
    "files.watcherExclude": {
        "**/.git/objects/**": true,
        "**/node_modules/**": true,
        "**/__pycache__/**": true
    }
}
```

### 2. Command Line Performance

**grep optimization:**
```bash
# Use fixed strings
grep -F "exact_string"

# Limit to specific directories
grep -r "pattern" frontend/ backend/

# Use parallel processing
grep -r "pattern" . | parallel
```

### 3. Search Strategy

**Efficient Search Order:**
1. Start with specific, unique terms
2. Use file type filters early
3. Narrow down scope progressively
4. Use context when needed (-A, -B flags)

**Example Progressive Search:**
```bash
# 1. Find specific function
grep -r "bookAppointment" .

# 2. Find in specific file type
grep -r "bookAppointment" --include="*.js" .

# 3. Get context around matches
grep -r "bookAppointment" --include="*.js" -A 5 -B 5 .

# 4. Find related patterns
grep -rE "appointment.*book" --include="*.js" .
```

---

## Real-World Examples

### Example 1: Adding a New Feature

**Task:** Add "cancel appointment" functionality

**Search Strategy:**
1. Find existing appointment code:
   ```bash
   grep -r "appointment" --include="*.js" --include="*.py" .
   ```

2. Find similar functionality (delete/remove):
   ```bash
   grep -rE "cancel|delete|remove" --include="*.js" .
   ```

3. Find API patterns:
   ```bash
   grep -rE "@app.route.*appointment" --include="*.py" .
   ```

4. Find frontend forms:
   ```bash
   grep -rE "<form.*appointment" --include="*.html" .
   ```

### Example 2: Fixing a Bug

**Task:** Fix login form validation not working

**Search Strategy:**
1. Find login form:
   ```bash
   grep -rE "login.*form" --include="*.html" .
   ```

2. Find validation functions:
   ```bash
   grep -rE "validate.*login" --include="*.js" .
   ```

3. Find form submission handlers:
   ```bash
   grep -rE "addEventListener.*submit" --include="*.js" .
   ```

4. Find backend login handler:
   ```bash
   grep -rE "@.*route.*login" --include="*.py" .
   ```

### Example 3: Updating Styles

**Task:** Change all blue buttons to green

**Search Strategy:**
1. Find button styles:
   ```bash
   grep -rE "\.btn.*blue|background.*blue" --include="*.css" .
   ```

2. Find button classes in HTML:
   ```bash
   grep -rE "btn-primary|btn-blue" --include="*.html" .
   ```

3. Use VS Code replace:
   - Find: `btn-primary`
   - Replace: `btn-success`
   - Files: `*.html, *.js`

### Example 4: Understanding Code Flow

**Task:** Understand how appointments are created

**Search Strategy:**
1. Find appointment creation button:
   ```bash
   grep -rE "book.*appointment|create.*appointment" --include="*.html" .
   ```

2. Find JavaScript handler:
   ```bash
   grep -rE "bookAppointment|createAppointment" --include="*.js" .
   ```

3. Find API endpoint:
   ```bash
   grep -rE "appointment.*POST|POST.*appointment" --include="*.py" .
   ```

4. Find database model:
   ```bash
   grep -r "class Appointment" --include="*.py" .
   ```

---

## Keyboard Shortcuts Cheat Sheet

### VS Code Essential Shortcuts

```
Search & Navigation:
Ctrl+P              Quick Open File
Ctrl+Shift+P        Command Palette
Ctrl+F              Find in File
Ctrl+H              Replace in File
Ctrl+Shift+F        Find in Files
Ctrl+Shift+H        Replace in Files
Ctrl+G              Go to Line
Ctrl+Shift+O        Go to Symbol
F12                 Go to Definition
Alt+F12             Peek Definition

Multi-cursor Editing:
Ctrl+D              Select Next Occurrence
Ctrl+Shift+L        Select All Occurrences
Alt+Click           Add Cursor
Ctrl+Alt+Up/Down    Add Cursor Above/Below

File Management:
Ctrl+N              New File
Ctrl+S              Save File
Ctrl+Shift+S        Save All
Ctrl+W              Close File
Ctrl+Shift+T        Reopen Closed File

Terminal:
Ctrl+`              Toggle Terminal
Ctrl+Shift+`        New Terminal
```

### Command Line Shortcuts

```bash
# History navigation
Ctrl+R              Reverse search history
!!                  Repeat last command
!pattern            Find and run command starting with pattern

# Text manipulation
Ctrl+A              Beginning of line
Ctrl+E              End of line
Ctrl+K              Delete to end of line
Ctrl+U              Delete to beginning of line

# Process control
Ctrl+C              Cancel current command
Ctrl+Z              Suspend current command
Ctrl+D              Exit/logout
```

---

## Best Practices

### 1. Search Strategy

**Start Broad, Then Narrow:**
1. Search for general terms first
2. Add file type filters
3. Use regex for complex patterns
4. Check context around matches

### 2. Naming Conventions

**Use Sahatak's naming patterns to guide searches:**
- Functions: `camelCase` (JavaScript) or `snake_case` (Python)
- Classes: `PascalCase`
- Files: `kebab-case.html` or `snake_case.py`
- CSS: `kebab-case` or `BEM methodology`

### 3. Documentation

**Always check these files for context:**
- `README.md` - Project overview
- `docs/` folder - Feature documentation
- Comments in code
- API documentation

### 4. Version Control

**Use git to understand code changes:**
```bash
# See what files changed recently
git log --oneline --name-only

# Find who changed specific code
git blame filename.js

# Search git history
git log -S "search_term"
```

This guide will help you navigate the Sahatak codebase efficiently and make quick updates with confidence. Practice these techniques regularly to build muscle memory and improve your development speed.