exports.run = (client, message, args, color) => {
  let gameStr = args.join(" ");
  client.user.setGame(gameStr);
  message.channel.send("", {embed: {
    color: color,
    description: `${message.author} Game set.`
  }});
};
