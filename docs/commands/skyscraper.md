# Skyscraper
Hire workers and build the highest skyscraper. Sabotage other peoples' work if theirs is taller than yours. Each "tick" is currently every 30 minutes, where the build progress is updated.

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

Get an enemy's workers to strike: say strike, a number of ticks, and mention them  
Strike halves their building speed. Costs as much as the average of your most expensive worker and theirs, but each extra tick costs $1 more than the last.  
`!skyscraper strike 1 @BotBolt`

Cause an earthquake: say earthquake and the magnitude  
Everyone's buildings will be damaged proportional to their height, including your own. Magnitude 1 costs $10 and knocks off 1% of every building. Magnitude 2 will have the same cost and effect as if you did magnitude 1 twice, with doubled price and compounded effect. Magnitude 10 will have the same cost and effect as if you did magnitude 1 512 times.  
`!skyscraper earthquake 1`
