#!/usr/bin/env node
// Generate (or check) the skills table in README.md between the markers
// <!-- skills:start --> and <!-- skills:end -->.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listSkills, escapeTableCell } from "./lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const README = join(ROOT, "README.md");
const START = "<!-- skills:start -->";
const END = "<!-- skills:end -->";
const check = process.argv.includes("--check");

const skills = listSkills(ROOT);
if (skills.length === 0) {
  console.error("✗ no skills found; nothing to generate");
  process.exit(1);
}

const rows = [
  "| Skill | Description |",
  "| --- | --- |",
  ...skills.map((skill) => {
    const description = escapeTableCell(skill.data?.description ?? "");
    return `| [\`${skill.name}\`](./${skill.name}) | ${description} |`;
  }),
];
const section = `${START}\n${rows.join("\n")}\n${END}`;

const readme = readFileSync(README, "utf8");
const pattern = new RegExp(`${escapeRegExp(START)}[\\s\\S]*?${escapeRegExp(END)}`);

if (!pattern.test(readme)) {
  console.error(`✗ README.md is missing the ${START} / ${END} markers`);
  process.exit(1);
}

const next = readme.replace(pattern, section);

if (check) {
  if (next !== readme) {
    console.error("✗ README.md skills table is out of date; run `node scripts/generate-readme.mjs`");
    process.exit(1);
  }
  console.log(`✓ README.md skills table is up to date (${skills.length} skill(s))`);
  process.exit(0);
}

if (next === readme) {
  console.log(`✓ README.md skills table already up to date (${skills.length} skill(s))`);
} else {
  writeFileSync(README, next);
  console.log(`✓ updated README.md skills table (${skills.length} skill(s))`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
