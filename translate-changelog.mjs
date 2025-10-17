// translate-changelog.mjs
import fs from "fs";
import translate from "@vitalets/google-translate-api";

const changelogPath = "CHANGELOG.md";
const translatedPath = "CHANGELOG_PT.md";

function removeLinks(text) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

const content = fs.readFileSync(changelogPath, "utf8");
const lines = content.split("\n");

const translatedLines = await Promise.all(lines.map(async (line) => {
  if (/^```/.test(line) || /^#+ /.test(line) || line.trim() === "") {
    return line;
  } else if (/^[-*]\s+\w+:/.test(line)) {
    const match = line.match(/^([-*]\s+\w+:)(.*)$/);
    if (match) {
      const prefix = match[1];
      const text = removeLinks(match[2].trim());
      const res = await translate(text, { to: "pt" });
      return `${prefix} ${res.text}`;
    } else {
      return line;
    }
  } else {
    const res = await translate(removeLinks(line), { to: "pt" });
    return res.text;
  }
}));

fs.writeFileSync(translatedPath, translatedLines.join("\n"), "utf8");
console.log("Changelog traduzido e links removidos salvo em CHANGELOG_PT.md");
