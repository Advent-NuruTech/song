const fs = require("fs");
const path = require("path");

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, output);
      continue;
    }
    if (entry.isFile() && fullPath.toLowerCase().endsWith(".json")) {
      output.push(fullPath);
    }
  }
  return output;
}

const root = path.join(process.cwd(), "content");
if (!fs.existsSync(root)) {
  console.error("Missing content directory:", root);
  process.exit(1);
}

const files = walk(root);
const errors = [];

for (const file of files) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    JSON.parse(raw);
  } catch (error) {
    errors.push({ file, message: String(error.message || error) });
  }
}

if (errors.length) {
  console.error(`Invalid content JSON files found: ${errors.length}`);
  for (const error of errors) {
    console.error(`- ${error.file}: ${error.message}`);
  }
  process.exit(1);
}

console.log(`Content JSON validated: ${files.length} files OK`);
