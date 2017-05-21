exports.run = (client, message, args, config, sql) => {
  // Decide which user to check. Either caller or the mentioned name.
  let user = (!args || args.length < 1) ? message.author : message.mentions.users.first();
  let userID = user.id;
  /*
  if(!args || args.length < 1) {
    userID = message.author.id;
  } else {
    userID = message.mentions.users.first().id;
  }
  */

  let amount = 0;
  sql.get(`SELECT * FROM money WHERE userID ="${userID}"`).then(row => {
    if(!row) {
      sql.run("INSERT INTO money (userID, amount) VALUES (?, ?)", [userID, 0]);
    } else {
      amount = row.amount;
    }
  }).catch(() => {
    console.error;
    sql.run("CREATE TABLE IF NOT EXISTS money (userId TEXT, amount INTEGER)").then(() => {
      sql.run("INSERT INTO money (userId, amount) VALUES (?, ?)", [userID, 0]);
    });
  });

  message.channel.send("", {embed: {
    color: config.color,
    description: `**${user.tag}** has \$${amount}.`
  }});
};
