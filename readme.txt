To run this bot:

# Ensure the bot "user account" is added to your Discord server.
# Install NodeJS.
# Download this repo.
# Create a file in the directory you downloaded the repo to. Name the file ".env" (nothing before the dot).
# Edit the new file in a text editor like notepad. Write "BOT_SECRET=[bot token]", replacing [bot token] with the bot's secret token copied from the Discord dev portal.
# Save and close the .env file.
# Navigate a command prompt to the directory you downloaded the repo to.
# Run the command: "npm install" (no quotes)
# Run the command: "node ." (no quotes)
# The command prompt should say "Logged in as TGD StreakBot". The bot should appear in the server's user list as online.
# Leave the command prompt open for as long as you want the bot to run.

As users post messages, the bot will create and update a file named db.json. You can modify or delete this file yourself, but you need to restart the bot to handle changes you make. Either close the command prompt and start a new one, or input Ctrl+C to kill the bot, then run the "node ." command again.

You can change the channel this bot operates in, as well as the hour and minute that it considers the day to start at. These are constant values near the top of the code in bot.js. You'll need to restart the bot for it to detect these changes.