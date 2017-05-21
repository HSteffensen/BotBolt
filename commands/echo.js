exports.run = (client, message, command) => {
  message.channel.send(command.args.join(" ")).catch(console.error);
};
