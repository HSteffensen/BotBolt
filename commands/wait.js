// From http://stackoverflow.com/a/39914235
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

exports.run = async (client, message, command, config) => {
  let args = command.args;
  let numberCheck = /\b\d+\b/;
  if(args.length > 1 || !numberCheck.test(args[0])) {
    return message.reply("syntax: `!wait #`");
  }
  let milliseconds = parseInt(args[0]) * 1000;
  if(command.verbose) {
    message.channel.send("", {embed: {
      color: config.color,
      description: `Waiting ${args[0]} seconds.`
    }});
  }
  await sleep(milliseconds);
};
