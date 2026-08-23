import os

# المجلدات والملفات التي نريد استثناؤها تماماً
EXCLUDE_DIRS = {'node_modules', '.next', '.git', 'public', '.vscode'}
EXCLUDE_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.ico', '.svg', '.webp', 
    '.lock', '.tsbuildinfo', '.map'
}

OUTPUT_FILE = 'project_context_report.txt'

def bundle_project():
    print("جاري جمع ملفات المشروع...")
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk('.'):
            # تعديل المجلدات المستثناة لكي لا يدخل إليها البايثون
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in EXCLUDE_EXTENSIONS:
                    continue
                
                file_path = os.path.join(root, file)
                
                # استثناء ملف التقرير نفسه لكي لا يتم قراءته وتكراره
                if os.path.abspath(file_path) == os.path.abspath(OUTPUT_FILE):
                    continue
                
                # كتابة مسار الملف في البداية كمفتاح توضيحي
                outfile.write(f"\n\n{'='*50}\n")
                outfile.write(f"FILE: {file_path}\n")
                outfile.write(f"{'='*50}\n\n")
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as infile:
                        outfile.write(infile.read())
                except Exception as e:
                    outfile.write(f"[خطأ في قراءة الملف: {e}]\n")
                    
    print(f"تم بنجاح! تم حفظ كافة الأكواد في الملف: {OUTPUT_FILE}")

if __name__ == '__main__':
    bundle_project()
