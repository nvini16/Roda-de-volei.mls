import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const outputPath = path.join(rootDir, "supabase-config.js");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, "utf8");
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

const envFromFile = parseEnvFile(envPath);

const supabaseUrl = (process.env.SUPABASE_URL || envFromFile.SUPABASE_URL || "").trim();
const supabasePublishableKey = (
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  envFromFile.SUPABASE_PUBLISHABLE_KEY ||
  ""
).trim();
const rodaTimeZone = (
  process.env.RODA_TIME_ZONE ||
  envFromFile.RODA_TIME_ZONE ||
  "America/Sao_Paulo"
).trim();

if (!supabaseUrl || !supabasePublishableKey) {
  console.error(
    "Erro: defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no .env ou nas variáveis de ambiente."
  );
  process.exit(1);
}

const fileContent = `// Gerado automaticamente a partir do .env — não edite manualmente.
// Nunca coloque chaves secretas (sb_secret / service_role ou chaves de IA) aqui.

export const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
export const SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(supabasePublishableKey)};
export const RODA_TIME_ZONE = ${JSON.stringify(rodaTimeZone)};
`;

fs.writeFileSync(outputPath, fileContent, "utf8");
console.log("Arquivo supabase-config.js gerado com sucesso.");