import os

# الملف الناتج الذي سيحتوي على الكود الكامل
OUTPUT_FILE = "all_project_code.txt"

# الامتدادات التي تريد تجميعها
VALID_EXTENSIONS = {'.html', '.js', '.css', '.json', '.txt', '.md', '.ts', '.jsx', '.tsx'}

# المجلدات التي تريد استثناءها (تجاهلها)
EXCLUDE_DIRS = {'node_modules', '.git', 'dist', 'build', '.next', 'coverage'}

with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
    for root, dirs, files in os.walk('.'):
        # استبعاد المجلدات غير المرغوبة
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            # تجنب تضمين ملف المخرجات نفسه
            if file == OUTPUT_FILE or file == 'merge_files.py':
                continue
                
            ext = os.path.splitext(file)[1].lower()
            if ext in VALID_EXTENSIONS:
                file_path = os.path.join(root, file)
                
                # كتابة اسم الملف وشكل المخرج المطلوب
                outfile.write(f"{file_path}\n")
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as infile:
                        outfile.write(infile.read())
                except Exception as e:
                    outfile.write(f"// تعذر قراءة الملف: {e}")
                
                # فاصل بين الملفات
                outfile.write("\n\n" + "="*50 + "\n\n")

print(f"تم بنجاح! تم تجميع الملفات في: {OUTPUT_FILE}")
