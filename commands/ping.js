exports.run = (client, message) => {
  message.channel.send(":ping_pong: Pong!").catch(console.error);
};
