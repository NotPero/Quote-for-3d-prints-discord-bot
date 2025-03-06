import { SlashCommandBuilder } from '@discordjs/builders';
import fetch from 'node-fetch';
import fs from 'fs';
import { EmbedBuilder } from 'discord.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

function parseGcode(gcodeContent) {
  const lines = gcodeContent.split('\n');
  let printTime = 0;
  let filamentUsed = 0;
  let hasData = false;

  lines.forEach(line => {
    if (line.includes('estimated printing time')) {
      const timeMatch = line.match(/(?:(\d+)h )?(\d+)m (\d+)s/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1] || 0);
        const minutes = parseInt(timeMatch[2]);
        const seconds = parseInt(timeMatch[3]);
        printTime = hours * 3600 + minutes * 60 + seconds;
        hasData = true;
      }
    }
    if (line.includes('filament used [g]')) {
      const filamentMatch = line.match(/filament used \[g\] = ([\d.]+)/);
      if (filamentMatch) {
        filamentUsed = parseFloat(filamentMatch[1]);
        hasData = true;
      }
    }
  });

  if (!hasData) {
    throw new Error('Dati mancanti nel file G-code.');
  }

  return { printTime, filamentUsed };
}

function calcMaterialCost(filamentUsed, material) {
  const costPerGram = config.materials[material]?.cost_per_gram;
  if (!costPerGram) {
    throw new Error('Materiale non valido.');
  }
  return filamentUsed * costPerGram;
}

function calcEnergyCost(printTime) {
  return (printTime / 3600) * config.machine_power_consumption * config.energy_cost_per_kwh;
}

function calcFilamentLength(filamentUsed) {
  const filamentDensity = 1.25; 
  const filamentDiameter = 1.75; 
  const filamentRadius = filamentDiameter / 2;
  const filamentRadiusCm = filamentRadius / 10; 

  const filamentVolumeCm3 = filamentUsed / filamentDensity;

  const filamentAreaCm2 = Math.PI * Math.pow(filamentRadiusCm, 2);

  const filamentLength = filamentVolumeCm3 / filamentAreaCm2 / 100; 

  return filamentLength;
}

function formatPrintTime(printTime) {
  const hours = Math.floor(printTime / 3600);
  const minutes = Math.floor((printTime % 3600) / 60);
  const seconds = Math.floor(printTime % 60);

  let formattedTime = '';
  if (hours > 0) formattedTime += `${hours}h `;
  if (minutes > 0 || hours > 0) formattedTime += `${minutes}m `; 
  formattedTime += `${seconds}s`;

  return formattedTime.trim();
}

function formatCost(cost) {
  return cost < 0.005 ? '€0.00' : `€${cost.toFixed(2)}`;
}

export const data = new SlashCommandBuilder()
  .setName('quote')
  .setDescription('Calculate the quote for a 3D printing')
  .addAttachmentOption(option =>
    option.setName('filegcode')
      .setDescription('Upload the print G-code file')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('materiale')
      .setDescription('Select the material')
      .setRequired(true)
      .addChoices(...Object.keys(config.materials).map(material => ({
        name: material,
        value: material,
      }))));

export async function execute(interaction) {
  const file = interaction.options.getAttachment('filegcode');
  const materiale = interaction.options.getString('materiale');

  if (file && materiale) {
    const preventivo = await calculatePrice(file.url, materiale);
    await interaction.reply(preventivo);
  } else {
    await interaction.reply('Please upload a valid G-code file and select a material.');
  }
}

async function calculatePrice(gcodeUrl, material) {
  try {
    const response = await fetch(gcodeUrl);
    if (!response.ok) {
      throw new Error(`Error downloading file: ${response.statusText}`);
    }

    const gcodeContent = await response.text();
    const { printTime, filamentUsed } = parseGcode(gcodeContent);

    const materialCost = calcMaterialCost(filamentUsed, material);
    const energyCost = calcEnergyCost(printTime);
    const filamentLength = calcFilamentLength(filamentUsed);

    const totalCost = materialCost + energyCost;

    const formattedTime = formatPrintTime(printTime);

    const embed = new EmbedBuilder()
      .setTitle('3D Printing Quote')
      .setColor(0x00FF00) 
      .addFields(
        { name: 'Print time', value: `\`\`\`${formattedTime}\`\`\``, inline: true },
        { name: 'Filament weight', value: `\`\`\`${filamentUsed.toFixed(2)} g\`\`\``, inline: true },
        { name: 'Filament meters', value: `\`\`\`${filamentLength.toFixed(2)} m\`\`\``, inline: true },
        { name: 'Material cost', value: `\`\`\`${formatCost(materialCost)}\`\`\``, inline: true },
        { name: 'Energy cost', value: `\`\`\`${formatCost(energyCost)}\`\`\``, inline: true },
        { name: 'Total cost', value: `\`\`\`${formatCost(totalCost)}\`\`\``, inline: true },
      )
      .setTimestamp();

    return { embeds: [embed] }; 
  } catch (error) {
    console.error('Error when calculating the estimate:', error);
    return 'An error occurred during the calculation of the estimate.';
  }
}