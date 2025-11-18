import os

def list_recipe_files():
    """List all files in the recipe directory"""
    recipe_dir = "recipes"
    
    # Check if the directory exists
    if not os.path.exists(recipe_dir):
        print(f"Directory '{recipe_dir}' not found!")
        return
    
    # Get all files in the recipe directory
    files = os.listdir(recipe_dir)
    
    # Filter out directories, keep only files
    files = [f for f in files if os.path.isfile(os.path.join(recipe_dir, f))]
    
    # Display the results
    if files:
        print(f"Files in '{recipe_dir}' directory:")
        print("-" * 40)
        for i, filename in enumerate(files, 1):
            print(f"{i}. {filename}")
        print("-" * 40)
        print(f"Total: {len(files)} file(s)")
    else:
        print(f"No files found in '{recipe_dir}' directory.")

if __name__ == "__main__":
    list_recipe_files()
