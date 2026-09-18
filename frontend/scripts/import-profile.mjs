import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Parse literal data only. The supplied document is never executed.
const file = ts.createSourceFile('profile.ts', readFileSync(process.argv[2], 'utf8'), ts.ScriptTarget.Latest, true);
function literal(node) {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return ts.isNumericLiteral(node) ? Number(node.text) : node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(prop => {
    if (!ts.isPropertyAssignment(prop) || !prop.name || !(ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name))) throw new Error('Only literal properties are supported');
    return [prop.name.text, literal(prop.initializer)];
  }));
  throw new Error('Unsupported non-literal profile value');
}
const declaration = file.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]).find(d => d.name.getText(file) === 'cvDataOverall');
if (!declaration?.initializer) throw new Error('Profile declaration not found');
const input = literal(declaration.initializer);
const profile = {
  name: input.personalInfo.name,
  location: 'Munich, Germany',
  email: input.personalInfo.email,
  linkedIn: 'https://' + input.personalInfo.linkedIn.replace(/^https?:\/\//, ''),
  languages: input.personalInfo.languages,
  summary: input.positioning.coreProfile,
  experience: input.experience.map(({ date, company, location, role, summary, responsibilitiesAndImpact, technologies }) => ({ date, company, location, role, summary, highlights: [...new Set(responsibilitiesAndImpact)], technologies })),
  education: input.education.map(({ date, title, school, location, grade, relevantCourses }) => ({ date, title, school, location, grade, courses: relevantCourses })),
  projects: input.projects.map(({ date, title, org, summary, details, technologies }) => ({ date, title, org, summary, details: [...new Set(details)], technologies })),
  skills: input.skills,
};
const body = JSON.stringify(profile, null, 2);
const patch = '*** Begin Patch\n*** Add File: ../content/profile.json\n' + body.split('\n').map(line => '+' + line).join('\n') + '\n*** End Patch';
const result = spawnSync(process.argv[3], ['--codex-run-as-apply-patch', patch], { encoding: 'utf8' });
process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
process.exitCode = result.status ?? 1;
import './asset-workspace.mjs';
