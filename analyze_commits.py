#!/usr/bin/env python3
"""
Analyze first 400 commits to categorize by frontend/backend file changes
"""

import subprocess
import json
import re

def run_git_command(command):
    """Run git command and return output"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, encoding='utf-8', errors='ignore')
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            print(f"Error running command: {command}")
            print(f"Error: {result.stderr}")
            return None
    except Exception as e:
        print(f"Exception running command: {command}")
        print(f"Exception: {e}")
        return None

def get_first_400_commits():
    """Get list of first 400 commit hashes in chronological order"""
    command = "git rev-list --reverse HEAD | head -100"
    output = run_git_command(command)
    if output:
        return output.split('\n')
    return []

def analyze_commit_files(commit_hash):
    """Analyze what files were changed in a commit"""
    command = f"git show --name-only --format= {commit_hash}"
    output = run_git_command(command)
    if output:
        files = [f.strip() for f in output.split('\n') if f.strip()]
        return files
    return []

def categorize_commit(files):
    """Categorize commit based on changed files"""
    frontend_files = []
    backend_files = []
    other_files = []
    
    for file in files:
        if file.startswith('frontend/'):
            frontend_files.append(file)
        elif file.startswith('backend/'):
            backend_files.append(file)
        else:
            other_files.append(file)
    
    # Determine category
    has_frontend = len(frontend_files) > 0
    has_backend = len(backend_files) > 0
    has_other = len(other_files) > 0
    
    if has_frontend and not has_backend:
        if has_other:
            return "frontend_mixed"  # Frontend + other files
        else:
            return "frontend_only"   # Pure frontend
    elif has_backend and not has_frontend:
        if has_other:
            return "backend_mixed"   # Backend + other files  
        else:
            return "backend_only"    # Pure backend
    elif has_frontend and has_backend:
        return "mixed"              # Both frontend and backend
    else:
        return "other_only"         # Only other files (docs, config, etc.)

def get_commit_info(commit_hash):
    """Get commit message and author info"""
    # Get commit message
    msg_command = f'git log --format="%s" -n 1 {commit_hash}'
    message = run_git_command(msg_command) or ''
    
    # Get author name  
    name_command = f'git log --format="%an" -n 1 {commit_hash}'
    author_name = run_git_command(name_command) or ''
    
    # Get author email
    email_command = f'git log --format="%ae" -n 1 {commit_hash}'
    author_email = run_git_command(email_command) or ''
    
    return {
        'message': message,
        'author_name': author_name,
        'author_email': author_email
    }

def main():
    print("Analyzing first 100 commits for frontend/backend categorization...")
    
    # Get first 100 commits
    commits = get_first_400_commits()
    print(f"Found {len(commits)} commits to analyze")
    
    if len(commits) != 100:
        print(f"Warning: Expected 100 commits, got {len(commits)}")
    
    # Analyze each commit
    results = []
    categories = {
        'frontend_only': [],
        'backend_only': [],
        'frontend_mixed': [],
        'backend_mixed': [],
        'mixed': [],
        'other_only': []
    }
    
    for i, commit_hash in enumerate(commits, 1):
        print(f"Analyzing commit {i}/{len(commits)}: {commit_hash[:8]}")
        
        # Get files changed
        files = analyze_commit_files(commit_hash)
        
        # Categorize
        category = categorize_commit(files)
        
        # Get commit info
        info = get_commit_info(commit_hash)
        
        commit_data = {
            'hash': commit_hash,
            'short_hash': commit_hash[:8],
            'message': info['message'],
            'author_name': info['author_name'],
            'author_email': info['author_email'],
            'files': files,
            'category': category,
            'file_count': len(files)
        }
        
        results.append(commit_data)
        categories[category].append(commit_data)
        
        # Progress indicator every 50 commits
        if i % 50 == 0:
            print(f"  Progress: {i}/{len(commits)} commits processed")
            print(f"  Frontend-only so far: {len(categories['frontend_only'])}")
            print(f"  Backend-only so far: {len(categories['backend_only'])}")
            print()
    
    # Print summary
    print("\n" + "="*60)
    print("CATEGORIZATION SUMMARY")
    print("="*60)
    
    for category, commits_list in categories.items():
        count = len(commits_list)
        print(f"{category.upper():<20}: {count:>3} commits")
    
    print(f"{'TOTAL':<20}: {len(results):>3} commits")
    
    # Show frontend-only commits
    print("\n" + "="*60)
    print("FRONTEND-ONLY COMMITS (-> Awab7-ux)")
    print("="*60)
    for commit in categories['frontend_only']:
        print(f"{commit['short_hash']} - {commit['message'][:60]}")
        print(f"  Files: {', '.join(commit['files'])}")
        print()
    
    # Show backend-only commits  
    print("\n" + "="*60)
    print("BACKEND-ONLY COMMITS (-> network-44)")
    print("="*60)
    for commit in categories['backend_only']:
        print(f"{commit['short_hash']} - {commit['message'][:60]}")
        print(f"  Files: {', '.join(commit['files'])}")
        print()
    
    # Save results to JSON file
    with open('commit_analysis.json', 'w') as f:
        json.dump({
            'summary': {category: len(commits_list) for category, commits_list in categories.items()},
            'commits': results,
            'categories': categories
        }, f, indent=2)
    
    print(f"Detailed analysis saved to 'commit_analysis.json'")
    
    # Generate author mapping
    frontend_commits = categories['frontend_only']
    backend_commits = categories['backend_only']
    
    print(f"\nCOMMITS TO REASSIGN:")
    print(f"   Frontend-only -> Awab7-ux: {len(frontend_commits)} commits")
    print(f"   Backend-only -> network-44: {len(backend_commits)} commits")
    print(f"   Total changes: {len(frontend_commits) + len(backend_commits)} commits")

if __name__ == "__main__":
    main()