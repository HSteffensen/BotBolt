# Bestgirl
Nominate and vote for girls to decide who is best. Girls have a name, description, and image.  

See the best girl:  
`!bestgirl`

See a girl's profile:  
`!bestgirl <name>`

See the leaderboard:  
`!bestgirl lb`  
Optionally add a page number. Pages are 10 girls each.

Vote for a girl:  
`!bestgirl vote <name>`

Nominate a girl: see the bottom of the page for more information  
Nomination costs a lot of money. The Nth nomination costs $N*100.  
`!bestgirl nominate <name>: <description> <image URL>`  

Edit a girl you have nominated:  
Editing costs $10.  
`!bestgirl edit <field> <name>: <input>` - where `<field>` is either `description` or `image`, and `<input>` is valid for the field.  

Remove a girl you have nominated:  
`!bestgirl remove <name>`

Reset your vote:  
`!bestgirl reset`

Buy more votes:  
Everyone starts with 1 vote, and this command will buy 0.1 more vote. It is very expensive.  
`!bestgirl buyvote`

## Note on inputs
### Name
Names can be anything. In nomination and editing, the name **must** be followed by a `:` or the bot won't know where the name ends.

### Description
Descriptions can be anything. In nomination, the description is everything following the `:` and before the final URL.

Newline characters, default emoji, etc. are allowed in descriptions. Regular Discord markdown will work, as will `[embedded links with this format](https://google.com)` [embedded links with this format](https://google.com).

### Image
Images must be valid URLs. In nomination, the image **must** be the last word of the input.

It is possible that the URL validation used to check inputs disagrees with what Discord considers a valid URL. I have not run into any problems yet, and it is unlikely that any problems will ever happen, but if it happens just re-upload the image to imgur or something.

### Example
`!bestgirl nominate Kanna Kamui: **Don't** lewd the dragon loli. http://pm1.narvii.com/6366/2c35594538206f7f598be792bf203b6b638e9c07_hq.jpg`

`!bestgirl edit description Kanna Kamui: Seriously, do **NOT** lewd the dragon loli`
