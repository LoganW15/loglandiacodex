import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const [targetRelPath, sourcePath] = process.argv.slice(2);

if (!targetRelPath || !sourcePath) {
  console.error('Usage: node scripts/replace-file.js <target-relative-path> <source-file-path>');
  process.exit(1);
}

const root = process.cwd();
const targetPath = path.resolve(root, targetRelPath);
const sourceFullPath = path.resolve(sourcePath);

if (!fs.existsSync(sourceFullPath)) {
  console.error(`Source file not found: ${sourceFullPath}`);
  process.exit(1);
}

const sourceContent = fs.readFileSync(sourceFullPath, 'utf8');
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, sourceContent, 'utf8');

console.log(`Replaced ${targetRelPath} with ${sourceFullPath}`);
