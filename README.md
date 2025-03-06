# Quote-for-3d-prints-discord-bot

This Discord bot provides functionality to manage 3D printing configurations and calculate the cost of a 3D print job. It is split into two main commands:

### `/config` Command
This command allows users to view and edit the bot's configuration settings, which include the energy cost per kWh, machine power consumption, and available printing materials with their respective prices per gram. 

- **Viewing Configurations**: The bot responds with an embed showing the current configurations.
- **Edit, Add, Remove Options**: Users can interact with buttons to:
  - **Edit**: Modify specific configurations such as energy cost or material prices. This includes selecting a material or parameter to edit, followed by entering a new value.
  - **Add**: Add a new material with a name and price per gram.
  - **Remove**: Remove an existing material from the list.

The bot uses modals for more complex inputs (such as updating material prices or adding a new material), and the configurations are saved in a `config.json` file, ensuring persistence.

### `/quote` Command
This command calculates the cost of a 3D print job based on the provided G-code file and material choice. 

- **G-code Parsing**: The bot downloads the G-code file, extracts information such as estimated print time and filament usage, and calculates the necessary details.
- **Cost Calculation**: 
  - Material cost is calculated based on the filament used and the selected material.
  - Energy cost is based on the printing time and the machine's power consumption.
  - Filament length used is also calculated, along with the total cost (material cost + energy cost).
- **Response**: The bot returns a detailed quote, including:
  - Print time
  - Filament weight and length
  - Material cost, energy cost, and total cost

Each interaction with the bot is carefully managed, with error handling to ensure smooth user experience.

### Features
- **Interactive UI**: The bot uses buttons, select menus, and modals to make interactions seamless.
- **Configuration Management**: Admins can configure and manage the printing setup with ease, adjusting materials, energy costs, and machine parameters.
- **Cost Estimation**: Users can get an accurate quote for 3D print jobs based on real-time parameters and materials.

This bot is highly customizable, offering both configuration management and advanced 3D printing cost estimation functionalities, making it a versatile tool for users involved in 3D printing.




## How to Setup
###Edit the config.json and bot.js
  In bot.js edit the const clientId = "PUT_YOUR_BOT_CLIENT_ID";
  client_id: Insert your bot's client ID here.
  token: Insert your bot's token here (you can find it in the Discord Developer Portal).
  energy_cost_per_kwh: The cost per kWh of electricity consumed by the bot.
  machine_power_consumption: The power consumption of the machine (in kW).
  materials: Define the available materials with their cost per gram.

### npm install
### node bot.js
