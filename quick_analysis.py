#!/usr/bin/env python3
"""
Quick analysis of first 400 commits for frontend/backend categorization
"""

import subprocess
import json

def run_git_command(command):
    """Run git command and return output"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            return None
    except:
        return None

def get_commits():
    """Get first 400 commit hashes"""
    command = "git rev-list --reverse HEAD | head -400"
    output = run_git_command(command)
    return output.split('\n') if output else []

def analyze_commit(commit_hash):
    """Analyze a single commit"""
    # Get files changed
    command = f"git show --name-only --format= {commit_hash}"
    output = run_git_command(command)
    files = [f.strip() for f in output.split('\n') if f.strip()] if output else []
    
    # Categorize
    frontend_files = [f for f in files if f.startswith('frontend/')]
    backend_files = [f for f in files if f.startswith('backend/')]
    other_files = [f for f in files if not f.startswith('frontend/') and not f.startswith('backend/')]
    
    # Determine category
    has_frontend = len(frontend_files) > 0
    has_backend = len(backend_files) > 0
    
    if has_frontend and not has_backend and len(other_files) == 0:
        return "frontend_only"
    elif has_backend and not has_frontend and len(other_files) == 0:
        return "backend_only"  
    else:
        return "mixed"

def main():
    print("Quick analysis of first 400 commits...")
    
    commits = get_commits()
    print(f"Found {len(commits)} commits")
    
    frontend_only = []
    backend_only = []
    mixed = []
    
    for i, commit in enumerate(commits, 1):
        if i % 50 == 0:
            print(f"Processed {i}/400 commits...")
            
        category = analyze_commit(commit)
        short_hash = commit[:8]
        
        if category == "frontend_only":
            frontend_only.append(commit)
        elif category == "backend_only":
            backend_only.append(commit)
        else:
            mixed.append(commit)
    
    print(f"\nRESULTS:")
    print(f"Frontend-only commits: {len(frontend_only)}")
    print(f"Backend-only commits:  {len(backend_only)}")
    print(f"Mixed commits:         {len(mixed)}")
    print(f"Total:                 {len(commits)}")
    
    # Show some examples
    print(f"\nFrontend-only examples:")
    for commit in frontend_only[:5]:
        print(f"  {commit[:8]}")
    
    print(f"\nBackend-only examples:")
    for commit in backend_only[:5]:
        print(f"  {commit[:8]}")
    
    # Save results
    results = {
        'frontend_only': frontend_only,
        'backend_only': backend_only,
        'mixed': mixed
    }
    
    with open('quick_analysis.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nResults saved to quick_analysis.json")
    print(f"Ready to change authorship for {len(frontend_only) + len(backend_only)} commits")

if __name__ == "__main__":
    main()