# js-deobf - JavaScript Deobfuscator

⚠️ This project is mainly an experiment and shouldn't be relied upon.

## Motivation and goals

Most JavaScript deobfuscator out there use either Regex or basic AST changes.
When I was looking for a deobfuscator to reverse Control Flow Flattening (from [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator)), I found no tool to do it automatically.
However, I stumbled upon [shift-refactor](https://github.com/jsoverson/shift-refactor/) and decided it would be a good base to make a custom deobfuscator, hence this project.

This deobfuscator does not attempt to reverse everything from javascript-obfuscator but definitely helps making the code more readable.

## Usage

Since some deobfuscation methods depend on [vm2](https://github.com/patriksimek/vm2), js-deobf cannot be integrated in the browser. It is however available as a CLI.

### Directly from sources

```sh
# install node modules
yarn

# deobfuscate 'input.js'
yarn ts-node src/index.ts input.js

# deobfuscate 'input.js' and write output to 'readable.js'
yarn ts-node src/index.ts input.js -o readable.js

# deobfuscate 'input.js' but ignore 'member_abuse' and 'order_switch' reverse methods
yarn ts-node src/index.ts input.js --ignore member_abuse order_switch
```
