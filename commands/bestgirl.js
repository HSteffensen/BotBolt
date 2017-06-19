exports.run = async (client, message, command, config, sql) => {
  let args = command.args;
  let description = "";

  if(args[0] === "nominate") { //nominate a best girl
    description = await nominateGirl(client, message, command, sql);
  } else if(args[0] === "edit") {
    description = await editGirl(client, message, command, sql);
  } else if(args[0] === "vote") {
    description = await voteGirl(client, message, command, sql);
  } else if(args[0] === "remove" || args[0] === "delete") {
    description = await removeGirl(client, message, command, sql);
  } else if(args[0] === "reset" || args[0] === "clear") {
    await removeVotes(message.author.id, sql);
    description = "Your votes have been reset.";
  } else if(args[0] === "buyvote" || args[0] === "buy") {
    description = await buyVote(client, message, command, sql);
  } else if(args[0] === "leaderboard" || args[0] === "lb") {
    description = await getLeaderboard(client, message, command, sql, config);
    let page = (args.length > 1) ? parseInt(args[1]) : 1;
    if(!isNaN(page) && page >= 1) {
      description = await getLeaderboard(client, message, command, sql, config, page);
    } else {
      description = "Give a page number or leave blank for page 1: \`!bestgirl leaderboard 1\`";
    }
  } else { //see current best girl
    description = await getBestGirl(client, message, command, sql, config);
  }

  if(!command.silent && description !== "") {
    message.channel.send("", {embed: {
      color: config.color,
      description: description
    }});
  }
};

//first costs 50, then after is linear multiples of 100. to reduce number of nominees.
async function nominateGirl(client, message, command, sql) {
  let args = command.args;
  let output = "";

  let name = "";
  let index = 1;
  for(; index < args.length - 1; index++) {
    if(args[index].endsWith(":")) {
      name = `${name} ${args[index].slice(0, args[index].length - 1)}`;
      break;
    }
    name = `${name} ${args[index]}`;
  }
  let description = args.slice(index + 1, args.length - 1).join(" ");
  let image = args[args.length - 1];

  name = name.trim();
  description = description.trim();
  image = image.trim();

  if(checkInputs(name, description, image)) {
    output = await setGirl(sql, message.author.id, name, description, image, "nominate");
  } else {
    output = "Invalid input.\n\`!bestgirl nominate <name>: <description> <image URL>\`";
  }

  return output;
}

async function editGirl(client, message, command, sql) {
  let args = command.args;
  let output = "";

  let name = "";
  let index = 2;
  for(; index < args.length - 1; index++) {
    if(args[index].endsWith(":")) {
      name = `${name} ${args[index].slice(0, args[index].length - 1)}`;
      break;
    }
    name = `${name} ${args[index]}`;
  }
  name = name.trim();

  let type = args[1];
  if(type === "description") {
    let description = args.slice(index + 1, args.length).join(" ");
    description = description.trim();
    if(description.length <= 0) {
      return "Invalid input.\n\`!bestgirl edit description <name>: <description>\`";
    }
    output = await setGirl(sql, message.author.id, name, description, null, "edit");
  } else if(type === "image") {
    let image = args[args.length - 1];
    image = image.trim();
    if(image.length <= 0 || !image.startsWith("http")) {
      return "Invalid input.\n\`!bestgirl edit image <name>: <image URL>\`";
    }
    output = await setGirl(sql, message.author.id, name, null, image, "edit");
  } else {
    return "Invalid input.\n\`!bestgirl edit description <name>: <description>\` or `!bestgirl edit image <name>: <image URL>\`";
  }

  return output;
}

function checkInputs(name, description, image) {
  if(name.length <= 0 || description.length <= 0 || image.length <= 0) {
    return false;
  }

  const validUrl = require("valid-url");
  if(!validUrl.isWebUri(image)) {
    return false;
  }

  return true;
}

async function setGirl(sql, userID, name, description, image, type) {
  let balance = 0;
  let cost = 10; //default 10 for an edit, will be adjusted for a nominate
  //check if can afford
  try {
    let moneyRow = await sql.get("SELECT * FROM money WHERE userID = ?", [userID]);
    if(!moneyRow) {
      await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, 0]);
    } else {
      balance = moneyRow.balance;
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table money");
      await sql.run("CREATE TABLE IF NOT EXISTS money (userID TEXT, balance INTEGER)");
      await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, 0]);
    }
  }

  var girlRow;
  //check girl info, reject if qualifications arent met
  try {
    girlRow = await sql.get("SELECT * FROM bestgirls WHERE name = ?", [name]);
    if(girlRow && type === "nominate") { //trying to nominate a girl that already exists
      return `There is already a girl named ${name}`;
    } else if(type === "edit") {
      if(!girlRow) {
        return `There is no girl named ${name}.`;
      } else if(girlRow.nominator !== userID){
        return "You cannot edit a girl you did not nominate.";
      } else {
        if(description == null) {
          description = girlRow.description;
        }
        if(image == null) {
          image = girlRow.image;
        }
      }
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table bestgirls");
      await sql.run("CREATE TABLE IF NOT EXISTS bestgirls (name TEXT, description TEXT, image TEXT, nominator TEXT, votes INTEGER)");
    }
  }

  if(type === "nominate") {
    //get number nominated to calculate cost
    try {
      let voterRow = await sql.get("SELECT * FROM bestgirlvoters WHERE userID = ?", [userID]);
      if(!voterRow) {
        cost = 100;
        if(balance >= cost) {
          await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 1, 10, ""]);
        } else {
          await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 0, 10, ""]);
        }
      } else {
        cost = (voterRow.nominated + 1) * 100;
        if(balance >= cost) {
          await sql.run("UPDATE bestgirlvoters SET nominated = ? WHERE userID = ?", [voterRow.nominated + 1, userID]);
        }
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table bestgirlvoters");
        await sql.run("CREATE TABLE IF NOT EXISTS bestgirlvoters (userID TEXT, nominated INTEGER, votes INTEGER, votedFor TEXT)");
        cost = 100;
        if(balance >= cost) {
          await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 1, 10, ""]);
        } else {
          await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 0, 10, ""]);
        }
      }
    }
  }

  if(balance >= cost) {
    let remaining = balance - cost;
    try {
      await sql.run("UPDATE money SET balance = ? WHERE userID = ?", [remaining, userID]);
      if (type === "nominate") {
        await sql.run("INSERT INTO bestgirls (name, description, image, nominator, votes) VALUES (?, ?, ?, ?, ?)", [name, description, image, userID, 0]);
        return `You nominated ${name} for Best Girl. The nomination cost \$${cost}.`;
      } else if(type === "edit") {
        await sql.run("UPDATE bestgirls SET description = ?, image = ? WHERE name = ?", [description, image, name]);
        return `You edited ${name}. The edit cost \$${cost}.`;
      }
    } catch(e) {
      console.error(e);
    }
  } else {
    return `You cannot afford to ${type} a girl for \$${cost}.`;
  }
}

async function voteGirl(client, message, command, sql) {
  let args = command.args;
  let userID = message.author.id;
  let girlName = args.splice(1, args.length).join(" ");
  let girlVotes = 0;

  //check if girl exists and remember how many votes she already has
  try {
    let girlRow = await sql.get("SELECT * FROM bestgirls WHERE name = ?", [girlName]);
    if(!girlRow) {
      return `There is no girl named ${girlName}.`;
    } else {
      girlVotes = girlRow.votes;
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table bestgirls");
      await sql.run("CREATE TABLE IF NOT EXISTS bestgirls (name TEXT, description TEXT, image TEXT, nominator TEXT, votes INTEGER)");
    }
  }

  //set voter to her and prepare to remove votes from previously voted girl
  let removedName = "";
  let removedVotes = 0;
  try {
    let voterRow = await sql.get("SELECT * FROM bestgirlvoters WHERE userID = ?", [userID]);
    if(!voterRow) {
      await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 0, 10, girlName]);
    } else {
      removedName = voterRow.votedFor;
      removedVotes = voterRow.votes;
      await sql.run("UPDATE bestgirlvoters SET votedFor = ? WHERE userID = ?", [girlName, userID]);
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table bestgirlvoters");
      await sql.run("CREATE TABLE IF NOT EXISTS bestgirlvoters (userID TEXT, nominated INTEGER, votes INTEGER, votedFor TEXT)");
      await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 0, 10, girlName]);
    }
  }

  //remove votes from previously voted girl
  if(removedName !== "" && removedVotes != 0) {
    try {
      let girlRow = await sql.get("SELECT * FROM bestgirls WHERE name = ?", [removedName]);
      if(girlRow) {
        await sql.run("UPDATE bestgirls SET votes = ? WHERE name = ?", [girlRow.votes - removedVotes, removedName]);
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table bestgirls");
        await sql.run("CREATE TABLE IF NOT EXISTS bestgirls (name TEXT, description TEXT, image TEXT, nominator TEXT, votes INTEGER)");
      }
    }
  }

  //update votes for voted girl
  try {
    await sql.run("UPDATE bestgirls SET votes = ? WHERE name = ?", [girlVotes + removedVotes, girlName]);
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table bestgirls");
      await sql.run("CREATE TABLE IF NOT EXISTS bestgirls (name TEXT, description TEXT, image TEXT, nominator TEXT, votes INTEGER)");
    }
  }

  return `You voted for ${girlName}.`;
}

async function removeGirl(client, message, command, sql) {
  let args = command.args;
  let userID = message.author.id;
  let girlName = args.splice(1, args.length).join(" ");

  //check if girl exists and if user nominated her
  try {
    let girlRow = await sql.get("SELECT * FROM bestgirls WHERE name = ?", [girlName]);
    if(!girlRow) {
      return `There is no girl named ${girlName}.`;
    } else if(userID != girlRow.userID){
      return "You cannot remove a girl you did not nominate.";
    } else {
      await sql.run("DELETE FROM bestgirls WHERE name = ?", [girlName]);
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table bestgirls");
      await sql.run("CREATE TABLE IF NOT EXISTS bestgirls (name TEXT, description TEXT, image TEXT, nominator TEXT, votes INTEGER)");
    }
  }

  try {
    let voterRow = await sql.get("SELECT * FROM bestgirlvoters WHERE userID = ?", [userID]);
    if(!voterRow) {
      await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 0, 10, girlName]);
    } else {
      await sql.run("UPDATE bestgirlvoters SET nominated = ? WHERE userID = ?", [voterRow.nominated - 1, userID]);
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table bestgirlvoters");
      await sql.run("CREATE TABLE IF NOT EXISTS bestgirlvoters (userID TEXT, nominated INTEGER, votes INTEGER, votedFor TEXT)");
      await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 0, 10, girlName]);
    }
  }

  return `${girlName} is no longer nominated for Best Girl.`;
}

async function removeVotes(userID, sql) {
  //set voter to nobody and prepare to remove votes from previously voted girl
  let removedName = "";
  let removedVotes = 0;
  try {
    let voterRow = await sql.get("SELECT * FROM bestgirlvoters WHERE userID = ?", [userID]);
    if(!voterRow) {
      await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 0, 10, ""]);
    } else {
      removedName = voterRow.votedFor;
      removedVotes = voterRow.votes;
      await sql.run("UPDATE bestgirlvoters SET votedFor = ? WHERE userID = ?", ["", userID]);
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table bestgirlvoters");
      await sql.run("CREATE TABLE IF NOT EXISTS bestgirlvoters (userID TEXT, nominated INTEGER, votes INTEGER, votedFor TEXT)");
      await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 0, 10, ""]);
    }
  }

  //remove votes from previously voted girl
  if(removedName !== "" && removedVotes != 0) {
    try {
      let girlRow = await sql.get("SELECT * FROM bestgirls WHERE name = ?", [removedName]);
      if(girlRow) {
        await sql.run("UPDATE bestgirls SET votes = ? WHERE name = ?", [girlRow.votes - removedVotes, removedName]);
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table bestgirls");
        await sql.run("CREATE TABLE IF NOT EXISTS bestgirls (name TEXT, description TEXT, image TEXT, nominator TEXT, votes INTEGER)");
      }
    }
  }
}

async function buyVote(client, message, command, sql) {
  let userID = message.author.id;

  let balance = 0;
  let cost = 10; //default 10 for an edit, will be adjusted for a nominate
  //check if can afford
  try {
    let moneyRow = await sql.get("SELECT * FROM money WHERE userID = ?", [userID]);
    if(!moneyRow) {
      await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, 0]);
    } else {
      balance = moneyRow.balance;
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table money");
      await sql.run("CREATE TABLE IF NOT EXISTS money (userID TEXT, balance INTEGER)");
      await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, 0]);
    }
  }
  //check cost
  //add votes to bestgirlvoters if can afford
  let votedFor = "";
  let votes = 10;
  try {
    let voterRow = await sql.get("SELECT * FROM bestgirlvoters WHERE userID = ?", [userID]);
    if(!voterRow) {
      cost = 100;
      if(balance >= cost) {
        await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 0, 11, ""]);
      } else {
        await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 0, 10, ""]);
      }
    } else {
      cost = (voterRow.votes - 9) * 100;
      if(voterRow.votes < 10) {
        cost = 0;
      }
      votedFor = voterRow.votedFor;
      votes = voterRow.votes;
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table bestgirlvoters");
      await sql.run("CREATE TABLE IF NOT EXISTS bestgirlvoters (userID TEXT, nominated INTEGER, votes INTEGER, votedFor TEXT)");
      cost = 100;
      if(balance >= cost) {
        await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 0, 11, ""]);
      } else {
        await sql.run("INSERT INTO bestgirlvoters (userID, nominated, votes, votedFor) VALUES (?, ?, ?, ?)", [userID, 0, 10, ""]);
      }
    }
  }

  //if balance >= cost
  //remove money
  //add votes to bestgirls
  if(balance >= cost) {
    let remaining = balance - cost;
    try {
      await sql.run("UPDATE money SET balance = ? WHERE userID = ?", [remaining, userID]);
      await sql.run("UPDATE bestgirlvoters SET votes = ? WHERE userID = ?", [votes + 1, userID]);
    } catch(e) {
      console.error(e);
    }
    try {
      let girlRow = await sql.get("SELECT * FROM bestgirls WHERE name = ?", [votedFor]);
      if(girlRow) {
        await sql.run("UPDATE bestgirls SET votes = ? WHERE name = ?", [girlRow.votes + 1, votedFor]);
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table bestgirls");
        await sql.run("CREATE TABLE IF NOT EXISTS bestgirls (name TEXT, description TEXT, image TEXT, nominator TEXT, votes INTEGER)");
      }
    }
    return `You now have ${(votes + 1) / 10} votes. Buying a vote cost \$${cost}.`;
  } else {
    return `You cannot afford to buy a vote for \$${cost}.`;
  }
}

async function getLeaderboard(client, message, command, sql, config, page) {
  var girlRows;

  try {
    girlRows = await sql.all("SELECT * FROM bestgirls");
    if(girlRows.length <= 0) {
      return "There are no girls nominated.";
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table bestgirls");
      await sql.run("CREATE TABLE IF NOT EXISTS bestgirls (name TEXT, description TEXT, image TEXT, nominator TEXT, votes INTEGER)");
      return "There are no girls nominated.";
    }
  }

  if(girlRows) {
    girlRows = sortGirlRankings(girlRows);
    let start = (page - 1) * 10;
    if(girlRows.length < start) {
      page = Math.floor(girlRows.length / 10) + 1;
      start = (page - 1) * 10;
    }
    let output = "";
    if(page > 1) {
      output = `Page ${page}:\n`;
    }
    for(let i = start; i < start + 10 && i < girlRows.length; i++) {
      let row = girlRows[i];
      output += `**#${i+1}: ${row.votes / 10} votes**\n`;
      output += `${row.name}\n`;
      output += "\n";
    }
    return output;
  }

  return "";
}

async function getBestGirl(client, message, command, sql, config) {
  let args = command.args;
  var girlRows;

  try {
    girlRows = await sql.all("SELECT * FROM bestgirls");
    if(girlRows.length <= 0) {
      return "There are no girls nominated.";
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table bestgirls");
      await sql.run("CREATE TABLE IF NOT EXISTS bestgirls (name TEXT, description TEXT, image TEXT, nominator TEXT, votes INTEGER)");
      return "There are no girls nominated.";
    }
  }

  if(girlRows) {
    girlRows = sortGirlRankings(girlRows);
    if(args.length > 0) {
      let girlName = args.join(" ");
      let girl = girlRows.find((item) => {
        return item.name === girlName;
      });
      if(girl == undefined) {
        return `There is no girl named ${girlName}.`;
      }
      let profile = await getProfileEmbed(client, config, girl);
      message.channel.send("", {embed: profile});
    } else {
      let score = girlRows[0].votes;
      let index = 0;
      for(; index < girlRows.length; index++) {
        if(girlRows[index].votes != score) {
          break;
        }
      }
      let winners = girlRows.slice(0, index);
      if(winners.length > 1) {
        let oxfordComma = (winners.length > 2) ? "," : "";
        let prettyOutput = winners.slice(0, winners.length - 1).map((item) => { return item.name; }).join(", ") + `${oxfordComma} and ${winners[winners.length - 1].name}`;
        return `There is a tie for Best Girl between ${prettyOutput}.`;
      } else {
        let profile = await getProfileEmbed(client, config, girlRows[0]);
        message.channel.send("", {embed: profile});
      }
    }
  }

  return "";
}

async function getProfileEmbed(client, config, girl) {
  let user = await client.fetchUser(girl.nominator);
  const Discord = require("discord.js");
  let embed = new Discord.RichEmbed()
    .setColor(config.color)
    .setTitle(girl.name)
    .setDescription(girl.description)
    .setImage(girl.image)
    .addField("Rank:", girl.rank, true)
    .addField("Votes:", girl.votes / 10, true)
    .setFooter(`Nominated by ${user.tag}`)
    ;

  return embed;
}

function sortGirlRankings(girls) {
  if(girls.length <= 0) {
    return girls;
  }

  girls = girls.sort((a, b) => {
    if(a.votes != b.votes) {
      return b.votes - a.votes; //higher votes means lower rank number
    } else {
      var nameA = a.name.toUpperCase(); // ignore upper and lowercase
      var nameB = b.name.toUpperCase(); // ignore upper and lowercase
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0; //shouldnt ever happen..
    }
  });

  let rank = 1;
  let score = girls[0].votes;
  for(let i = 0; i < girls.length; i++) {
    if(girls[i].votes != score) {
      rank = i + 1;
    }
    girls[i].rank = rank;
  }

  return girls;
}
