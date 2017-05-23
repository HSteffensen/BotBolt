exports.run = async (client, message, command, config, sql) => {
  let author = message.author;
  let authorID = author.id;
  let commandName = command.name;
  let timestamp = message.createdTimestamp;

  //console.log(timestamp);
  return true;
};
