import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('assets/website-photo-prep-20261118');
const inventory = JSON.parse(await fs.readFile(path.join(root, 'inventory.json'), 'utf8'));
const receipts = await Promise.all((await fs.readdir(path.join(root, 'receipts'))).filter(name => name.endsWith('.json')).map(async name => JSON.parse(await fs.readFile(path.join(root, 'receipts', name), 'utf8'))));
const byId = new Map(receipts.map(row => [row.id, row]));
const threshold = 1600;
const projects = inventory.projects.map(project => {
  const expected = inventory.files.filter(file => file.projectId === project.id);
  const rows = expected.map(file => byId.get(file.id)).filter(Boolean);
  const small = rows.filter(row => Math.max(row.sourceWidth, row.sourceHeight) < threshold);
  const complete = rows.length === expected.length;
  const label = complete && small.length ? (small.length === rows.length ? ' [저해상도 원본]' : ' [일부 저해상도]') : '';
  return { projectId: project.id, label: project.label, folderName: project.folderName + label, complete, count: rows.length, expected: expected.length, sourceBytes: rows.reduce((sum, row) => sum + row.sourceBytes, 0), webBytes: rows.reduce((sum, row) => sum + row.outputBytes, 0), lowResolutionCount: small.length, lowResolutionFiles: small.map(row => row.outputName), smallestLongEdge: rows.length ? Math.min(...rows.map(row => Math.max(row.sourceWidth, row.sourceHeight))) : null };
});
const report = { sourceRoot: inventory.sourceRoot, lowResolutionThreshold: threshold, expected: inventory.files.length, complete: receipts.length === inventory.files.length, converted: receipts.length, sourceBytes: projects.reduce((sum, project) => sum + project.sourceBytes, 0), webBytes: projects.reduce((sum, project) => sum + project.webBytes, 0), projects, missing: inventory.files.filter(file => !byId.has(file.id)).map(file => ({ id: file.id, name: file.outputName })) };
await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2));
const escape = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
const table = [['Project', 'Web filename', 'Original filename', 'Original width', 'Original height', 'Web width', 'Web height', 'Original bytes', 'Web bytes', 'Small original', 'Original Drive URL']];
for (const file of inventory.files) {
  const row = byId.get(file.id); if (!row) continue;
  table.push([file.projectLabel, file.outputName, file.title, row.sourceWidth, row.sourceHeight, row.width, row.height, row.sourceBytes, row.outputBytes, Math.max(row.sourceWidth, row.sourceHeight) < threshold ? 'Yes' : 'No', file.url]);
}
await fs.writeFile(path.join(root, 'photo-map.csv'), '\ufeff' + table.map(row => row.map(escape).join(',')).join('\r\n'));
console.log(JSON.stringify({ converted: report.converted, expected: report.expected, sourceBytes: report.sourceBytes, webBytes: report.webBytes, completedProjects: projects.filter(project => project.complete).map(project => ({ name: project.folderName, count: project.count, small: project.lowResolutionCount })) }));
