#!/usr/bin/env python3
"""
Simple commit analysis to get frontend/backend commits for reassignment
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
            return None
    except:
        return None

def main():
    print("Getting all commits and categorizing...")
    
    # Get all commit hashes in chronological order
    command = "git rev-list --reverse HEAD"
    output = run_git_command(command)
    if not output:
        print("Failed to get commits")
        return
    
    all_commits = output.split('\n')
    print(f"Found {len(all_commits)} total commits")
    
    # Take first 200 for analysis
    commits = all_commits[:200]
    print(f"Analyzing first {len(commits)} commits")
    
    frontend_commits = []
    backend_commits = []
    
    for i, commit_hash in enumerate(commits, 1):
        if i % 25 == 0:
            print(f"Progress: {i}/{len(commits)} - Frontend: {len(frontend_commits)}, Backend: {len(backend_commits)}")
        
        # Get files changed in this commit
        files_cmd = f"git show --name-only --format= {commit_hash}"
        files_output = run_git_command(files_cmd)
        
        if not files_output:
            continue
            
        files = [f.strip() for f in files_output.split('\n') if f.strip()]
        
        # Check if it's frontend or backend only
        has_frontend = any(f.startswith('frontend/') for f in files)
        has_backend = any(f.startswith('backend/') for f in files)
        has_other = any(not f.startswith('frontend/') and not f.startswith('backend/') for f in files)
        
        # Pure frontend commits
        if has_frontend and not has_backend and not has_other:
            # Get author info
            author_cmd = f'git log --format="%an <%ae>" -n 1 {commit_hash}'
            author = run_git_command(author_cmd) or 'Unknown'
            msg_cmd = f'git log --format="%s" -n 1 {commit_hash}'
            message = run_git_command(msg_cmd) or 'No message'
            
            frontend_commits.append({
                'hash': commit_hash,
                'author': author,
                'message': message
            })
        
        # Pure backend commits  
        elif has_backend and not has_frontend and not has_other:
            # Get author info
            author_cmd = f'git log --format="%an <%ae>" -n 1 {commit_hash}'
            author = run_git_command(author_cmd) or 'Unknown'
            msg_cmd = f'git log --format="%s" -n 1 {commit_hash}'
            message = run_git_command(msg_cmd) or 'No message'
            
            backend_commits.append({
                'hash': commit_hash,
                'author': author,
                'message': message
            })
    
    print(f"\nFINAL RESULTS:")
    print(f"Frontend-only commits: {len(frontend_commits)}")
    print(f"Backend-only commits: {len(backend_commits)}")
    
    print(f"\nFRONTEND COMMITS TO REASSIGN TO Awab7-ux:")
    for commit in frontend_commits:
        print(f"  {commit['hash'][:8]} - {commit['message'][:50]} - {commit['author']}")
    
    print(f"\nBACKEND COMMITS TO REASSIGN TO network-44:")
    for commit in backend_commits:
        print(f"  {commit['hash'][:8]} - {commit['message'][:50]} - {commit['author']}")
    
    # Save results
    with open('reassignment_data.json', 'w') as f:
        json.dump({
            'frontend_commits': frontend_commits,
            'backend_commits': backend_commits
        }, f, indent=2)
    
    print(f"\nResults saved to reassignment_data.json")
    
    # Generate git filter-repo commands
    print(f"\nNext steps:")
    print(f"1. Install git-filter-repo: pip install git-filter-repo")
    print(f"2. For frontend commits to Awab7-ux:")
    for commit in frontend_commits:
        print(f"   git filter-repo --commit-callback 'if commit.original_id == b\"{commit['hash']}\": commit.author_name = b\"Awab7-ux\"; commit.author_email = b\"awab@example.com\"' --force")
    
    print(f"3. For backend commits to network-44:")
    for commit in backend_commits:
        print(f"   git filter-repo --commit-callback 'if commit.original_id == b\"{commit['hash']}\": commit.author_name = b\"network-44\"; commit.author_email = b\"network@example.com\"' --force")

if __name__ == "__main__":
    main()