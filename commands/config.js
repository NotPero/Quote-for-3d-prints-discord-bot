import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } from '@discordjs/builders';
import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonStyle } from 'discord.js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

function saveConfig(newConfig) {
  fs.writeFileSync('./config.json', JSON.stringify(newConfig, null, 2), 'utf-8');
}

export const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Show and edit bot configurations.');

export async function execute(interaction) {
  try {
    const { token, client_id, ...safeConfig } = config;

    const materialsString = Object.entries(safeConfig.materials)
      .map(([material, details]) => `- **${material}**: €${details.cost_per_gram.toFixed(2)}/g`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('Bot configurations')
      .setColor(0x00FF00)
      .addFields(
        { name: 'Energy cost per kWh', value: `\`\`\`${safeConfig.energy_cost_per_kwh} €/kWh\`\`\``, inline: true },
        { name: 'Machine consumption', value: `\`\`\`${safeConfig.machine_power_consumption} kW\`\`\``, inline: true },
        { name: 'Materials available', value: materialsString, inline: false },
      )
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('modifica')
          .setLabel('Edit')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('aggiungi')
          .setLabel('Add')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('rimuovi')
          .setLabel('Remove')
          .setStyle(ButtonStyle.Danger),
      );

    await interaction.reply({ embeds: [embed], components: [row] });

    const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (i) => {
      try {
        if (i.customId === 'modifica') {
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('modifica_menu')
            .setPlaceholder('Select what to edit')
            .addOptions(
              { label: 'Energy cost kWh', value: 'energy_cost_per_kwh' },
              { label: 'Machine consumption', value: 'machine_power_consumption' },
              ...Object.keys(config.materials).map(material => ({
                label: material,
                value: `material_${material}`,
              })),
            );

          const rowMenu = new ActionRowBuilder().addComponents(selectMenu);
          await i.reply({ content: 'Select what you want to edit:', components: [rowMenu], ephemeral: true });

          const menuCollector = i.channel.createMessageComponentCollector({ time: 60000 });

          menuCollector.on('collect', async (menuInteraction) => {
            try {
              const selectedValue = menuInteraction.values[0];

              if (selectedValue.startsWith('material_')) {
                const material = selectedValue.split('_')[1];
                const modal = new ModalBuilder()
                  .setCustomId(`modifica_material_${material}`)
                  .setTitle(`Modifica ${material}`)
                  .addComponents(
                    new ActionRowBuilder().addComponents(
                      new TextInputBuilder()
                        .setCustomId('nuovo_prezzo')
                        .setLabel('New price per gram')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Enter the new price (e.g. 0.05)')
                        .setRequired(true),
                    ),
                  );

                await menuInteraction.showModal(modal);

                const modalSubmit = await menuInteraction.awaitModalSubmit({ time: 60000 });
                const nuovoPrezzo = parseFloat(modalSubmit.fields.getTextInputValue('nuovo_prezzo'));

                if (!isNaN(nuovoPrezzo)) {
                  config.materials[material].cost_per_gram = nuovoPrezzo;
                  saveConfig(config);
                  await modalSubmit.reply({ content: `Price of ${material} updated to €${nuovoPrezzo.toFixed(2)}/g.`, ephemeral: true });
                } else {
                  await modalSubmit.reply({ content: 'Invalid value. Enter a number.', ephemeral: true });
                }
              } else {
                const modal = new ModalBuilder()
                  .setCustomId(`modifica_${selectedValue}`)
                  .setTitle(`Edit ${selectedValue}`)
                  .addComponents(
                    new ActionRowBuilder().addComponents(
                      new TextInputBuilder()
                        .setCustomId('nuovo_valore')
                        .setLabel('New value')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Enter the new value')
                        .setRequired(true),
                    ),
                  );

                await menuInteraction.showModal(modal);

                const modalSubmit = await menuInteraction.awaitModalSubmit({ time: 60000 });
                const nuovoValore = parseFloat(modalSubmit.fields.getTextInputValue('nuovo_valore'));

                if (!isNaN(nuovoValore)) {
                  config[selectedValue] = nuovoValore;
                  saveConfig(config);
                  await modalSubmit.reply({ content: `${selectedValue} updated to ${nuovoValore}.`, ephemeral: true });
                } else {
                  await modalSubmit.reply({ content: 'Invalid value. Enter a number.', ephemeral: true });
                }
              }
            } catch (error) {
              console.error('Error during menu management:', error);
              await menuInteraction.reply({ content: 'An error occurred during menu management.', ephemeral: true });
            }
          });
        } else if (i.customId === 'aggiungi') {
          const modal = new ModalBuilder()
            .setCustomId('aggiungi_materiale')
            .setTitle('Add a new material')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('nome_materiale')
                  .setLabel('Name of the material')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('Enter the name of the material (e.g., PLA)')
                  .setRequired(true),
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('prezzo_materiale')
                  .setLabel('Price per gram')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('Enter the price per gram (e.g., 0.04)')
                  .setRequired(true),
              ),
            );

          await i.showModal(modal);

          const modalSubmit = await i.awaitModalSubmit({ time: 60000 });
          const nomeMateriale = modalSubmit.fields.getTextInputValue('nome_materiale');
          const prezzoMateriale = parseFloat(modalSubmit.fields.getTextInputValue('prezzo_materiale'));

          if (!isNaN(prezzoMateriale)) {
            config.materials[nomeMateriale] = { cost_per_gram: prezzoMateriale };
            saveConfig(config);
            await modalSubmit.reply({ content: `Material ${nomeMateriale} added with price €${prezzoMateriale.toFixed(2)}/g.`, ephemeral: true });
          } else {
            await modalSubmit.reply({ content: 'Invalid value. Enter a number.', ephemeral: true });
          }
        } else if (i.customId === 'rimuovi') {
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('rimuovi_materiale')
            .setPlaceholder('Select a material to remove')
            .addOptions(
              ...Object.keys(config.materials).map(material => ({
                label: material,
                value: material,
              })),
            );

          const rowMenu = new ActionRowBuilder().addComponents(selectMenu);
          await i.reply({ content: 'Select a material to remove:', components: [rowMenu], ephemeral: true });

          const menuCollector = i.channel.createMessageComponentCollector({ time: 60000 });

          menuCollector.on('collect', async (menuInteraction) => {
            try {
              const material = menuInteraction.values[0];
              delete config.materials[material];
              saveConfig(config);
              await menuInteraction.reply({ content: `Material ${material} removed.`, ephemeral: true });
            } catch (error) {
              console.error('Error during material removal:', error);
              await menuInteraction.reply({ content: 'An error occurred during material removal.', ephemeral: true });
            }
          });
        }
      } catch (error) {
        console.error('Error during interaction handling:', error);
        await i.reply({ content: 'An error occurred while handling the interaction.', ephemeral: true });
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] });
    });
  } catch (error) {
    console.error('Error while handling the /config command:', error);
    await interaction.reply('An error occurred while running the command.');
  }
}