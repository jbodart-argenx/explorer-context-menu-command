# explorer-context-menu-command

A simple **VS Code extension** [published on marketplace](https://marketplace.visualstudio.com/items?itemName=etienne-dldc.explorer-context-menu-command) that allows running commands from context menu in explorer view.

## Github Repository
The source code is available at https://github.com/etienne-dldc-graveyard/explorer-context-menu-command.
This is a great starting point to learn about creating VS Code extensions.

In particular it demonstrates:
  * the implementation of **context menus** in explorer view
  * the implementation of **user-configurable settings** (i.e. an array of available commands)
    * declared in [package.json](./package.json)
  

## Extension Settings

This extension contributes the following settings:  
`explorercontextmenu.commands` : An array of available commands.  
 - If no commands are provided, a **text prompt** is displayed.
 - If only one command is porvided, the command is executed directly.
 - If more than one commands are provided, a **select** is displayed.
