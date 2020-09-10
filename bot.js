#!/usr/bin/env node
require('dotenv').config();
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

const dayStartHour = process.env.dayStartHour ? parseInt(process.env.dayStartHour) : 0;
const dayStartMinute = process.env.dayStartMinute ? parseInt(process.env.dayStartMinute) : 0;

const morningAnnouncementHour = process.env.morningAnnouncementHour ? parseInt(process.env.morningAnnouncementHour) : 7;
const morningAnnouncementMinute = process.env.morningAnnouncementMinute ? parseInt(process.env.morningAnnouncementMinute) : 0;

const midDayReminderHour = process.env.midDayReminderHour ? parseInt(process.env.midDayReminderHour) : 12;
const midDayReminderMinute = process.env.midDayReminderMinute ? parseInt(process.env.midDayReminderMinute) : 0;

const midWeekSummaryHour = process.env.midWeekSummaryHour ? parseInt(process.env.midWeekSummaryHour) : 13;
const midWeekSummaryMinute = process.env.midWeekSummaryMinute ? parseInt(process.env.midWeekSummaryMinute) : 0;

const midWeekDayOfWeek = process.env.midWeekDayOfWeek ? parseInt(process.env.midWeekDayOfWeek) : 3;

const channelName = process.env.channelName || 'daily-standup';

let dayStartJob;
let morningAnnouncementJob;
let midDayReminderJob;
let reconnectJob;
let midweekJob;

console.log('Starting up...');
client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag} - ${new Date().toUTCString()}`);

	if (!dayStartJob) {
		console.log('Scheduling day start job...');
		dayStartJob = schedule.scheduleJob(`00 ${dayStartMinute.toString().padStart(2, '0')} ${dayStartHour.toString().padStart(2, '0')} * * *`, () => {
			console.log('Starting new day...');
			broadcastNewDay();
		});
	}
	if (!morningAnnouncementJob) {
		console.log('Scheduling day start job...');
		morningAnnouncementJob = schedule.scheduleJob(`00 ${morningAnnouncementMinute.toString().padStart(2, '0')} ${morningAnnouncementHour.toString().padStart(2, '0')} * * *`, () => {
			console.log('Broadcasting morning announcement...');
			broadcastMorningAnnouncement();
		});
	}
	if (!midDayReminderJob) {
		console.log('Scheduling reminder job...');
		midDayReminderJob = schedule.scheduleJob(`00 ${midDayReminderMinute.toString().padStart(2, '0')} ${midDayReminderHour.toString().padStart(2, '0')} * * *`, () => {
			console.log('Broadcasing reminder...');
			broadcastMidDayReminder();
		});
	}
	if (!reconnectJob) {
		console.log('Scheduling reconnect job...');
		reconnectJob = schedule.scheduleJob('00 05 * * * *', () => {
			console.log('Performing scheduled reconnect...');
			disconnect();
		});
	}
	if (!midweekJob) {
		console.log('Scheduling midweek job...');
		midweekJob = schedule.scheduleJob(`00 ${midWeekSummaryMinute.toString().padStart(2, '0')} ${midWeekSummaryHour.toString().padStart(2, '0')} * * ${midWeekDayOfWeek}`, () => {
			console.log('Broadcasing midweek summary...');
			broadcastSummary();
		});
	}

	// broadcastMorningAnnouncement();
	console.log('Client startup complete.');
});
console.log('client ready event configured');

client.on('error', error => {
	console.error(error);
});
console.log('client error event configured');

client.on('disconnect', (msg, code) => {
		if (code === 0) return console.error(msg);
	console.log('Graceful disconnect occurred.');
		disconnectCleanup();
	connect();
});
console.log('client disconnect event configured');

client.on('message', message => {
	const channel = client.channels.find(c => c.name === channelName);
	if (channel && message.channel.name === channel.name && message.author.id !== client.user.id) {
		console.log(`Processing message received from ${message.author.username}`);
		processMessageForStreak(message);
	}
});
console.log('client message event configured');

const disconnectCleanup = () => {
	console.log('Cleaning up after disconnect...');
	dayStartJob.cancel();
	dayStartJob = null;
	midDayReminderJob.cancel();
	midDayReminderJob = null;
	reconnectJob.cancel();
	reconnectJob = null;
};

const disconnect = () => {
	console.log('Disconnecting...');
	client.destroy();
};

const connect = () => {
	console.log('Connecting...');
	client.login(process.env.BOT_SECRET);
};

connect();
console.log('initial connection established');

const broadcastNewDay = () => {
	const channel = client.channels.find(c => c.name === channelName);
	console.log('Start of new day (no announcement in channel)...');
};

broadcastMorningAnnouncement = () => {
	const channel = client.channels.find(c => c.name === channelName);
	console.log('Announcing morning streak...');
	const announcement = `Good morning and welcome to the ${channelName} channel! Check the pinned messages for a full introduction.\n` +
						`Let the new day begin! Post your standup to start or continue your daily streak.${getUsersWhoPostedYesterday()}`;
	channel.send(announcement);
};

const broadcastMidDayReminder = () => {
	const channel = client.channels.find(c => c.name === channelName);
	console.log('Announcing mid-day reminder...');
	const announcement = `The day is half done! Don't forget to post an update for the day, even a quick note about what you plan to do tomorrow is good.${getUsersWhoCouldLoseTheirStreak()}`;
	channel.send(announcement);
};

const broadcastSummary = () => {
	const channel = client.channels.find(c => c.name === channelName);
	console.log('Announcing mid-week summary...');
	const announcement = `We're halfway through the week! Time for a weekly summary.${getUsersWhoPostedInThePastWeek()}`;
	channel.send(announcement);
};

const getUsersWhoPostedYesterday = () => {
	console.log('getUsersWhoPostedYesterday()');
	let listText = '';
	const users = db.get('users').value();
	//console.log(`users: ${JSON.stringify(users)}`);
	const activeStreakUsers = users.filter(userStreakLastUpdatedYesterday);
	if (activeStreakUsers.length > 0) {
		listText += '\nCurrent running streaks:';
		activeStreakUsers.forEach(user => {
			const username = (user.mentionsEnabled) ? client.users.find(u => u.id === user.userID) : user.username;
			listText += `\n\t${username}: ${user.streak} (best: ${user.bestStreak})`;
		});
	}
	return listText;
};

const getUsersWhoCouldLoseTheirStreak = () => {
	console.log('getUsersWhoCouldLoseTheirStreak()');
	let listText = '';
	const users = db.get('users').value();
	//console.log(`users: ${JSON.stringify(users)}`);
	const atRiskUsers = users.filter(userStreakStillNeedsUpdatingToday);
	if (atRiskUsers.length > 0) {
		listText += '\nThese users still need to post today if they want to keep their current streak alive:';
		atRiskUsers.forEach(user => {
			const username = (user.mentionsEnabled) ? client.users.find(u => u.id === user.userID) : user.username;
			listText += `\n\t${username}: ${user.streak} (best: ${user.bestStreak})`;
		});
	}
	return listText;
};

const getUsersWhoPostedInThePastWeek = () => {
	console.log('getUsersWhoPostedInThePastWeek()');
	let listText = '';
	const users = db.get('users').value();
	//console.log(`users: ${JSON.stringify(users)}`);
	const pastWeekUsers = users.filter(userStreakUpdatedInPastWeek);
	if (pastWeekUsers.length > 0) {
		listText += '\nUsers who have posted in the past week:';
		pastWeekUsers.forEach(user => {
			listText += `\n\t${user.username} (best streak: ${user.bestStreak})`;
		});
		listText += '\nKeep up the good work!';
	}
	else {
		listText = '\nNo users have posted in the past week! I\'ll have an existential meltdown now.';
	}
	return listText;
};


const processMessageForStreak = msg => {
	const dbUser = getOrCreateDBUser(msg);
	if (userStreakNotAlreadyUpdatedToday(dbUser.value())) {
		console.log('\tUpdating streak...');
		addToStreak(msg, dbUser);
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

const userStreakNotAlreadyUpdatedToday = user => {
	console.log(`userStreakNotAlreadyUpdatedToday(${user.username})`);
	if (!user.streak) {
		console.log('\tThis user is starting their first streak');
		return true;
	}
	const mostRecentDayStart = getMostRecentDayStart();
	const userLastUpdate = new Date(user.lastUpdate);
	console.log(`\tMost recent day start: ${mostRecentDayStart.toUTCString()}, user last update: ${userLastUpdate.toUTCString()}`);
	return (userLastUpdate < mostRecentDayStart);
};

const userStreakLastUpdatedYesterday = user => {
	console.log(`userStreakLastUpdatedYesterday(${user.username})`);
	if (!user.lastUpdate) {
		console.log('\tUser\'s first streak! No last update date.');
		return false;
	}
	const mostRecentDayStart = getMostRecentDayStart();
	const userLastUpdate = new Date(user.lastUpdate);
	const timeBeforeDayStart = mostRecentDayStart.getTime() - userLastUpdate.getTime();
	console.log(`\tMost recent day start: ${mostRecentDayStart.toUTCString()};`);
	console.log(`\tuser last update: ${userLastUpdate.toUTCString()};`);
	console.log(`\ttime between last update and most recent day start: ${timeBeforeDayStart};`);
	console.log(`\tOne day is ${ONE_DAY};`);
	const didLastUpdateYesterday = (timeBeforeDayStart > 0 && timeBeforeDayStart < ONE_DAY);
	console.log(`\tResult: ${didLastUpdateYesterday}`);
	return didLastUpdateYesterday;
};

const userStreakStillNeedsUpdatingToday = user => {
	return userStreakLastUpdatedYesterday(user) && userStreakNotAlreadyUpdatedToday(user);
};

const userStreakUpdatedInPastWeek = user => {
	const userLastUpdate = new Date(user.lastUpdate);
	const timeSinceLastUpdate = new Date() - userLastUpdate;
	return (timeSinceLastUpdate < (7 * ONE_DAY));
};

const getMostRecentDayStart = () => {
	console.log('getMostRecentDayStart()');
	const now = new Date(Date.now());
	console.log(`current time is ${now.toUTCString()}; day starts at ${dayStartHour}:${dayStartMinute}`);
	const mostRecentDayStart = now;
	if (mostRecentDayStart.getHours() < dayStartHour ||
		(mostRecentDayStart.getHours() == dayStartHour && mostRecentDayStart.getMinutes() < dayStartMinute)) {
		// It's the next calendar day, but the streak day hasn't started yet, so subtract 24h to get the correct date
		console.log('\tAdjusting for the wee hours...');
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
	let isNewBest = true;
	let isNewStreak = false;
	const user = dbUser.value();
	if (!user.bestStreak) {
		console.log(`${msg.author.username} started their first streak`);
		isNewStreak = true;
	}
	else if (!userStreakLastUpdatedYesterday(user)) {
		console.log(`${msg.author.username} started a new streak`);
		isNewStreak = true;
		streakData.bestStreak = user.bestStreak;
		isNewBest = false;
	}
	else {
		const newLevel = user.streak + 1;
		const currentBest = user.bestStreak;
		streakData.streak = newLevel;
		streakData.bestStreak = Math.max(newLevel, currentBest);
		console.log(`${msg.author.username} continued a streak to ${newLevel}`);
		if (newLevel > currentBest) {
			console.log(`\t...and it's a new best! (${newLevel})`);
		}
		else {
			isNewBest = false;
		}
	}
	if (isNewStreak) {
		msg.react('☄');
	}
	if (isNewBest) {
		msg.react('🌟');
	}
	else {
		msg.react('⭐');
	}
	dbUser.assign(streakData).write();
};
