const Discord = require('discord.js');
const logger = require('winston');
const {prefix, token,} = require('./auth.json');
const ytdl = require('ytdl-core');
const queue = new Map();



//Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console,{
    colorize:true
});
logger.level ='debug';
//Initialize Discord Bot
const bot = new Discord.Client();


//listeners
bot.once('ready', () => {
    console.log('Ready!');
});

bot.once('reconnecting', () => {
    console.log('Reconnecting!');
});
bot.once('disconnect', () => {
    console.log('Disconnect!');
});



/*bot.on('message', function(user,userID,channelID, message,evt){
    //Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if(message.substring(0,1)=='!') {
        let args =message.substring(1).split('');
        let cmd = args[0];
    args = args.splice(1);
    switch(cmd) {
        // !ping
        case 'ping':
            bot.sendMessage({
                to: channelID,
                message: 'What.'
            });

            break;
        // Just add any case commands if you want to..
    }}
})*/

bot.on('message', async message =>{
   //ignore own bot's messages
    if(message.author.bot) return; 
    //if it doesn't start with '/' it won't work
    if(!message.content.startsWith(prefix)) return;

   const serverQueue = queue.get(message.guild.id);
            if(message.content == `${prefix}ping`){
                //message.reply('What.(Sigh)'); this sends to user
            //this sends to channel
            message.channel.send('What.(Sigh)');
            }else if(message.content == `${prefix}help`){
                message.channel.send('```**/ping** :for bot ping\n**/play[space] URL** :type in voice channel to play song\n**/skip**": to skip to next song in queue\n**/stop**: to stop playing music\n```');
            }else if (message.content.startsWith(`${prefix}play`)) {
                execute(message, serverQueue);
                return;
            } else if (message.content.startsWith(`${prefix}skip`)) {
                skip(message, serverQueue);
                return;
            } else if (message.content.startsWith(`${prefix}stop`)) {
                stop(message, serverQueue);
                return;
                //add a queue showing command next
            } else {
                message.channel.send('Please enter a valid command.')
            }      
});


async function execute(message, serverQueue) {

    const args = message.content.split(' ');

    const voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.channel.send('You need to be in a voice channel to play music!');
    const permissions =     voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
        return message.channel.send('I need the permissions to join and   speak in your voice channel!');
    }

   /*  try{
        const songInfo = await ytdl.getInfo(args[1]);
    }
    catch(err){
        // Printing the error message if the bot fails to join the voicechat
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send("Error with song URL.");
    } */
    
    const songInfo = await ytdl.getInfo(args[1]);
    console.log(songInfo);
    const song = {
        title: songInfo.title,
        url: songInfo.video_url,
    };
   

    if (!serverQueue) {
        //if serverQueue is NOT already defined

        // Creating the contract for our queue
    const queueContruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        volume: 5,
        playing: true,
    };

    // Setting the queue using our contract
    queue.set(message.guild.id, queueContruct);
    // Pushing the song to our songs array
    queueContruct.songs.push(song);

    try {
        // Here we try to join the voicechat and save our connection into our object.
        let connection = await voiceChannel.join();
        queueContruct.connection = connection;
        // Calling the play function to start a song
        play(message.guild, queueContruct.songs[0]);
    } catch (err) {
        // Printing the error message if the bot fails to join the voicechat
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
    }

    }else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} has been added to the queue!`);
    }

}

function skip(message, serverQueue) {
    if (!message.member.voiceChannel)return message.channel.send('You have to be in a voice channel to stop the music.');
    if(!serverQueue) return message.channel.send('There are no songs, slow down, skipper.');
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voiceChannel) return message.channel.send('You have to be in a voice channel to stop the music.');
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        console.log("no songs; leaving channel");
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;

    }
    const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
        .on('end', (message) => {
            //message.channel.send('Show\'s over.');
            // Deletes the finished song from the queue
            serverQueue.songs.shift();
            // Calls the play function again with the next song
            play(guild, serverQueue.songs[0]);
        })
        .on('error', error => {
            console.error(error);
        });
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

bot.login(token);
;
