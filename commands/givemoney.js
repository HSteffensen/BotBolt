exports.run = async (client, message, args, config, sql) => {
  let numberCheck = /\b\d+\b/;
  if(args.length != 2 || !numberCheck.test(args[0])) {
    return message.reply("syntax: `!givemoney # @`");
  }

  let amount = parseInt(args[0]);
  let authorID = message.author.id;
  let authorBalance = 0;
  let user = message.mentions.users.first();
  let userID = user.id;
  let userBalance = 0;

  //get author's balance
  try {
    let row = await sql.get(`SELECT * FROM money WHERE userID ="${authorID}"`);
    if(!row) {
      await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [authorID, 0]);
    } else {
      authorBalance = row.amount;
      amount = Math.min(amount, authorBalance);
      await sql.run(`UPDATE money SET balance = ${authorBalance - amount} WHERE userID = ${authorID}`);
    }
  } catch(e) {
    console.error(e);
    console.log("Creating table money");
    await sql.run("CREATE TABLE IF NOT EXISTS money (userId TEXT, balance INTEGER)");
    await sql.run("INSERT INTO money (userId, balance) VALUES (?, ?)", [authorID, 0]);
  }
  /*
  if(authorBalance == 0) {
    return message.reply("you have no money.");
  }
*/

  //get recipient's balance
  try {
    let row = await sql.get(`SELECT * FROM money WHERE userID ="${userID}"`);
    if(!row) {
      await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, 0]);
    } else {
      userBalance = row.amount;
      await sql.run(`UPDATE money SET balance = ${userBalance + amount} WHERE userID = ${userID}`);
    }
  } catch(e) {
    console.error(e);
    console.log("Creating table money");
    await sql.run("CREATE TABLE IF NOT EXISTS money (userId TEXT, balance INTEGER)");
    await sql.run("INSERT INTO money (userId, balance) VALUES (?, ?)", [userID, 0]);
  }

  //update balances


  message.channel.send("", {embed: {
    color: config.color,
    description: `**${message.author.tag}** has given \$${amount} to **${user.tag}**.`
  }});
};
