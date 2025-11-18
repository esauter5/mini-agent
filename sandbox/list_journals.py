import os

def list_journal_files():
    """List all files in the journal directory"""
    journal_dir = "journal"
    
    # Check if the directory exists
    if not os.path.exists(journal_dir):
        print(f"Directory '{journal_dir}' not found!")
        return
    
    # Get all files in the journal directory
    files = os.listdir(journal_dir)
    
    # Filter out directories, keep only files
    files = [f for f in files if os.path.isfile(os.path.join(journal_dir, f))]
    
    # Display the results
    if files:
        print(f"Files in '{journal_dir}' directory:")
        print("-" * 40)
        for i, filename in enumerate(files, 1):
            print(f"{i}. {filename}")
        print("-" * 40)
        print(f"Total: {len(files)} file(s)")
    else:
        print(f"No files found in '{journal_dir}' directory.")

if __name__ == "__main__":
    list_journal_files()
