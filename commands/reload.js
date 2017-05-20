exports.run = (client, message, args) => {
  if(!args || args.length < 1) {
    return message.reply("Bad request: must provide a command name to reload.");
  }
  // the path is relative to the *current folder*, so just ./filename.js
  try {
    delete require.cache[require.resolve(`./${args[0]}.js`)];
  } catch(e) {
    return message.reply("Bad request: command \"" + args.join(" ") + "\" not found.");
  }
  message.channel.send(`The command \"${args[0]}\" has been reloaded.`);
};
