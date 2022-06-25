#! /usr/bin/env node
import 'dotenv/config'
import fs from 'fs'
import crypto from 'crypto'
import readline from 'readline'
import Gun from 'gun'
import SEA from 'gun/sea.js'
import clipboardy from 'clipboardy'

let gun = new Gun({peers: ['https://relay.peer.ooo/gun', 'https://gunjs.herokuapp.com/gun']})
let pair = await SEA.pair()

let commands = `
Gunsafe commands:
  insert <record name>                - Insert or update a password record
  show                                - Print this session's most recent password object to the terminal
  list [ --deleted ]                  - List all password record names
                                        Use --deleted to also show previously deleted record names
  get [ --show ] <record name>        - Get a stored password record by name. Password is stored in the clipboard.
                                        Use --show to also show the password
  delete <record name>                - Delete a stored password by name
  clear                               - Clear the console and the last password object from memory
  quit                                - Exits Gunsafe
  ?                                   - Prints this help
`

if(process
  && process.env.GUNSAFE_PUB
  && process.env.GUNSAFE_EPUB
  && process.env.GUNSAFE_PRIV
  && process.env.GUNSAFE_EPRIV
) {
  pair = {
    pub: process.env.GUNSAFE_PUB || pair.pub,
    priv: process.env.GUNSAFE_PRIV || pair.priv,
    epub: process.env.GUNSAFE_EPUB || pair.epub,
    epriv: process.env.GUNSAFE_EPRIV || pair.epriv
  }
} 
else if(process) {
  fs.appendFile('./.env',
  "GUNSAFE_PUB=" + pair.pub + "\n" 
  + "GUNSAFE_EPUB=" + pair.epub + "\n" 
  + "GUNSAFE_PRIV=" + pair.priv + "\n"
  + "GUNSAFE_EPRIV=" + pair.epriv + "\n"
  , err => {
    if(err !== null)
    throw new Error(err)
  })
}

gun.user().auth(pair)

let password = {}

gun.on('auth', ack => {
  console.clear()

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  let question = () => rl.question('What would you like to do? > ', function (command) {
    command = command.split(' ')

    if(command[0] === '?'){
      console.log(commands)
      question()
    }
    else if(command[0] === 'clear'){
      password = {}
      console.clear()
      question()
    }
    else if(command[0] === 'insert'){
      console.clear()
      command.shift()
      
      let name = command.join(' ')
      create(name)
    }
    else if(command[0] === 'get'){
      if(command.length === 1 || command[1] === '') {
        console.log('Please specify a record to get. Type \'list\' to print all record names.\r\n')
        return question()
      }
      command.shift()
      let visible = false
      if(command.includes('--show')) {
        visible = true
        command.splice(command.indexOf('--show'), 1)
      }

      let name = command.join(' ')
      retrieve(name, visible)
    }
    else if(command[0] === 'show'){
      if(password.pass){
        console.log(password)
        question()
      }
      else{
        question()
      }
    }
    else if(command[0] === 'list'){
      let deleted = false
      if(command[1]==='--deleted') deleted = true
      list(deleted)
    }
    else if(command[0] === 'delete'){
      command.shift()
      if(command.length === 0) return question()
      let name = command.join(' ')
      del(name)
    }
    else if(command[0] === 'quit'){
      process.exit(1)
    }
    else {
      console.log(`Invalid command '${command}'. Type 'help' to see all commands.\n\r`)
      question()
    }
  })
  question()
  
  function create(title){
    let address = () => rl.question('What is the address? ', address => {
      password.address = address
      username()
    })

    let username = () => rl.question('What is the username? ', user => {
      password.username = user
      pwd()
    })

    let pwd = () => rl.question('Do you want to generate a new password [default=yes]? ', function (bool) {
      let pass = crypto.randomBytes(20).toString('base64')
      pass = pass.match(/.{1,10}/g).join('-');
      password.pass = pass
      if(['yes','Yes','YES','y','Y','true','True', 1].includes(bool)){
        notes()
      }
      else if(['no','No','NO','n','N','false','False', 0].includes(bool)){
        rl.question('Please enter the password: ', pass => {
          password.pass = pass
          notes()
        })
      } else {
        notes()
      }
    })

    let notes = () => rl.question('Enter any notes: ', notes => {
      password.notes = notes
      insert(password)
      question()
    })

    if(!title){
      rl.question('What is the password record name? ', function (name) {
        if(!name){
          console.log('Error: The password record must have a name.\r\n')
          nme()
        }
        if(typeof password !== 'object') password = {}
        password.name = name
        address()
      })
    } else {
      password.name = title
      address()
    }
  }
  
  rl.on('close', function () {
    process.exit(0)
  })

  async function insert(data){
    gun.user().get('gunsafe').get(data.name).once(async data => {
      if(data) {
        rl.question('Warning: you are about to overwrite an existing record! Are you sure you want to proceed? ', async bool => {
          if(['yes','Yes','YES','y','Y','true','True', 1].includes(bool)){
            let message = await SEA.encrypt(data, pair)
            gun.user().get('gunsafe').get(data.name).put(JSON.stringify(message))
            gun.user().get('gunsafe').get(data.name).off()
            return question()
          }
          else {
            gun.user().get('gunsafe').get(data.name).off()
            return question()
          }
        })
      }
    })
    let message = await SEA.encrypt(data, pair)
    gun.user().get('gunsafe').get(data.name).put(JSON.stringify(message))
    question()
  }
  
  async function retrieve(name, visible){
    let result = new Promise((resolve, reject)=>{
      gun.user().get('gunsafe').get(name).on(async data => {
        if(data === null) {
          resolve('The record for ' + name + ' was previously deleted.\n\r')
          return //question()
        }
        data = JSON.parse(data)
        let pw = await SEA.decrypt(data, pair)
        gun.user().get('gunsafe').get(data.name).off()
        resolve(pw)
      })
      setTimeout(()=>{
        resolve('Record not found. Type \'list\' to show all record names.\n\r')
    }, 50)
    })

    password = await result
    if(password.pass === undefined){
      console.log('Record not found.\r\n')
      password = {}
      return question()
    }
    clipboardy.writeSync(password.pass)
    if(typeof password != 'object') {
      console.log('Record not found.\n\r')
      password = {}
      return question()
    }
    console.log('\n\rName:', password.name)
    console.log('Address:', password.address)
    console.log('Username:', password.username)
    if(visible){
      console.log('Password:', password.pass)
    }
    console.log('Notes:', password.notes, '\n\r')
    console.log('Password saved to clipboard!\n\r')
    question()
  }

  async function list(deleted){
    let result = new Promise((resolve, reject)=>{
      gun.user().get('gunsafe').once(data => {
        if(data === undefined) {
          console.log('No records found.\r\n')
          return question()
        }
        let items = Object.keys(data)
        if(items[0] === '_') items.shift()
        resolve(items)
      })
    })
    result = await result
    console.log()
    let c = 0
    let items = []
    result.forEach(el => {
      gun.user().get('gunsafe').get(el).once(data => {
        if(data === null) items.push('[ deleted ] ' + el)
        else items.push(el)
      })
    })
    items.forEach(el => {
      if(deleted && el){
        console.log(el)
      } else if(!el.includes('deleted') && el){
        console.log(el)
      }
    })
    items.length = 0
    console.log()
    question()
  }

  async function del(name){

    gun.user().get('gunsafe').get(name).once(data => {
      if(!data){
        console.log(name, 'does not exist.\r\n')
        return question()
      } else {
        rl.question('Are you sure you want to delete this record? > ', answer => {
          if(['yes', 'Yes', 'y', 'Y', 'true', 'True', 1].includes(answer)){
            gun.user().get('gunsafe').get(name).put(null)
            console.log(name, 'has been deleted.')
            question()
          }
          else question()
        })
      }
    })
  }
})