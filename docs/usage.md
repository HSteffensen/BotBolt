## Input types
### Commands
Commands are single words beginning with the command character, "!" by default.  
`!echo hello`  

Commands can be chained with ";".  
`!echo hello; !echo goodbye`  

This can also be used to separate other parts of the message from the command as a comment.  
`!echo hello; This will cause the bot to say "hello".`  

### Aliases
Aliases are set with the !alias command. They are single words beginning with the alias character, "$" by default.    
`!alias $hello "!echo hello"`  

Aliases can contain chained commands, including the !wait command.  
`!alias $example "!echo This is an example alias.;!wait 1;!echo Example finished."`  

Aliases cannot currently contain aliases.  

### Non-commands
Non-commands are inputs given by other commands, such as hedgemaze. Hedgemaze will tell you you can go north by typing "north", etc.

### Shortcuts
Shortcuts for commands. They are set in /shortcut.json  
E.g. `!$` is a shortcut for `!money`

## Input parameters
### Note: a command cannot be verbose and silent at the same time.
### Verbose: -v
Adding `-v` following the command name will cause some commands to give more information in their output. The command will run normally regardless of whether -v affects its output.  
`!givemoney -v 10 @BotBolt`

### Silent: -s
Adding `-s` following the command name will cause some commands to suppress their output. The command will run normally regardless of whether -s affects its output.  
`!givemoney -s 10 @BotBolt`

### Parameters and aliases
Aliases can themselves be run silently to suppress the alias expansion message.  
Commands within aliases can be run verbosely or silently by setting them with -v or -s in the alias definition. Adding -v or -s to an alias will not change the verbose or silent property of the commands within it.
