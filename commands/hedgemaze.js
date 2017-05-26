exports.run = async (client, message, command, config, sql, shortcut, noncommandData) => {
  let fs = require("fs");
  let args = command.args;

  let size = (args.length == 0 || isNaN(parseInt(args[0]))) ? 5 : parseInt(args[0]);
  if(size < 2 || size > 10) {
    message.reply("size must be between 2 and 10");
  }
  let looping = 0.2;
  let monsters = 0;
  let monsterIntelligence = 0;
  let reward = 0;
  let print = true;

  let maze = {
    size: size,
    looping: looping,
    monsters: monsters,
    monsterIntelligence: monsterIntelligence,
    reward: reward,
    location: [],
    entrance: [],
    exit: [],
    world: [[]]
  };
  generateMaze(maze);

  let mazeFilename = `data/dataMaze_${message.author.id}.json`;
  fs.open(mazeFilename, "w", (err, fd) => {
    if (err) console.error(err);
    fs.writeFile(mazeFilename, JSON.stringify(maze), (err) => {
      if (err) console.error(err);
      fs.close(fd, (err) => {
        if (err){
          console.log(err);
        }
      });
    });
  });

  if(print) {
    let permitted = false;
    for(let i = 0, len = config.ownerIDs.length; i < len; i++) {
      let owner = config.ownerIDs[i];
      if(owner == message.author.id) {
        permitted = true;
        break;
      }
    }
    if(permitted) {
      let output = printout(maze);
      return message.channel.send(output);
    }
  }
};

exports.noncommand = async (client, message, command, config, sql, noncommandData) => {
  //read in json
  let fs = require("fs");
  let data = JSON.parse(fs.readFileSync(`../data/dataMaze_${message.author.id}.json`, "utf8"));

  //do stuff

  reportStatus(message, command, config, data);
};

async function reportStatus (message, command, config, data) {
  let description = "";
  if(data.verbosity == 1) {
    message.channel.send("", {embed: {
      color: config.color,
      description: description
    }});
  } else if(data.verbosity == 2) {
    message.channel.send("", {embed: {
      color: config.color,
      description: description
    }});
  }
}

function getChoices(maze, location) {
  return Object.keys(maze.world[location[0]][location[1]]);
}

function generateMaze(maze) {
  console.log("generating maze");
  let set = new DisjointSet2d(maze.size);
  let walls = [];
  let loopAmount = maze.looping * (maze.size * maze.size + 1);
  let loops = Math.round(loopAmount);


  //fill maze world with empty objects
  for(let i = 0; i < maze.size; i++) {
    maze.world[i] = [];
    for(let j = 0; j < maze.size; j++) {
      maze.world[i][j] = {};
    }
  }

  //create a list of all walls
  for(let i = 0; i < maze.size; i++) {
    for(let j = 0; j < maze.size; j++) {
      //only add walls to the north and east to avoid doubling
      walls.push([[i, j], [(i+1)%maze.size, j], "east", "west"]);
      walls.push([[i, j], [i, (j+1)%maze.size], "north", "south"]);
    }
  }

  while(!set.united() || loops > 0) {
    //choose a random wall;
    let wallID = Math.floor(Math.random() * walls.length);
    let wall = walls[wallID];
    let pos1 = wall[0];
    let pos2 = wall[1];
    let connected = set.connected(pos1, pos2);
    if(!connected || loops > 0) {
      let direction1to2 = wall[2];
      let direction2to1 = wall[3];
      maze.world[pos1[0]][pos1[1]][direction1to2] = pos2;
      maze.world[pos2[0]][pos2[1]][direction2to1] = pos1;
      if(connected) {
        loops--;
      } else {
        set.join(pos1, pos2);
      }
    }
    walls.splice(wallID, 1);
  }

  //choose a dead end to be the start, then let the farthest spot be the exit
  let deadends = findDeadEnds(maze);
  maze.entrance = deadends[0];
  //maze.entrance = [0, 0];
  maze.location = maze.entrance;
  let farthestSpaces = findFarthestSpaces(maze, maze.entrance);
  console.log(farthestSpaces);
  maze.exit = farthestSpaces[0];
  //give the exit location the option to exit
  maze.world[maze.exit[0]][maze.exit[1]]["exit"] = true;

}

//returns list of dead ends
function findDeadEnds(maze) {
  let output = [];
  let visited = [[]];
  for(let i = 0; i < maze.size; i++) {
    visited[i] = [];
    for(let j = 0; j < maze.size; j++) {
      visited[i][j] = false;
    }
  }

  visited[0][0] = true;
  let queue = [[0, 0]];

  while(queue.length > 0) {
    let [x, y] = queue.shift(); //cut off the front of the list
    let optionsList = Object.keys(maze.world[x][y]);
    if(optionsList.length == 1) {
      output.push([x, y]);
    }
    let newLocations = optionsList.map((item) => {
      return maze.world[x][y][item];
    });
    for(let i = 0; i < newLocations.length; i++) {
      let [a, b] = newLocations[i];
      if(!visited[a][b]) {
        visited[a][b] = true;
        queue.push([a, b]);
      }
    }
  }

  return output;
}

function findFarthestSpaces(maze, location) {
  let maxDistance = 0;
  let visited = [[]];
  for(let i = 0; i < maze.size; i++) {
    visited[i] = [];
    for(let j = 0; j < maze.size; j++) {
      visited[i][j] = 0;
    }
  }

  visited[location[0]][location[1]] = 0;
  let queue = [[location[0], location[1], 0]];

  while(queue.length > 0) {
    let [x, y, distance] = queue.shift(); //cut off the front of the list
    maxDistance = (distance > maxDistance) ? distance : maxDistance;
    let optionsList = Object.keys(maze.world[x][y]);
    let newLocations = optionsList.map((item) => {
      return maze.world[x][y][item];
    });
    for(let i = 0; i < newLocations.length; i++) {
      let [a, b] = newLocations[i];
      if(!visited[a][b]) {
        visited[a][b] = distance + 1;
        queue.push([a, b, distance + 1]);
      }
    }
  }

  //get list of all locations with the max distance
  let output = [];
  for(let i = 0; i < maze.size; i++) {
    for(let j = 0; j < maze.size; j++) {
      if(visited[i][j] == maxDistance) {
        output.push([i, j]);
      }
    }
  }
  return output;
}

class DisjointSet2d {
  constructor(size) {
    this.size = size;
    this.list = [];
    for(let i = 0; i < this.size * this.size; i++) {
      this.list[i] = i;
    } //start with each position pointing to itself because they begin disjointed
  }

  //convert 2d location to 1d array index
  convert(input) {
    if(input instanceof Array) {
      return this.size * input[0] + input[1];
    } else {
      return [Math.floor(input / this.size), input % this.size];
    }
  }

  //input only integer
  //return parent of index
  //because this.list[i] is the parent of i
  parentOf(index) {
    return this.list[index];
  }

  //input only array
  //finds the root of the group tree
  findGroup(input) {
    let index = input;
    if(input instanceof Array) {
      index = this.convert(input);
    }
    let parent = this.parentOf(index);
    while(index != parent) {
      index = parent;
      parent = this.parentOf(index);
    }
    return parent;
  }

  //input only arrays
  //returns true if both positions are in the group tree
  connected(pos1, pos2) {
    let group1 = this.findGroup(pos1);
    let group2 = this.findGroup(pos2);
    return (group1 == group2);
  }

  //input only arrays
  //joins the two groups by setting the parent of one group to the other
  join(pos1, pos2) {
    let group1 = this.findGroup(pos1);
    let group2 = this.findGroup(pos2);
    this.list[group2] = group1;
  }

  //returns true if all members of the set are in the same group
  united() {
    let group = this.findGroup(0);
    for(let i = 1; i < this.size * this.size; i++) {
      if(this.findGroup(i) != group) {
        return false;
      }
    }
    return true;
  }
}

function printout(maze) {
  let output = ["```"];
  for(let j = maze.size - 1; j >= 0; j--) {
    let row1 = (maze.size - j) * 2 - 1;
    let row2 = (maze.size - j) * 2;
    //let row3 = (maze.size - j) * 3;
    output[row1] = "";
    output[row2] = "";
    //output[row3] = "";
    for(let i = 0; i < maze.size; i++) {
      output[row1] += " ";
      output[row1] += (maze.world[i][j].hasOwnProperty("north")) ? "|" : " ";
      output[row1] += " ";
      output[row2] += (maze.world[i][j].hasOwnProperty("west")) ? "-" : " ";
      if(maze.entrance[0] == i && maze.entrance[1] == j) {
        output[row2] += "I"; //In
      } else if (maze.exit[0] == i && maze.exit[1] == j) {
        output[row2] += "O"; //Out
      } else if(maze.location[0] == i && maze.location[1] == j) {
        output[row2] += "X"; //current location
      } else {
        output[row2] += "#";
      }
      output[row2] += (maze.world[i][j].hasOwnProperty("east")) ? "-" : " ";
      //output[row3] += " ";
      //output[row3] += (maze.world[i][j].hasOwnProperty("south")) ? " " : "|";
      //output[row3] += " ";
    }
  }
  output.push("\n```");
  return output.join("\n");
}
