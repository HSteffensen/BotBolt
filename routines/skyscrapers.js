exports.run = async (client, config, sql) => {
  let running = true;
  while(running) {
    //sleep until next hour
    let hourAway = (3600 * 1000) - Date.now() % (3600 * 1000);
    //let hourAway = 60 * 1000; //only for testing
    await sleep(hourAway);

    try {
      let rows = await sql.all("SELECT * FROM skyscraper");
      let foundSelf = false; //must always have at least one worker!
      for(let i = 0; i < rows.length; i++) {
        let row = rows[i];
        let targetID = row.userID;
        if(targetID == client.user.id) {
          foundSelf = true;
          if(row.workers < 1) {
            await sql.run("UPDATE skyscraper SET workers = ? WHERE userID = ?", [1, targetID]);
            row.workers = 1;
          }
        }
        let built = Math.sqrt(row.workers) / 100;
        let newStrike = 0;
        if(row.strike > 0) {
          newStrike = row.strike - 1;
          built = 0;
        }
        let newProgress = row.progress + built;
        let newHeight = row.height;
        if(newProgress >= 1) {
          newHeight += 1;
          newProgress -= 1;
        }
        await sql.run("UPDATE skyscraper SET height = ?, progress = ?, strike = ? WHERE userID = ?", [newHeight, newProgress, newStrike, targetID]);
      }
      if(!foundSelf) {
        await sql.run("INSERT INTO skyscraper (userID, workers, height, progress, strike) VALUES (?, ?, ?, ?, ?)", [client.user.id, 1, 0, 0.0, 0]);
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table skyscraper");
        await sql.run("CREATE TABLE IF NOT EXISTS skyscraper (userID TEXT, workers INTEGER, height INTEGER, progress FLOAT, strike INTEGER)");
      }
    }
  }
};

// From http://stackoverflow.com/a/39914235
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
