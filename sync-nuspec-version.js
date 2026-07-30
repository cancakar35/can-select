import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

const nuspecPath = path.join(__dirname, '.nuspec');

let content = fs.readFileSync(nuspecPath, 'utf8');

content = content.replace(/<version>.*?<\/version>/, `<version>${pkg.version}</version>`);

fs.writeFileSync(nuspecPath, content, 'utf8');
console.log(`Synced .nuspec version to ${pkg.version}`);
