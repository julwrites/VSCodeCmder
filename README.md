# VSCodeCmder

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

Bookmark:

-   Add:
    -   Adds a bookmark tagged to a name
-   Remove:
    -   Removes a bookmark tagged to a name
-   Clear:
    -   Clears all bookmarks

![bookmarks](/images/Bookmarks.png)

Build C++ Project:

- Build:
    - Searches the workspace for C++ project files and runs build

![cppbuild_command](/images/CppBuild_Command.png)
![cppbuild_status](/images/CppBuild_StatusBar.png)
![cppbuild_output](/images/CppBuild_Output.png)

By default, VSCodeCmder searches the system and user Path env, but this can be overwritten in settings

```
"codecmder.buildTools": {
    "msbuild": "C:\\Program Files (x86)\\Microsoft Visual Studio\\ ... \\MSBuild.exe", 
    "make" : "/bin/make"
    ... 
}
```

Similarly, ignore patterns can be specified much like in .gitignore 

```
"codecmder.ignore": [
    "CmakeFiles", 
    "*.vcxproj.filters",
    ...
]
```

Run Command:

- Run Command:
    - Runs a command from a list of commands, giving options for cwd and parameters

Similar to C++ Build, the output from the command is listed in VSCodeCmder output channel
![command_output](/images/Command_Output.png)

Commands can be specified in settings

```
"codecmder.commands": {
    "list": "dir",
    ...
}
```

## Requirements

Recommended to also install [IBM.OutputColorizer](https://marketplace.visualstudio.com/items?itemName=IBM.output-colorizer)

On MacOS, XCode Command Line Tools must be available to build XCode projects

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
-   Added ignore and de-duplication functionality to present cleaner output

## Contributing

Contributions are welcome at the [GitHub Repository](https://github.com/julwrites/VSCode_Explorer)

## License

This uses the [MIT License](https://github.com/julwrites/VSCode_Explorer/blob/master/LICENSE)
