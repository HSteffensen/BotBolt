exports.run = async (client, message, args, config, sql) => {
  // Decide which user to check. Either caller or the mentioned name.
  let users = (message.mentions.users.array().length > 0) ? message.mentions.users.array() : [message.author];

  let description = "";
  for(let i = 0, len = users.length; i < len; i++) {
    let user = users[i];
    let amount = 0;
    let userID = user.id;
    try {
      let row = await sql.get(`SELECT * FROM money WHERE userID ="${userID}"`);
      if(!row) {
        await sql.run("INSERT INTO money (userID, amount) VALUES (?, ?)", [userID, 0]);
      } else {
        amount = row.amount;
      }
    } catch(e) {
      console.error(e);
      await sql.run("CREATE TABLE IF NOT EXISTS money (userId TEXT, amount INTEGER)");
      await sql.run("INSERT INTO money (userId, amount) VALUES (?, ?)", [userID, 0]);
    }
    description += `**${user.tag}** has \$${amount}.\n`;
  }


  message.channel.send("", {embed: {
    color: config.color,
    description: description
  }});
};
