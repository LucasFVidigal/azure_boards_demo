// translate-changelog.js
const fs = require("fs");

// Função para remover links Markdown, mantendo apenas o texto
function removeLinks(text) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

(async () => {
  const translateModule = await import("@vitalets/google-translate-api");
  const translate = translateModule.default;

  const changelogPath = "CHANGELOG.md";
  const translatedPath = "CHANGELOG_PT.md";
  const content = fs.readFileSync(changelogPath, "utf8");

  const lines = content.split("\n");
  const translatedLines = [];

  for (const line of lines) {
    // Ignora cabeçalhos e blocos de código
    if (/^```/.test(line) || /^#+ /.test(line) || line.trim() === "") {
      translatedLines.push(line);
    } 
    // Traduz linhas de lista, preservando o prefixo (ex: "- fix: ")
    else if (/^[-*]\s+\w+:/.test(line)) {
      const match = line.match(/^([-*]\s+\w+:)(.*)$/);
      if (match) {
        const prefix = match[1];
        const text = removeLinks(match[2].trim());
        const res = await translate(text, { to: "pt" });
        translatedLines.push(`${prefix} ${res.text}`);
      } else {
        translatedLines.push(line);
      }
    } 
    // Traduz linhas soltas
    else {
      const res = await translate(removeLinks(line), { to: "pt" });
      translatedLines.push(res.text);
    }
  }

  fs.writeFileSync(translatedPath, translatedLines.join("\n"), "utf8");
  console.log("Ch
