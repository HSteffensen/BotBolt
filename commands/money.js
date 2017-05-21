exports.run = async (client, message, command, config, sql) => {
  // Decide which user to check. Either caller or the mentioned name.
  let users = (message.mentions.users.array().length > 0) ? message.mentions.users.array() : [message.author];

  let description = "";
  for(let i = 0, len = users.length; i < len; i++) {
    let user = users[i];
    let balance = 0;
    let userID = user.id;
    try {
      let row = await sql.get(`SELECT * FROM money WHERE userID ="${userID}"`);
      if(!row) {
        await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, 0]);
      } else {
        balance = row.balance;
      }
    } catch(e) {
      console.error(e);
      console.log("Creating table money");
      await sql.run("CREATE TABLE IF NOT EXISTS money (userId TEXT, balance INTEGER)");
      await sql.run("INSERT INTO money (userId, balance) VALUES (?, ?)", [userID, 0]);
    }
    description += `**${user.tag}** has \$${balance}.\n`;
  }

  // Can't be silent or more verbose.
  message.channel.send("", {embed: {
    color: config.color,
    description: description
  }});
};
