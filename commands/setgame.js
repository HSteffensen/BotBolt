exports.run = (client, message, args, config) => {
  let gameStr = args.join(" ");
  client.user.setGame(gameStr);
  message.channel.send("", {embed: {
    color: config.color,
    description: `${message.author} Game set.`
  }});
};
