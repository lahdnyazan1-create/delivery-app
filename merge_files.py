import os

# المجلدات والملفات التي يتم استثناؤها لتجنب حشو الملف الناتج ببيانات غير مهمة
EXCLUDE_DIRS = {'node_modules', '.next', '.git', '.vscode', 'dist', 'build'}
EXCLUDE_FILES = {'package-lock.json', 'tsconfig.tsbuildinfo', 'merge_files.py'}
EXCLUDE_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', 
    '.webp', '.pdf', '.zip', '.tar', '.gz', '.lock'
}

OUTPUT_FILE = 'project_context_report.txt'

def should_skip_dir(dirname):
    return dirname in EXCLUDE_DIRS

def should_skip_file(filename):
    if filename in EXCLUDE_FILES:
        return True
    _, ext = os.path.splitext(filename)
    if ext.lower() in EXCLUDE_EXTENSIONS:
        return True
    return False

def generate_project_report():
    root_dir = '.'
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # 1. كتابة هيكل المشروع (Directory Tree)
        outfile.write("=" * 80 + "\n")
        outfile.write("PROJECT STRUCTURE\n")
        outfile.write("=" * 80 + "\n\n")
        
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # تعديل قائمة المجلدات لتجنب الدخول في المجلدات المستثناة
            dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]
            
            relative_path = os.path.relpath(dirpath, root_dir)
            if relative_path == '.':
                level = 0
                outfile.write(".\n")
            else:
                level = relative_path.count(os.sep) + 1
                indent = '│   ' * (level - 1) + '├── '
                outfile.write(f"{indent}{os.path.basename(dirpath)}/\n")
                
            sub_indent = '│   ' * level + '├── '
            for filename in filenames:
                if not should_skip_file(filename):
                    outfile.write(f"{sub_indent}{filename}\n")
                    
        outfile.write("\n\n" + "=" * 80 + "\n")
        outfile.write("PROJECT FILES CONTENT\n")
        outfile.write("=" * 80 + "\n\n")
        
        # 2. كتابة محتويات الملفات
        for dirpath, dirnames, filenames in os.walk(root_dir):
            dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]
            
            for filename in filenames:
                if should_skip_file(filename):
                    continue
                    
                file_path = os.path.join(dirpath, filename)
                relative_path = os.path.relpath(file_path, root_dir)
                
                outfile.write("\n" + "#" * 80 + "\n")
                outfile.write(f"FILE: {relative_path}\n")
                outfile.write("#" * 80 + "\n\n")
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        outfile.write(infile.read())
                except Exception as e:
                    outfile.write(f"[Error reading file: {e}]\n")
                    
                outfile.write("\n\n")

    print(f"تم إنشاء التقرير بنجاح في الملف: {OUTPUT_FILE}")

if __name__ == '__main__':
    generate_project_report()
