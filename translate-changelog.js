// translate-changelog.js
const fs = require("fs");
const translate = require("@vitalets/google-translate-api");

const changelogPath = "CHANGELOG.md";
const translatedPath = "CHANGELOG_PT.md";

const content = fs.readFileSync(changelogPath, "utf8");

(async () => {
  const lines = content.split("\n");
  const translatedLines = [];

  for (const line of lines) {
    if (/^```/.test(line) || /^#+ /.test(line) || /^[-*]/.test(line) || line.trim() === "") {
      translatedLines.push(line);
    } else {
      const res = await translate(line, { to: "pt" });
      translatedLines.push(res.text);
    }
  }

  fs.writeFileSync(translatedPath, translatedLines.join("\n"), "utf8");
  console.log("Changelog traduzido salvo em CHANGELOG_PT.md");
})();
