# VSCodeCmder README

![status: active](https://img.shields.io/badge/status-active-green.svg)

VSCodeCmder adds some commands to make VSCode easier to use in a keyboard-only workflow

## Features

Navigate:

-   Provides a few basic commands to navigate around file system and select files/directory
-   Allows selecting of bookmarked files/directory
-   Allows selecting of recently used files/directory

![Navigate](/images/Navigate.png)

Jump to Path:

-   Allows user to type a path to open

![Jump to Path](/images/Jump_to_Path.png)

Set Root Path:

-   Sets the default root directory if workspace is not open

![Set Root](/images/Set_Root.png)

Bookmark:

-   Add:
    -   Adds a bookmark tagged to a name
-   Remove:
    -   Removes a bookmark tagged to a name
-   Clear:
    -   Clears all bookmarks

![Bookmarks](/images/Bookmarks.png)

Build C++ Project:

- Build:
    - Searches the workspace for C++ project files and runs build

By default, VSCodeCmder searches the system and user Path env, but this can be overwritten in settings

```
"codecmder.buildtool": {
    "msbuild": "C:\\Program Files (x86)\\Microsoft Visual Studio\\ ... \\MSBuild.exe", 
    "make" : "/bin/make"
    ... 
}
```

## Requirements

Recommended to also install [IBM.OutputColorizer](https://marketplace.visualstudio.com/items?itemName=IBM.output-colorizer)

## Extension Settings

No extension settings

## Known Issues

-   Jump to path does not accept environment variables
-   Output channel is not colored. While this can be fixed, it may make more sense to install [Output Colorizer](https://marketplace.visualstudio.com/items?itemName=IBM.output-colorizer)

Issues or requests are welcome on [Github](https://github.com/julwrites/VSCode_Explorer)

## Release Notes

What's New?

-   Added build functionality for Visual Studio projects and Makefiles
-   Added caching and file watching functionality to speed up build calls

## Contributing

Contributions are welcome at the [GitHub Repository](https://github.com/julwrites/VSCode_Explorer)

## License

This uses the [MIT License](https://github.com/julwrites/VSCode_Explorer/blob/master/LICENSE)
