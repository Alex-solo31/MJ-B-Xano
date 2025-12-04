import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on("ready", () => {
    console.log(`MJBot connecté en tant que ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    // ➜ Ici on envoie le message à Xano (AddMemory)
    try {
        const response = await fetch(process.env.XANO_URL_ADD, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: message.author.id,
                content: message.content
            })
        });

        const data = await response.json();
        console.log("Mémoire ajoutée :", data);
    } catch (err) {
        console.error("Erreur AddMemory :", err);
    }

    // ➜ Et tout ce que dit le bot pour l’instant c’est un test
    message.reply("🧠 Mémoire enregistrée.");
});

client.login(process.env.DISCORD_TOKEN);
