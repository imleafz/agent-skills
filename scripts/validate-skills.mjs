#!/usr/bin/env node
// Validate the structure of every skill in this repository.
// Exits non-zero on errors; warnings do not fail the build.
import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listSkills, findSkillFiles, localLinks } from "./lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESC_MAX = 1024; // Anthropic Agent Skill description limit
const DESC_WARN = 600;
const DESC_MIN = 24;

const errors = [];
const warnings = [];
const rel = (p) => p.slice(ROOT.length + 1);

// Each skill must live exactly one level below the repository root.
for (const file of findSkillFiles(ROOT)) {
  if (file.split("/").length !== 2) {
    errors.push(`${file}: SKILL.md must be at <skill-name>/SKILL.md, not nested deeper`);
  }
}

const skills = listSkills(ROOT);
if (skills.length === 0) {
  errors.push("no skills found (expected at least one <skill-name>/SKILL.md)");
}

for (const skill of skills) {
  const where = rel(skill.skillFile);

  if (skill.error) {
    errors.push(`${where}: ${skill.error}`);
    continue;
  }

  const name = skill.data.name;
  const description = skill.data.description;
  const allowedTools = skill.data["allowed-tools"];

  if (!name) {
    errors.push(`${where}: frontmatter is missing "name"`);
  } else if (name !== skill.name) {
    errors.push(`${where}: frontmatter name "${name}" does not match directory "${skill.name}"`);
  }

  if (!description) {
    errors.push(`${where}: frontmatter is missing "description"`);
  } else if (description.length > DESC_MAX) {
    errors.push(`${where}: description is ${description.length} chars (max ${DESC_MAX})`);
  } else {
    if (description.length < DESC_MIN) {
      warnings.push(`${where}: description is very short (${description.length} chars)`);
    }
    if (description.length > DESC_WARN) {
      warnings.push(
        `${where}: description is long (${description.length} chars); consider trimming`,
      );
    }
  }

  if (allowedTools && !/^[A-Za-z]/.test(allowedTools)) {
    warnings.push(`${where}: "allowed-tools" looks malformed: ${allowedTools}`);
  }

  // Links from SKILL.md to local files must resolve.
  for (const link of localLinks(skill.body)) {
    if (!existsSync(join(skill.dir, link))) {
      errors.push(`${where}: link target does not exist: ${link}`);
    }
  }

  // Every file under references/ should be reachable from SKILL.md.
  const refDir = join(skill.dir, "references");
  if (existsSync(refDir)) {
    for (const entry of readdirSync(refDir, { withFileTypes: true })) {
      if (entry.isFile() && !skill.body.includes(`references/${entry.name}`)) {
        warnings.push(`${where}: references/${entry.name} is not linked from SKILL.md`);
      }
    }
  }
}

const log = (label, mark, items) => {
  if (items.length === 0) return;
  console.log(`\n${label} (${items.length}):`);
  for (const item of items) console.log(`  ${mark} ${item}`);
};

console.log(`Checked ${skills.length} skill(s): ${skills.map((s) => s.name).join(", ") || "(none)"}`);
log("Errors", "✗", errors);
log("Warnings", "⚠", warnings);

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} error(s)`);
  process.exit(1);
}
console.log(`\n✓ all checks passed${warnings.length ? ` (${warnings.length} warning(s))` : ""}`);
