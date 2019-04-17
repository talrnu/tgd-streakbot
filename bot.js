const Discord = require('discord.js');
const client = new Discord.Client();
const schedule = require('node-schedule');

const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = lowdb(adapter);

db.defaults({
		users: [],
	})
	.write();

const ONE_DAY = new Date(1000 * 60 * 60 * 24);
const dayStartHour = 8;
const dayStartMinute = 10;

const channelName = 'test';
let channel = null;

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}`);
	channel = client.channels.find(c => c.name === channelName);

	schedule.scheduleJob(`00 ${dayStartMinute.toString().padStart(2, '0')} ${dayStartHour.toString().padStart(2, '0')} * * *`, () => {
		broadcastNewDay();
	});

	schedule.scheduleJob(`00 ${dayStartMinute.toString().padStart(2, '0')} ${((dayStartHour + 12) % 24).toString().padStart(2, '0')} * * *`, () => {
		broadcastReminder();
	});

	//broadcastNewDay();
});

client.on('disconnect', (msg, code) => {
    if (code === 0) return console.error(msg);
    bot.connect();
});

client.on('message', message => {
	if (channel && message.channel.name === channel.name && message.author.id !== client.user.id) {
		console.log(`Processing message received from ${message.author.username}`);
		processMessageForStreak(message);
	}
});

client.login(process.env.BOT_SECRET);

const broadcastNewDay = () => {
	console.log('Announcing start of new day...');
	const announcement = `Good morning and welcome to the ${channelName} channel! Check the pinned messages for a full introduction.\n` +
						`Let the new day begin! Post your standup to start or continue your daily streak.${getUsersWhoPostedYesterday()}`;
	channel.send(announcement);
};

const broadcastReminder = () => {
	const announcement = `The day is half done! Don't forget to post an update for the day, even a quick note about what you plan to do tomorrow is good.${getUsersWhoPostedYesterday()}`;
	channel.send(announcement);
};

const getUsersWhoPostedYesterday = () => {
	let listText = '';
	const activeStreakUsers = db.get('users').value().filter(user => userStreakLastUpdatedYesterday(user));
	if (activeStreakUsers.length > 0) {
		listText += '\nCurrent running streaks:';
		activeStreakUsers.forEach(user => {
			const username = (user.mentionsEnabled) ? client.users.find(u => u.id === user.userID) : user.username;
			listText += `\n\t${username}: ${user.streak} (best: ${user.bestStreak})`;
		});
	}
	return listText;
};

const processMessageForStreak = msg => {
	const dbUser = getOrCreateDBUser(msg);
	if (userStreakNotAlreadyUpdatedToday(dbUser)) {
		console.log('\tUpdating streak...');
		addToStreak(msg, dbUser);
		msg.react('⭐');
	}
	else {
		console.log(`Extraneous message posted to ${msg.channel.name} by ${msg.author.username} (${msg.author.tag}) at ${new Date().toISOString()}`);
		msg.author.send(`Hey there! It looks like you've posted multiple times to the TGD server's ${msg.channel.name} channel today. Thanks for your commentary! We'd like to avoid overshadowing anyone's daily status update with other conversations, so we'd appreciate it if you would move this conversation to another channel, or wait until tomorrow to post your next update. Take it easy!`);
	}
};

const getOrCreateDBUser = msg => {
	let dbUser = db.get('users')
		.find({ userID: msg.author.id });

	if (dbUser.value()) {
		dbUser.assign({ username: msg.author.username }).write();
		console.log(`Existing user updated: ${JSON.stringify(dbUser.value())}`);
	}
	else {
		const newUser = {
			userID: msg.author.id,
			username: msg.author.username,
			messagesEnabled: true,
			mentionsEnabled: true,
		};
		const dbUsers = db.get('users');
		dbUsers.push(newUser).write();
		dbUser = dbUsers.find({ userID: newUser.userID });
		console.log(`New user created: ${JSON.stringify(dbUser.value())}`);
	}
	return dbUser;
};

const userStreakNotAlreadyUpdatedToday = dbUser => {
	if (!dbUser.value().streak) {
		console.log('\tThis user is starting their first streak');
		return true;
	}
	const mostRecentDayStart = getMostRecentDayStart();
	const userLastUpdate = new Date(dbUser.value().lastUpdate);
	console.log(`\tMost recent day start: ${mostRecentDayStart.toISOString()}, user last update: ${userLastUpdate.toISOString()}`);
	return (userLastUpdate < mostRecentDayStart);
};

const userStreakLastUpdatedYesterday = user => {
	const mostRecentDayStart = getMostRecentDayStart();
	const timeBeforeDayStart = mostRecentDayStart - user.lastUpdate;
	return (timeBeforeDayStart > 0 && timeBeforeDayStart < ONE_DAY);
};

const getMostRecentDayStart = () => {
	const mostRecentDayStart = new Date();
	if (mostRecentDayStart.getHours() < dayStartHour ||
		(mostRecentDayStart.getHours() == dayStartHour && mostRecentDayStart.getMinutes() < dayStartMinute)) {
		// It's the next calendar day, but the streak day hasn't started yet, so subtract 24h to get the correct date
		console.log(`\tAdjusting for the wee hours (current date: ${new Date().toUTCString()}, streak day start time: ${dayStartHour}:${dayStartMinute})`);
		mostRecentDayStart.setDate(mostRecentDayStart.getDate() - 1);
	}
	mostRecentDayStart.setHours(dayStartHour, dayStartMinute, 0, 0);
	return mostRecentDayStart;
};

const addToStreak = (msg, dbUser) => {
	const streakData = {
		streak: 1,
		bestStreak: 1,
		lastUpdate: new Date(),
	};
	if (!dbUser.value().streak) {
		console.log(`${msg.author.username} started a streak`);
	}
	else {
		const newLevel = dbUser.value().streak + 1;
		const currentBest = dbUser.value().bestStreak;
		streakData.streak = newLevel;
		streakData.bestStreak = Math.max(newLevel, currentBest);
		console.log(`${msg.author.username} continued a streak to ${newLevel}`);
		if (newLevel > currentBest) {
			console.log(`\t...and it's a new best! (${newLevel})`);
		}
	}
	dbUser.assign(streakData).write();
};
