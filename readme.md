### To run this bot:

1. Create an app and a bot in the [Discord Developer Portal](https://discord.com/developers/applications).
1. Ensure the bot "user account" is [added to your Discord server](https://discord.com/developers/docs/topics/oauth2#bots).
2. Install NodeJS.
3. Download this repo.
4. Create a text file named `.env` _(literally `.env` nothing before the dot)_ 
   in the root directory of the downloaded `tgd-streakbot` repo.
5. Edit the `.env` file in a plain-text editor like notepad.
   At minimum write `BOT_SECRET=[bot token]`, replacing [bot token] with the bot's secret token copied from the Discord dev portal.

   Example `.env` contents:
   ```shell
   # REQUIRED CONFIG
   BOT_SECRET=****************************

   # OPTIONAL CONFIG
   channelName=daily-standup

   dayStartHour=0
   dayStartMinute=0

   morningAnnouncementHour=7
   morningAnnouncementMinute=0

   midDayReminderHour=12
   midDayReminderMinute=0

   midWeekSummaryHour=13
   midWeekSummaryMinute=0

   midWeekDayOfWeek=3
   ```
6. Save and close the `.env` file.
7. Navigate a command prompt to the root directory of the downloaded `tgd-streakbot` repo.
8. Run the command: `npm install`
9. Run the command: `node .`
10. The command prompt should say "Logged in as TGD StreakBot". The bot should appear in the server's user list as online.
11. Leave the command prompt open for as long as you want the bot to run.

As users post messages, the bot will create and update a file named db.json. You can modify or delete this file yourself, but you need to restart the bot to handle changes you make. Either close the command prompt and start a new one, or input Ctrl+C to kill the bot, then run the "node ." command again.

You can change the channel this bot operates in, as well as the hour and minute that it considers the day to start at. These are constant values near the top of the code in bot.js. You'll need to restart the bot for it to detect these changes.
