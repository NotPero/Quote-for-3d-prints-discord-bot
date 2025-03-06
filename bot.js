import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = config.token;
const clientId = "PUT_YOUR_BOT_CLIENT_ID";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const fileUrl = pathToFileURL(filePath).href; 
    const command = await import(fileUrl); 
    commands.push(command.data.toJSON());
  }

  return commands;
}

async function updateSlashCommands() {
  const commands = await loadCommands();

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Updating commands...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Commands successfully updated!');
  } catch (error) {
    console.error('Error in updating commands:', error);
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  updateSlashCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const commandName = interaction.commandName;

  try {
    const commandPath = path.join(__dirname, 'commands', `${commandName}.js`);
    const commandUrl = pathToFileURL(commandPath).href;
    const command = await import(commandUrl);
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error during the execution of the command ${commandName}:`, error);
    await interaction.reply('An error occurred during the execution of the command.');
  }
});

client.login(token);