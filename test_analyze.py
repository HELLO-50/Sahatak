#!/usr/bin/env python3
"""
Quick test of commit analysis - first 10 commits only
"""

import subprocess
import json

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

def get_first_commits(count=10):
    """Get list of first N commit hashes"""
    command = f"git rev-list --reverse HEAD | head -{count}"
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
    
    has_frontend = len(frontend_files) > 0
    has_backend = len(backend_files) > 0
    has_other = len(other_files) > 0
    
    if has_frontend and not has_backend:
        return "frontend_only" if not has_other else "frontend_mixed"
    elif has_backend and not has_frontend:
        return "backend_only" if not has_other else "backend_mixed"
    elif has_frontend and has_backend:
        return "mixed"
    else:
        return "other_only"

def get_commit_info(commit_hash):
    """Get commit message and author info"""
    msg_command = f'git log --format="%s" -n 1 {commit_hash}'
    message = run_git_command(msg_command) or ''
    
    name_command = f'git log --format="%an" -n 1 {commit_hash}'
    author_name = run_git_command(name_command) or ''
    
    email_command = f'git log --format="%ae" -n 1 {commit_hash}'
    author_email = run_git_command(email_command) or ''
    
    return {
        'message': message,
        'author_name': author_name,
        'author_email': author_email
    }

def main():
    print("Testing commit analysis with first 10 commits...")
    
    commits = get_first_commits(10)
    print(f"Found {len(commits)} commits to analyze")
    
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
        
        files = analyze_commit_files(commit_hash)
        category = categorize_commit(files)
        info = get_commit_info(commit_hash)
        
        commit_data = {
            'hash': commit_hash,
            'short_hash': commit_hash[:8],
            'message': info['message'],
            'author_name': info['author_name'],
            'author_email': info['author_email'],
            'files': files,
            'category': category
        }
        
        categories[category].append(commit_data)
        
        print(f"  Category: {category}")
        print(f"  Files: {files}")
        print(f"  Author: {info['author_name']} <{info['author_email']}>")
        print(f"  Message: {info['message']}")
        print()
    
    print("="*60)
    print("SUMMARY:")
    for category, commits_list in categories.items():
        print(f"{category}: {len(commits_list)} commits")

if __name__ == "__main__":
    main()