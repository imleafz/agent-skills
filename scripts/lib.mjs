// Shared helpers for the agent-skills tooling.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Directories that never contain skills.
export const IGNORED_DIRS = new Set([".git", ".github", "node_modules", "scripts"]);

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Parse a SKILL.md file's YAML frontmatter.
 * Tolerant of the flat `key: value` frontmatter skills use; also folds indented
 * continuation lines into the previous key.
 */
export function parseFrontmatter(content) {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { data: null, body: content, error: "missing YAML frontmatter (--- ... ---)" };
  }
  const data = {};
  let currentKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    const kv = line.match(/^([A-Za-z0-9_.-]+):\s?(.*)$/);
    if (kv) {
      currentKey = kv[1];
      data[currentKey] = stripQuotes(kv[2].trim());
    } else if (currentKey && /^\s+/.test(line)) {
      const extra = line.trim();
      data[currentKey] = data[currentKey] ? `${data[currentKey]} ${extra}` : extra;
    }
  }
  return { data, body: content.slice(match[0].length), error: null };
}

/** Return one entry per top-level directory containing a SKILL.md. */
export function listSkills(root) {
  const skills = [];
  for (const name of readdirSync(root)) {
    if (name.startsWith(".") || IGNORED_DIRS.has(name)) continue;
    const dir = join(root, name);
    if (!statSync(dir).isDirectory()) continue;
    const skillFile = join(dir, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    const content = readFileSync(skillFile, "utf8");
    skills.push({ name, dir, skillFile, content, ...parseFrontmatter(content) });
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/** Every SKILL.md in the tree, as paths relative to root. */
export function findSkillFiles(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || IGNORED_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === "SKILL.md") {
        found.push(relative(root, full).split(sep).join("/"));
      }
    }
  };
  walk(root);
  return found;
}

/** Relative markdown links in `body` that point at a local file. */
export function localLinks(body) {
  const links = new Set();
  const re = /\]\(([^)\s]+)\)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const href = m[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#") || href.startsWith("/")) continue;
    links.add(href.split("#")[0]);
  }
  return links;
}

export function escapeTableCell(value) {
  return value.replace(/\r?\n/g, " ").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}
