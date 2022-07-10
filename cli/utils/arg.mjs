'use strict'
import yargs from 'yargs'
export default function (slice = 3, options) {
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
          key = (option?.alias).length > 1 ? option.alias?.slice(0, 1) : option.alias
          rec = rec.options(`${key}`, option)
        }
      }
    } else {
      if (!options.alias) {
        console.error('Options needs an alias')
      } else {
        key = (options?.alias).length > 1 ? options.alias?.slice(0, 1) : options.alias
        rec = rec.options(`${key}`, options)
      }
    }
    args = rec
  }
  return args
}
