import * as fs from 'fs/promises';
import { existsSync } from 'fs';

// --- CONFIGURAÇÃO DEEPSEEK ---
const MODEL_NAME = 'deepseek-chat';
const API_KEY = process.env.GEMINI_API_KEY; // Usa a chave da variável de ambiente existente
const API_URL = 'https://api.deepseek.com/v1/chat/completions'; // Endpoint DeepSeek
const CHANGELOG_PATH = 'CHANGELOG.md';
// ----------------------------

/**
* Tenta fazer a chamada da API com retentativas e backoff exponencial.
*/
async function fetchWithRetry(url, options, retries = 5, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response;
            }
            // Para erros de rate limit (429) ou erro interno (5xx), tenta novamente
            if ((response.status === 429 || response.status >= 500) && i < retries - 1) {
                console.log(`API Status ${response.status}. Retrying in ${delay}ms...`);
            } else {
                // Para outros erros (4xx) ou se for a última retentativa, lança a exceção
                const errorText = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorText}`);
            }
        } catch (error) {
            if (i === retries - 1) throw error;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Backoff exponencial
    }
    // unreachable
    throw new Error("Maximum retries reached for API call.");
}


/**
* Limpa links de Markdown que o modelo pode ter deixado, especialmente os de commit/PR.
*/
function cleanTranslatedText(text) {
    // 1. Remove links de commit e PR que parecem com ' ([#123](...)) ([abc1234](...))'
    // Este é o formato mais comum que o release-please gera.
    let cleanedText = text.replace(/\s*\(\[[\w#]+\]\(.*?\)\)/g, '');
    
    // 2. Remove qualquer outro link de markdown [text](url) -> mantendo apenas 'text'
    cleanedText = cleanedText.replace(/\[([^\]]+)\]\((.*?)\)/g, '$1');

    return cleanedText.trim();
}

async function translateChangelog() {
    if (!existsSync(CHANGELOG_PATH)) {
        console.log(`${CHANGELOG_PATH} not found. Skipping translation.`);
        return;
    }

    let content;
    try {
        content = await fs.readFile(CHANGELOG_PATH, 'utf-8');
    } catch (error) {
        console.error("Error reading CHANGELOG.md:", error);
        return;
    }

    if (!content || !API_KEY) {
        console.log("No content or API Key missing. Skipping translation.");
        return;
    }

    // System Prompt: Tradução técnica, mantendo Markdown, removendo todos os links.
    const systemPrompt = "Você é um tradutor técnico e deve traduzir o texto do CHANGELOG.md para o Português do Brasil. Mantenha toda a estrutura Markdown (cabeçalhos, listas, etc.) exatamente como está. Você DEVE remover todos os links (tanto de commit, pull request, quanto quaisquer outros), mantendo apenas o texto âncora. Não adicione nenhuma saudação, introdução ou conclusão. Responda apenas com o conteúdo traduzido.";

    // Payload para o DeepSeek (formato Chat Completions)
    const payload = {
        model: MODEL_NAME,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: content }
        ],
        // Usamos temperatura 0 para traduções mais determinísticas
        temperature: 0.0
    };

    console.log("Starting translation via DeepSeek API...");

    try {
        const response = await fetchWithRetry(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}` // Chave de API no header
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        // A resposta do DeepSeek é parseada como 'choices[0].message.content'
        const translatedPart = result.choices?.[0]?.message?.content;

        if (!translatedPart) {
            console.error("DeepSeek API did not return translated text:", JSON.stringify(result, null, 2));
            return;
        }

        let finalContent = cleanTranslatedText(translatedPart);

        await fs.writeFile(CHANGELOG_PATH, finalContent, 'utf-8');
        console.log(`Successfully translated and updated ${CHANGELOG_PATH}.`);
        // Indica que houve uma tradução (e, portanto, uma alteração)
        console.log("translation_done=true" >> $GITHUB_OUTPUT);

    } catch (error) {
        console.error("Failed to translate changelog:", error);
    }
}

translateChangelog();
