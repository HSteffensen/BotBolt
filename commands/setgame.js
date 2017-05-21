exports.run = (client, message, command, config) => {
  let args = command.args;
  let gameStr = args.join(" ");
  client.user.setGame(gameStr);
  if(!command.silent) {
    message.channel.send("", {embed: {
      color: config.color,
      description: `${message.author} Game set.`
    }});
  }
};
