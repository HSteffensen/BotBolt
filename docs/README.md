# Special
### Help
Points [here](https://github.com/HSteffensen/BotBolt/wiki/Help).  
`!help`

### Alias
Give an alias to a set of commands.

Add an alias: say the new name and the commands in quotes.  
`!alias $example "!echo a; !wait 1; !echo b"`

Remove an alias: say the name only.  
`!alias $example`

Reload defaults: reloaddefaults.  
Reloads the defaults set in /data/aliasDefaults.json  
`!alias reloaddefaults`


### Cooldown
Give cooldowns to commands, in seconds. Do not put !cooldown on cooldown. Bot owner only.

Set cooldown: give a number.  
Sets the cooldown in seconds.  
`!cooldown !echo 10`

Set punishment: say punishment and a number.  
When a user hits a cooldown, their cooldown will have more seconds added if there is a punishment.  
`!cooldown !echo punishment 5`

Remove cooldown: remove.  
Removes the cooldown configuration entirely.  
`!cooldown !echo remove`

Set verbosity: give none, low, high, default.  
Higher verbosity gives more feedback when a user hits a cooldown.  
`!cooldown !echo verbosity high`

Reload defaults: reloaddefaults.  
Reloads the defaults set in /data/cooldownDefaults.json  
`!cooldown reloaddefaults`

### Echo
Make the bot repeat you.  
`!echo Repeat after me!`

### Ping
Make sure the bot ain't dead. Not actually useful.  
`!ping`

### Reload
Reload an edited command or routine file. Bot owner only.

Reload command file /commands/(name).js: say the name.  
`!reload echo`

Reload routine file /routines/(name).js: say routine and the name.  
`!reload routine moneypile`

### Restriction
Restrict a command to specific channels. Bot owner only.

Set restriction: give the command and the channels to restrict to  
You can list more than one channel. Re-doing the restriction will reset entirely to the new list of channels, forgetting the old restriction.  
`!restriction !echo #general`

Remove restriction: give the command and say remove  
`!restriction !echo remove`

Check restriction: give the command only  
`!restriction !echo`

### Setgame
Set the bot's "playing" message. Leave blank to remove. Bot owner only.  
`!setgame whatever`

### Wait
Wait some seconds. Only useful in command chains or aliases.  
`!wait 10`  
`!echo a; !wait 10; !echo b`

# Money
### Money
Check users' money.

Check your own money  
`!money`

Check others' money: list any amount of people  
`!money @BotBolt @Someone @ThirdPerson`

### Moneydrop
Set whether money drops randomly in the channel. Bot owner only.  
Money drops will be triggered by messages in the channel. They have a probability of happening and a range of possible drop values. `!moneydrop` and `!moneygrab` commands will not trigger drops.

Check configuration:  
`!moneydrop`

Enable/disable:  
`!moneydrop enable`

Set values: give a value name and value  
options: verbosity, pileSize, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability  
verbosity options: none, low, high  
`!moneydrop set firstMin 1`  
`!moneydrop set firstProbability 0.02`  
`!moneydrop set verbosity low`  

Clear configuration: clear.  
`!moneydrop clear`

### Moneygrab
Grab money in the channel's pile. You won't get all of it. Default cooldown of 1 hour.  
`!grab`

### Givemoney
Give money to another user.  
`!givemoney 10 @BotBolt`

### Addmoney
Add money to a user's balance. Bot owner only.  
`!addmoney 10 @BotBolt`

### Takemoney
Take money from a user's balance. Bot owner only.  
`!takemoney 10 @BotBolt`

# Games
### Hedgemaze
Enter a hedgemaze. Find the exit to escape. You can only see the immediate paths you can take. Recommend solving the maze in a DM session with the bot to reduce spam.

Begin a maze, or remind your options if you are already in one:  
`!maze`

Set the size of the maze: give a number  
The maze will be a square with the given side length. Default is 5.  
`!maze 5`

Abandon the maze: abandon.  
`!maze abandon`

Move in the maze: say a direction if the bot says you can go that way  
`north`

### Skyscraper
Hire workers and build the highest skyscraper. Sabotage other peoples' work if theirs is taller than yours.

Check skyscraper height: leave blank to see your own, or mention someone else to see theirs.  
`!skyscraper`  
`!skyscraper @BotBolt`

See the leaderboard: say leaderboard or lb, optionally add a page number  
Pages are up to 10 listings.  
`!skyscraper leaderboard` to show the top 10  
`!skyscraper lb 2` to show #11-20

Hire workers: say hire and a number  
Each worker costs $1 more than the last.  
`!skyscraper hire 1`

Sabotage an enemy: say sabotage and mention them  
Sabotage takes out 10% of their workers and costs as much as their most expensive worker.  
`!skyscraper sabotage @BotBolt`

Get an enemy's workers to strike: say strike, a number of hours, and mention them  
Strike halves their building speed. Costs as much as your most expensive worker, but each extra hour costs $1 more than the last.  
`!skyscraper strike 1 @BotBolt`

Cause an earthquake: say earthquake and the magnitude  
Magnitude 1 costs $1, and each magnitude up costs 2x as much. Everyone's buildings will be damaged proportional to their height, including your own.  
`!skyscraper earthquake 1`
