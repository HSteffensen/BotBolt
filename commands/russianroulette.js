exports.run = async (client, message, command, config, sql, shortcut, cacheData) => {
  let args = command.args;
  let data = cacheData.russiaData;
  let description = "";

  if(data.active) { //join game
    if(data.joinable) { //if it can be joined
      let alreadyIn = data.players.find((item) => { //if the player is not yet in the game
        return item.id == message.author.id;
      });
      if(alreadyIn == undefined) {
        let amount = data.bet;
        let validBet = true;
        /*
        if(args.length == 1) { //if they bet another amount
          amount = parseInt(args[0]);
          if(isNaN(amount) || amount < 0) {
            validBet = false;
            description = "Give a bet amount: `!russianroulette 10`";
          }
        }
        */
        if(validBet) {
          let canAfford = await makeBet(sql, message.author.id, amount);
          if(canAfford) {
            data.players.push({
              id: message.author.id,
              tag: message.author.tag,
              bet: amount
            });
            description = `**${message.author.tag}** has joined Russian roulette.`;
          } else {
            description = "You cannot afford the bet.";
          }
        }
      } else if(message.author.id == data.players[0].id && args[0] === "start") {
        data.joinable = false;
        description = "The host has started the game early.";
      } else {
        description = "You are already in this game.";
      }
    } else {
      description = "This game cannot be joined.";
    }
  } else { //make game
    if(args.length == 1) {
      let amount = parseInt(args[0]);
      if(!isNaN(amount) && amount >= 0) {
        let canAfford = await makeBet(sql, message.author.id, amount);
        if(canAfford) {
          data.players = [{
            id: message.author.id,
            tag: message.author.tag,
            bet: amount
          }];
          data.bet = amount;
          data.active = true;
          data.joinable = true;
          description = `**${message.author.tag}** has started a game of Russian roulette with a default bet of \$${amount}.`;
          description += "\nType \"!ru\" to join. The game will begin in 60 seconds.";
          runGame(client, message, config, sql, cacheData);
        } else {
          description = "You cannot afford that bet.";
        }
      } else {
        description = "Give a bet amount: `!russianroulette 10`";
      }
    } else {
      description = "Give a bet amount: `!russianroulette 10`";
    }
  }

  message.channel.send("", {embed: {
    color: config.color,
    description: description
  }});
};

async function runGame(client, message, config, sql, cacheData) {
  let data = cacheData.russiaData;
  await busywait(60 * 1000, data, (a) => {
    return a.joinable == false;
  });
  data.joinable = false;

  if(data.players.length < 2) {
    message.channel.send("", {embed: {
      color: config.color,
      description: "Russian roulette error: not enough players. Game canceled."
    }});
    await returnBets(sql, data);
    resetGame(cacheData);
    return;
  }
  if(data.bet / (data.players.length - 1) < 1 && data.bet != 0) {
    message.channel.send("", {embed: {
      color: config.color,
      description: "Russian roulette error: bet too low for this amount of players. Game canceled."
    }});
    await returnBets(sql, data);
    resetGame(cacheData);
    return;
  }
  let description = "The game of Russian roulette begins!\n";

  let outputMessage = await message.channel.send("", {embed: {
    color: config.color,
    description: description
  }});

  //choose loser
  let killedRandom = Math.random();
  let killed = Math.floor(data.players.length * killedRandom);

  try {
    for(let i = 0; i <= killed; i++) {
      await sleep(500);
      let player = data.players[i];
      description += `\n**${player.tag}**'s turn`;
      await outputMessage.edit("", {embed: {
        color: config.color,
        description: description
      }});
      for(let j = 0; j < 3; j++) {
        description += ".";
        await outputMessage.edit("", {embed: {
          color: config.color,
          description: description
        }});
        await sleep(500);
      }
      description += (i == killed) ? " __**BANG!**__" : " *click*";
      await outputMessage.edit("", {embed: {
        color: config.color,
        description: description
      }});
    }

    let loser = data.players[killed];
    description += `\n\n**${loser.tag}** died!`;
    if(data.bet > 0) {
      description += " The rest of you can split their bet.";
    }
    outputMessage.edit("", {embed: {
      color: config.color,
      description: description
    }});

    await distributeWinnings(sql, data, killed);
  } catch(e) {
    console.error(e);
  }

  resetGame(cacheData);
}

function resetGame(cacheData) {
  cacheData.russiaData = {
    active: false,
    joinable: false,
    players: []
  };
}

async function distributeWinnings(sql, data, killed) {
  let winners = data.players.length - 1;
  let winnings = Math.floor(data.bet / winners);
  let leftover = data.bet % winners;

  for(let i = 0; i < data.players.length; i++) {
    if(i == killed) {
      continue;
    }
    let userID = data.players[i].id;
    let amount = data.bet + winnings;
    if(leftover > 0) {
      amount ++;
      leftover--;
    }
    try {
      let row = await sql.get(`SELECT * FROM money WHERE userID ="${userID}"`);
      if(!row) {
        await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, amount]);
      } else {
        let result = row.balance + amount;
        await sql.run(`UPDATE money SET balance = ${result} WHERE userID = ${userID}`);
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table money");
        await sql.run("CREATE TABLE IF NOT EXISTS money (userID TEXT, balance INTEGER)");
        await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, amount]);
      }
    }
  }
}

async function returnBets(sql, data) {
  for(let i = 0; i < data.players.length; i++) {
    let userID = data.players[i].id;
    let amount = data.players[i].bet;
    try {
      let row = await sql.get(`SELECT * FROM money WHERE userID ="${userID}"`);
      if(!row) {
        await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, amount]);
      } else {
        let result = row.balance + amount;
        await sql.run(`UPDATE money SET balance = ${result} WHERE userID = ${userID}`);
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table money");
        await sql.run("CREATE TABLE IF NOT EXISTS money (userID TEXT, balance INTEGER)");
        await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, amount]);
      }
    }
  }
}

async function makeBet(sql, userID, amount) {
  try {
    let row = await sql.get(`SELECT * FROM money WHERE userID ="${userID}"`);
    if(!row) {
      await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, 0]);
      return (amount == 0);
    } else {
      let result = row.balance - amount;
      if(result >= 0) {
        await sql.run(`UPDATE money SET balance = ${result} WHERE userID = ${userID}`);
        return true;
      } else {
        return false;
      }
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table money");
      await sql.run("CREATE TABLE IF NOT EXISTS money (userID TEXT, balance INTEGER)");
      await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [userID, 0]);
    }
  }
}

//waits up to limit ms for test to become true
async function busywait(limit, a, test) {
  let total = 0;
  let loop = !test(a);
  while(total < limit && loop) {
    await sleep(100);
    total += 100;
    loop = !test(a);
  }
  return !loop;
}

// From http://stackoverflow.com/a/39914235
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
