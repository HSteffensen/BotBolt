exports.run = async (client, message, command, config, sql) => {
  /*
  sub-commands:
  hire (x workers)
  sabotage (@someone)
  strike (@someone)
  earthquake (x magnitude)
  bribe (@someone) maybe
  */
  let args = command.args;
  let description = "";
  if(args[0] === "hire") {
    let workers = parseInt(args[1]);
    if(!isNaN(workers) && workers >= 1) {
      description = await hireWorkers(message.author, sql, workers, command.verbose);
    } else {
      description = "Give a number of workers to hire: \`!skyscraper hire 1\`\nEach worker costs \$1 more than the last.";
    }
  } else if(args[0] === "leaderboard" || args[0] === "lb") {
    let page = (args.length > 1) ? parseInt(args[1]) : 1;
    if(!isNaN(page) && page >= 1) {
      description = await getLeaderboard(client, message, sql, page, command.verbose);
    } else {
      description = "Give a page number or leave blank for page 1: \`!skyscraper leaderboard 1\`";
    }
  } else if(args[0] === "earthquake") {
    let magnitude = parseInt(args[1]);
    if(!isNaN(magnitude) && magnitude >= 1 && magnitude <= 50) {
      description = await buyEarthquake(message.author, sql, magnitude, command.verbose);
    } else {
      if(magnitude > 50) {
        description = "Give a magnitude number from 1 to 50: \`!skyscraper earthquake 1\`\nMagnitude 1 costs \$10, and each magnitude higher costs 2x more than the last.";
      } else  {
        description = "Give a magnitude number: \`!skyscraper earthquake 1\`\nMagnitude 1 costs \$10, and each magnitude higher costs 2x more than the last.";
      }
    }
  } else if(args[0] === "sabotage") {
    let target = message.mentions.users.first();
    if(target == undefined) {
      description = "Give a target: \`!skyscraper sabotage @BotBolt\`\nCosts as much as the target's most expensive worker.";
    } else if(target.id === message.author.id) {
      description = "Do not sabotage yourself.";
    } else {
      description = await buySabotage(message.author, sql, target, command.verbose);
    }

  } else if(args[0] === "strike") {
    let target = message.mentions.users.first();
    if(target == undefined) {
      description = "Give a target: \`!skyscraper strike 1 @BotBolt\`\nCosts as much as your most expensive worker plus the length of their strike per hour.";
    } else if(target.id === message.author.id) {
      description = "Do not strike yourself.";
    } else {
      let hours = parseInt(args[1]);
      if(!isNaN(hours) && hours >= 1) {
        description = await buyStrike(message.author, sql, target, hours, command.verbose);
      } else {
        description = "Give an hour amount: \`!skyscraper strike 1 @BotBolt\`\nCosts as much as your most expensive worker per hour.";
      }
    }
  } else {
    //examine the user's skyscraper
    let target = message.mentions.users.first();
    if(target == undefined) {
      //examine own
      description += await checkSkyscraper(message.author, sql, command.verbose);
    } else {
      //examine someone else's
      description += await checkSkyscraper(target, sql, command.verbose);
    }
  }

  if(!command.silent) {
    message.channel.send("", {embed: {
      color: config.color,
      description: description
    }});
  }
};

async function checkSkyscraper(user, sql, verbose) {
  let userID = user.id;
  let output = "";
  let precision = (verbose) ? 6 : 3;
  try {
    let row = await sql.get(`SELECT * FROM skyscraper WHERE userID ="${userID}"`);
    if(row) {
      let s = (row.workers != 1) ? "s" : "";
      output += `**${user.tag}** has ${row.workers} worker${s} and ${row.height} floors.\n`;
      output += `The next floor is ${(100 * row.progress).toFixed(precision)}% completed.\n`;
      if(row.strike > 0) {
        output += `Your workers are on strike for ${row.strike} more hours.`;
      }
    } else {
      await sql.run("INSERT INTO skyscraper (userID, workers, height, progress, strike) VALUES (?, ?, ?, ?, ?)", [userID, 0, 0, 0.0, 0]);
      output = `0 workers and 0 floors.\nThe next floor is ${(0.0).toFixed(precision)}% completed.`;
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table skyscraper");
      await sql.run("CREATE TABLE IF NOT EXISTS skyscraper (userID TEXT, workers INTEGER, height INTEGER, progress FLOAT, strike INTEGER)");
      await sql.run("INSERT INTO skyscraper (userID, workers, height, progress, strike) VALUES (?, ?, ?, ?, ?)", [userID, 0, 0, 0.0, 0]);
      output = `0 workers and 0 floors.\nThe next floor is ${(0.0).toFixed(precision)}% completed.`;
    }
  }
  return output;
}

async function getLeaderboard(client, message, sql, page, verbose) {
  let rows = [];
  try {
    rows = await sql.all("SELECT * FROM skyscraper");
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table skyscraper");
      await sql.run("CREATE TABLE IF NOT EXISTS skyscraper (userID TEXT, workers INTEGER, height INTEGER, progress FLOAT, strike INTEGER)");
      await sql.run("INSERT INTO skyscraper (userID, workers, height, progress, strike) VALUES (?, ?, ?, ?, ?)", [message.author.id, 0, 0, 0.0, 0]);
      rows = [{userID: message.author.id, workers: 0, height: 0, progress: 0, strike: 0}];
    }
  }
  rows.sort((a, b) => {
    let aValue = a.height + a.progress;
    let bValue = b.height + b.progress;
    return bValue - aValue;
  });
  let start = (page - 1) * 10;
  if(rows.length < start) {
    page = Math.floor(rows.length / 10) + 1;
    start = (page - 1) * 10;
  }
  let output = "";
  let precision = (verbose) ? 6 : 3;
  if(page > 1) {
    output = `Page ${page}:\n`;
  }
  for(let i = start; i < start + 10 && i < rows.length; i++) {
    let row = rows[i];
    let user = await client.fetchUser(row.userID);
    output += `**#${i+1}: ${user.tag}**\n`;
    output += `${row.height} floors. Next floor is ${(100 * row.progress).toFixed(precision)}% completed. ${row.workers} workers.\n`;
    output += "\n";
  }
  return output;
}

async function hireWorkers(user, sql, number, verbose) {
  let userID = user.id;
  let cost = number * (number + 1) / 2; // sum from 1 to number
  var skyRow;
  let currentWorkers = 0;
  //check the cost of the workers
  try {
    skyRow = await sql.get(`SELECT * FROM skyscraper WHERE userID ="${userID}"`);
    if(skyRow) {
      cost += skyRow.workers * number; // the sum of the numbers from skyRow.workers to skyRow.workers+number
      currentWorkers = skyRow.workers;
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table skyscraper");
      await sql.run("CREATE TABLE IF NOT EXISTS skyscraper (userID TEXT, workers INTEGER, height INTEGER, progress FLOAT, strike INTEGER)");
    }
  }
  let balance = 0;
  //check if can afford
  try {
    let moneyRow = await sql.get(`SELECT * FROM money WHERE userID ="${userID}"`);
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
  //make the buy
  if(balance >= cost) {
    let remaining = balance - cost;
    let newWorkers = currentWorkers + number;
    try {
      if(skyRow) {
        await sql.run("UPDATE skyscraper SET workers = ? WHERE userID = ?", [newWorkers, userID]);
      } else {
        await sql.run("INSERT INTO skyscraper (userID, workers, height, progress, strike) VALUES (?, ?, ?, ?, ?)", [userID, newWorkers, 0, 0.0, 0]);
      }
      await sql.run(`UPDATE money SET balance = ${remaining} WHERE userID = ${userID}`);
    } catch(e) {
      console.error(e);
    }
    let s = (number != 1) ? "s" : "";
    let output = `You hired ${number} worker${s} for \$${cost}.`;
    if(verbose) {
      output += `\n**${user.tag}** \$${balance} => \$${remaining}`;
    }
    return output;
  } else {
    let s = (number != 1) ? "s" : "";
    let output = `You cannot afford to hire ${number} worker${s} for \$${cost}.`;
    if(verbose) {
      output += `\n**${user.tag}** has \$${balance}.`;
    }
    return output;
  }
}

async function buySabotage(user, sql, target, verbose) {
  let userID = user.id;
  let targetID = target.id;
  let cost = 0;
  let currentWorkers = 0;
  var skyRow;
  //check the cost of the sabotage
  try {
    skyRow = await sql.get(`SELECT * FROM skyscraper WHERE userID ="${targetID}"`);
    if(skyRow) {
      cost = skyRow.workers;
      currentWorkers = skyRow.workers;
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table skyscraper");
      await sql.run("CREATE TABLE IF NOT EXISTS skyscraper (userID TEXT, workers INTEGER, height INTEGER, progress FLOAT, strike INTEGER)");
      await sql.run("INSERT INTO skyscraper (userID, workers, height, progress, strike) VALUES (?, ?, ?, ?, ?)", [targetID, 0, 0, 0.0, 0]);
    }
  }
  let balance = 0;
  //check if can afford
  try {
    let moneyRow = await sql.get(`SELECT * FROM money WHERE userID ="${userID}"`);
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
  //make the buy
  if(balance >= cost && currentWorkers > 0) {
    let remaining = balance - cost;
    let newWorkers = Math.floor(currentWorkers * 0.9);
    let killedWorkers = currentWorkers - newWorkers;
    try {
      await sql.run("UPDATE skyscraper SET workers = ? WHERE userID = ?", [newWorkers, targetID]);
      await sql.run(`UPDATE money SET balance = ${remaining} WHERE userID = ${userID}`);
    } catch(e) {
      console.error(e);
    }
    let output = `You sabotaged ${killedWorkers} of **${target.tag}**'s workers for \$${cost}.`;
    if(verbose) {
      output += `\n**${user.tag}** \$${balance} => \$${remaining}`;
    }
    return output;
  } if(currentWorkers == 0) {
    return `**${target.tag}** has no workers to sabotage!`;
  } else {
    let output = `You cannot afford to sabotage **${target.tag}** for \$${cost}.`;
    if(verbose) {
      output += `\n**${user.tag}** has \$${balance}.`;
    }
    return output;
  }
}

async function buyStrike(user, sql, target, hours, verbose) {
  let userID = user.id;
  let targetID = target.id;
  let cost = hours * (hours - 1) / 2;
  let doStrike = false;
  let currentStrike = 0;
  var targetRow;
  var userRow;
  //check the cost of the sabotage
  try {
    targetRow = await sql.get(`SELECT * FROM skyscraper WHERE userID ="${targetID}"`);
    if(targetRow) {
      currentStrike = targetRow.strike;
      cost += targetRow.strike * hours;
      doStrike = (targetRow.workers > 0 && targetRow.progress > 0);
    }
    if(doStrike) {
      userRow = await sql.get(`SELECT * FROM skyscraper WHERE userID ="${userID}"`);
      if(userRow) {
        cost += Math.floor((userRow.workers + targetRow.workers) / 2 * hours);
        doStrike = (cost > 0);
      }
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table skyscraper");
      await sql.run("CREATE TABLE IF NOT EXISTS skyscraper (userID TEXT, workers INTEGER, height INTEGER, progress FLOAT, strike INTEGER)");
    }
  }

  if(!doStrike) {
    return `You cannot get **${target.tag}**'s workers to go on strike.`;
  }

  let balance = 0;
  //check if can afford
  try {
    let moneyRow = await sql.get(`SELECT * FROM money WHERE userID ="${userID}"`);
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
  //make the buy
  if(balance >= cost) {
    let remaining = balance - cost;
    let newStrike = currentStrike + hours;
    try {
      if(targetRow) {
        await sql.run("UPDATE skyscraper SET strike = ? WHERE userID = ?", [newStrike, targetID]);
      }
      await sql.run(`UPDATE money SET balance = ${remaining} WHERE userID = ${userID}`);
    } catch(e) {
      console.error(e);
    }
    let output = `You got **${target.tag}**'s workers to strike for ${newStrike} hours for \$${cost}.`;
    if(verbose) {
      output += `\n**${user.tag}** \$${balance} => \$${remaining}`;
    }
    return output;
  } else {
    let output = `You cannot afford to get **${target.tag}**'s workers to strike for \$${cost}.`;
    if(verbose) {
      output += `\n**${user.tag}** has \$${balance}.`;
    }
    return output;
  }
}

async function buyEarthquake(user, sql, magnitude, verbose) {
  let userID = user.id;
  //let possibleValues = [[10, 0.99], [20, 0.9801], [40, 0.960596], [80, 0.922745], [160, 0.851458], [320, 0.72498], [640, 0.525596], [1280, 0.276252], [2560, 0.076315], [5120, 0.00582398]];
  //let [cost, factor] = possibleValues[magnitude - 1];
  //calculate cost
  let costBase = 1;
  let factor = 0.99;
  for(let i = 1; i < magnitude && i < 50; i++) {
    costBase = costBase * 2;
    factor = factor * factor;
  }
  let cost = costBase * 10;
  let balance = 0;
  //check if can afford
  try {
    let moneyRow = await sql.get(`SELECT * FROM money WHERE userID ="${userID}"`);
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
  //do the buy
  if(balance >= cost) {
    let remaining = balance - cost;
    let count = 0;
    try {
      await sql.run(`UPDATE money SET balance = ${remaining} WHERE userID = ${userID}`);
      let rows = await sql.all("SELECT * FROM skyscraper");
      for(let i = 0; i < rows.length; i++) {
        let row = rows[i];
        let total = row.height + row.progress;
        total = total * factor;
        let newHeight = Math.floor(total);
        let newProgress = total - newHeight;
        count += (newHeight != row.height) ? 1 : 0;
        let targetID = row.userID;
        await sql.run("UPDATE skyscraper SET height = ?, progress = ? WHERE userID = ?", [newHeight, newProgress, targetID]);
      }
    } catch(e) {
      console.error(e);
    }
    let s = (count != 1) ? "s" : "";
    let output = `You caused an earthquake that knocked the top off of ${count} skyscraper${s} and delayed everyone's building progress for \$${cost}.`;
    if(verbose) {
      output += `\n**${user.tag}** \$${balance} => \$${remaining}`;
    }
    return output;
  } else {
    let output = `You cannot afford to cause a magnitude ${magnitude} earthquake for \$${cost}.`;
    if(verbose) {
      output += `\n**${user.tag}** has \$${balance}.`;
    }
    return output;
  }
}
