function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

exports.run = async (client, message, args) => {
  let numberCheck = /\b\d+\b/;
  if(args.length > 1 || !numberCheck.test(args[0])) {
    return message.reply("syntax: `!wait #`");
  }
  let milliseconds = parseInt(args[0]) * 1000;
  await sleep(milliseconds);
};
