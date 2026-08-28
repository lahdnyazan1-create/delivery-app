const fs = require('fs');
const path = require('path');

// الملفات والمجلدات التي يجب استبعادها تماماً
const IGNORED_PATHS = [
  'node_modules',
  '.next',
  '.git',
  'build',
  'dist',
  'public',
  '.vercel',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bundle-code.txt',
  'bundle.js'
];

// الامتدادات المسموح بتجميعها فقط
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css'];

const outputFile = path.join(__dirname, 'bundle-code.txt');

function shouldIgnore(fullPath) {
  const relativePath = path.relative(__dirname, fullPath);
  return IGNORED_PATHS.some(ignored => 
    relativePath === ignored || relativePath.startsWith(ignored + path.sep)
  );
}

function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (shouldIgnore(filePath)) return;

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDirectory(filePath, fileList);
    } else {
      const ext = path.extname(filePath).toLowerCase();
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function generateBundle() {
  const allFiles = scanDirectory(__dirname);
  let outputContent = '';

  allFiles.forEach(file => {
    const relativePath = path.relative(__dirname, file);
    const content = fs.readFileSync(file, 'utf8');

    outputContent += `\n${'='.repeat(80)}\n`;
    outputContent += `// FILE: ${relativePath}\n`;
    outputContent += `${'='.repeat(80)}\n\n`;
    outputContent += content + '\n';
  });

  fs.writeFileSync(outputFile, outputContent, 'utf8');
  console.log(`✅ تم تجميع ${allFiles.length} ملف بنجاح في: bundle-code.txt`);
}

generateBundle();
