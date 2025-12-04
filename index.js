import express from "express";
import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import OpenAI from "openai";

// -----------------------------
// CONFIGURATION
// -----------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const XANO_ADD_URL = process.env.XANO_ADD_MEMORY_URL;
const XANO_GET_URL = process.env.XANO_GET_MEMORY_URL;

const app = express();
app.use(express.json());

// Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// OpenAI client
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// -----------------------------
// DISCORD READY
// -----------------------------
client.once("ready", () => {
  console.log("🤖 MJBot connecté à Discord !");
});

// -----------------------------
// MEMORISATION → Envoi à XANO
// -----------------------------
async function saveMemory(userId, content) {
  try {
    const res = await fetch(XANO_ADD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, content })
    });

    const data = await res.json();
    console.log("Mémoire enregistrée =>", data);
  } catch (err) {
    console.error("Erreur Xano (AddMemory) :", err);
  }
}

// -----------------------------
// LECTURE DE MÉMOIRE (XANO GET)
// -----------------------------
async function getRecentMemory(userId) {
  try {
    const res = await fetch(`${XANO_GET_URL}?userId=${userId}`);
    const data = await res.json();

    return data?.memories || [];
  } catch (err) {
    console.error("Erreur Xano (GetMemory) :", err);
    return [];
  }
}

// -----------------------------
// TRAITEMENT DES MESSAGES DISCORD
// -----------------------------
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const userId = msg.author.id;
  const userMessage = msg.content;

  // 1) On enregistre la mémoire dans Xano
  saveMemory(userId, userMessage);

  // 2) On récupère les souvenirs récents
  const memories = await getRecentMemory(userId);

  // 3) Préparation du prompt envoyé à GPT
  const messages = [
    {
      role: "system",
      content: `
Tu es MJ. Tu dois répondre avec rythme, sans listes,
sans ton scolaire, et sans jamais décider les actions
du personnage du joueur.
Les souvenirs utiles :
${memories.map(m => "- " + m.content).join("\n")}
      `
    },
    { role: "user", content: userMessage }
  ];

  // 4) Requête OpenAI
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages
    });

    const reply = completion.choices[0].message.content;
    msg.reply(reply);

  } catch (err) {
    console.error("Erreur OpenAI :", err);
    msg.reply("Erreur IA 😢");
  }
});

// -----------------------------
// SERVEUR EXPRESS (RENDER OK)
// -----------------------------
app.get("/", (_, res) =>
  res.send("MJBot fonctionne !")
);
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log("Serveur en cours d'exécution sur Render (port " + PORT + ")")
);

// -----------------------------
client.login(DISCORD_TOKEN);
