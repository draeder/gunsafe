import { $, question, YAML, chalk } from "zx";
import { io } from "fsxx";
import "zx/globals";
import yargs from "yargs";
$.verbose = false;
let pkg = await io.json`package.json`;
let args = yargs(process.argv.slice(3)).argv;
console.log(chalk.green(JSON.stringify(args, null, 2)));