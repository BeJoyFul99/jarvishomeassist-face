const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('c:\\Users\\funk9\\Documents\\jarvisHomeAssist\\frosted-command-hub\\src\\pages');
const destDir = path.resolve('app', '(dashboard)');

const files = ['AnalyticsPage.tsx', 'DashboardPage.tsx', 'InferencePage.tsx', 'NetworkPage.tsx', 'SettingsPage.tsx', 'TerminalPage.tsx'];

files.forEach(file => {
  const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
  const dirName = file.replace('Page.tsx', '').toLowerCase();
  const targetDir = path.join(destDir, dirName);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'page.tsx'), '"use client";\n\n' + content);
});

const nfContent = fs.readFileSync(path.join(srcDir, 'NotFound.tsx'), 'utf8');
const nfTarget = path.resolve('app', '[...not-found]');
fs.mkdirSync(nfTarget, { recursive: true });
fs.writeFileSync(path.join(nfTarget, 'page.tsx'), '"use client";\n\n' + nfContent);
