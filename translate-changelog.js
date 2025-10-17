// translate-changelog.js
const fs = require("fs");
const translateModule = require("@vitalets/google-translate-api");
const translate = translateModule.default || translateModule;

const changelogPath = "CHANGELOG.md";
const translatedPath = "CHANGELOG_PT.md";

// Remove links Markdown
function removeLinks(text) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

(async () => {
  const content = fs.readFileSync(changelogPath, "utf8");
  const lines = content.split("\n");
  const translatedLines = [];

  for (const line of lines) {
    if (/^```/.test(line) || /^#+ /.test(line) || line.trim() === "") {
      translatedLines.push(line);
    } else if (/^[-*]\s+\w+:/.test(line)) {
      const match = line.match(/^([-*]\s+\w+:)(.*)$/);
      if (match) {
        const prefix = match[1];
        const text = removeLinks(match[2].trim());
        const res = await translate(text, { to: "pt" });
        translatedLines.push(`${prefix} ${res.text}`);
      } else {
        translatedLines.push(line);
      }
    } else {
      const res = await translate(removeLinks(line), { to: "pt" });
      translatedLines.push(res.text);
    }
  }

  fs.writeFileSync(translatedPath, translatedLines.join("\n"), "utf8");
  console.log("Changelog traduzido e links removidos salvo em CHANGELOG_PT.md");
})();


// Isso aqui nao funciona