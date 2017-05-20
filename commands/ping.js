exports.run = (client, message) => {
  message.channel.send("Pong!").catch(console.error);
};
