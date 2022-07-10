import yargs, { Argv } from 'yargs'
import { checkIfThis } from './check.mjs'
/**
 *
 * @param slice - The slice of the command line to parse
 * @param options - The options to use when parsing the command line - see yargs types for more information
 * @returns Argv - arv<hashed arguments>
 */
export default function <ArgumentType>(slice = 3, options?: yargs.Options | yargs.Options[]): Argv<ArgumentType> {
  let args = yargs(process.argv.slice(slice))
  if (options) {
    let rec = args,
      key
    if (Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        let option = options[i]
        if (!option.alias) {
          console.error('Option needs an alias')
        } else {
          key = (option?.alias as string).length > 1 ? option.alias?.slice(0, 1) : option.alias
          rec = rec.options(`${key}`, option)
        }
      }
    } else {
      if (!options.alias) {
        console.error('Options needs an alias')
      } else {
        key = (options?.alias as string).length > 1 ? options.alias?.slice(0, 1) : options.alias
        rec = rec.options(`${key}`, options)
      }
    }
    args = rec
  }

  return args as Argv<ArgumentType>
}
