exports.run = async (client, message, command, config, sql) => {
  let args = command.args;
  // Caller must be bot owner
  let permitted = false;
  //let authorID = message.author.id.toString();
  for(let i = 0, len = config.ownerIDs.length; i < len; i++) {
    let owner = config.ownerIDs[i];
    if(owner == message.author.id) {
      permitted = true;
      break;
    }
  }
  if(!permitted) {
    return message.reply("Permission denied: addmoney");
  }

  let numberCheck = /\b\d+\b/;
  if(args.length < 2 || !numberCheck.test(args[0])) {
    return message.reply("syntax: `!addmoney # @ (@...)`");
  }

  let amount = parseInt(args[0]);
  let description = "";
  let users = message.mentions.users.array();
  for(let i = 0, len = users.length; i < len; i++) {
    let user = users[i];
    let userID = user.id;
    let balance = 0;

    try {
      let row = await sql.get(`SELECT * FROM money WHERE userID ="${userID}"`);
      if(!row) {
        await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, amount]);
      } else {
        balance = row.balance;
        await sql.run(`UPDATE money SET balance = ${balance + amount} WHERE userID = ${userID}`);
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table money");
        await sql.run("CREATE TABLE IF NOT EXISTS money (userID TEXT, balance INTEGER)");
        await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, amount]);
      }
    }
    description +=`**${user.tag}** gained \$${amount}. \$${balance} => \$${balance + amount}\n`;
  }

  if(!command.silent) {
    message.channel.send("", {embed: {
      color: config.color,
      description: description
    }});
  }
};
