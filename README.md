# Gunsafe
## A CLI password manager utility for Node, built on [Gun DB](https://github.com/amark/gun)

Gun DB is a decentralized graph database. Passwords are encrypted with Gun's SEA security library, then stored in the database's user space, which means the records can only be read and altered by the signed in user.

Gunsafe currently stores the SEA encryption keys as environment variables in `.env`.

## Install
```js
npm i gunsafe -g
```
## Usage
```js
> gunsafe
What would you like to do? >
```

## Gunsafe Commands
### `insert <record name>`
Begins the password insert wizard.

### `get <record name> [--show]`
Gets a password record by its name and save the password to the clipboard. Optionally pass `--show` to show the password in the returned results.

### `show`
Shows the most recent password record object.

### `delete <record name>`
Deletes the record. Deleted records retain a placeholder in Gun DB with its name, and can be listed with `list --deleted`.

### `list [--deleted]`
Lists the names of stored password records. Optionally pass `--deleted` to also list previously deleted password names.

### `pair`
Enters pairing mode to synchronize Gunsafe data across devices.

### `clear`
Clears the terminal and removes the most recent password record object from memory.

### `quit`
Exits Gunsafe

### `?`
Prints Gunsafe help to the terminal