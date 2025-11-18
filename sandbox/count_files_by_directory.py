#!/usr/bin/env python3
"""
Count the number of files in each subdirectory of the sandbox.
"""

import os
from pathlib import Path
from collections import defaultdict


def count_files_in_subdirectories(root_path='.'):
    """
    Count files in each subdirectory.
    
    Args:
        root_path: The root directory to scan (defaults to current directory)
    
    Returns:
        Dictionary mapping directory paths to file counts
    """
    file_counts = defaultdict(int)
    root = Path(root_path).resolve()
    
    # Walk through all directories
    for dirpath, dirnames, filenames in os.walk(root_path):
        # Get relative path from root
        rel_path = Path(dirpath).resolve().relative_to(root)
        
        # Count files (not directories) in this directory
        file_count = len(filenames)
        
        # Store the count
        if rel_path == Path('.'):
            directory_name = '(root)'
        else:
            directory_name = str(rel_path)
        
        file_counts[directory_name] = file_count
    
    return file_counts


def main():
    print("Files in each sandbox subdirectory:")
    print("=" * 50)
    
    file_counts = count_files_in_subdirectories()
    
    # Sort by directory name for consistent output
    sorted_dirs = sorted(file_counts.items())
    
    total_files = 0
    for directory, count in sorted_dirs:
        print(f"{directory:30} : {count:3} file(s)")
        total_files += count
    
    print("=" * 50)
    print(f"{'Total':30} : {total_files:3} file(s)")


if __name__ == "__main__":
    main()
