#! /usr/bin/env node
import 'dotenv/config'
import fs from 'fs'
import crypto from 'crypto'
import readline from 'readline'
import Gun from 'gun'
import SEA from 'gun/sea.js'
import clipboardy from 'clipboardy'
import totp from 'totp-generator'
import base32 from 'hi-base32'

let help = `
Gunsafe commands:
  insert <record name>                - Insert or update a password record
  show                                - Print this session's most recent password object to the terminal
  list [ --deleted, --hidden ]        - List all password record names
                                        Use --deleted to also show previously deleted record names
                                        Use --hidden to also show Gunsafe hidden records
  get <record name> [ --show ]        - Get a stored password record by name. Password is stored in the clipboard.
                                        Use --show to also show the password
  delete <record name>                - Delete a stored password by name
  clear                               - Clear the console and the last password object from memory
  quit                                - Exit Gunsafe
  ?                                   - Print this help
`

let gun = new Gun()//{peers: ['https://relay.peer.ooo/gun', 'https://gunjs.herokuapp.com/gun']})
let pair = await SEA.pair()
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
  if(!pair) pair = await SEA.pair()
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
init(pair)

async function init(pair){
  gun.user().leave()
  gun.user().auth(pair)
}

gun.on('auth', ack => {
  console.log('Authenticated')
  main()
})

let password = {}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function main(){
  console.clear()

  let obj = {
    name: 'gunsafe',
    address: '',
    username: '',
    pass: pair,
    notes: 'This is your Gunsafe SEA pair. Do not share this with anyone!'
  }

  let message = await SEA.encrypt(JSON.stringify(obj), pair)
  gun.user().get('gunsafe').get('*gunsafe').put(JSON.stringify(message))

  let question = () => rl.question('What would you like to do? > ', async function (command) {
    command = command.split(' ')

    if(command[0] === '?'){
      console.log(help)
      question()
    }
    else if(command[0] === 'new'){
      init(pair)
      question()
    }
    else if (command[0] === 'pair'){
      console.log('Gunsafe key:', pair.epub)
      rl.question('Are you the connection target? > ', async answer => {
        let token
        if(answer === 'yes'){
          let secret = base32.encode(pair.epub)
          token = totp(secret, {
            digits: 8,
            period: 30,
          })
          console.log(token)
          let message = await SEA.encrypt(pair, token)
          gun.get('gunsafe').get(pair.epub).put(message)

          const interval = setInterval(async () => {
            let secret = base32.encode(pair.epub)
            token = totp(secret, {
              digits: 8,
              period: 30,
            })
            let sec = new Date().getSeconds()
            if (sec === 0 || sec === 30) {
              console.log(token)
              let message = await SEA.encrypt(pair, token)
              gun.get('gunsafe').get(pair.epub).put(message)
            }
          }, 1000)
          gun.user().get('gunsafe').get('*gunsafe_connected').on(data => {
            if(data === true) {
              clearInterval(interval)
              console.log('Syncronized another device!\r\n')
              gun.user().get('gunsafe').get('*gunsafe_connected').put(null)
              question()
            }
          })
        }
        if(answer === 'no'){
          rl.question('What is the connection key? > ', key => {
            rl.question('What is the current token? > ', token => {
              gun.get('gunsafe').get(key).on(async data => {
                let message = await SEA.decrypt(data, token)
                gun.get('gunsafe').get(key).off()
                gun.user().get('gunsafe').get('*gunsafe_connected').put(true)
                init(message)
                gun.user().get('gunsafe').get('connected').put(false)
              })
            })
          })
        }
      })
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
      let hidden = false
      if(command.includes('--deleted')) deleted = true
      if(command.includes('--hidden')) hidden = true
      list(deleted, hidden)
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
      console.log(`Invalid command '${command}'. Type '?' to see all commands.\n\r`)
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
          return
        }
        data = JSON.parse(data)
        let pw = await SEA.decrypt(data, pair)
        gun.user().get('gunsafe').get(data.name).off()
        resolve(pw)
      })
      setTimeout(()=>{
        resolve('Record not found. Type \'list\' to print all record names.\n\r')
      }, 50)
    })

    password = await result
    if(password && password.pass === undefined){
      console.log('Record not found: ' + name + '. Type \'list\' to print all records.\r\n')
      password = {}
      return question()
    }
    if(typeof password != 'object') {
      console.log('Record not found.\n\r')
      password = {}
      return question()
    }

    console.log(password)
    if(typeof password.pass === 'object') password.pass = JSON.stringify(password.pass)
    clipboardy.writeSync(password.pass)

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
  async function list(deleted, hidden){
    console.log()
    gun.user().get('gunsafe').once(data => {
      if(data === undefined) {
        console.log('No records found.\r\n')
        return question()
      }
      let items = Object.keys(data)
      if(items[0] === '_') items.shift()
      for(let item in items){
        gun.user().get('gunsafe').get(items[item]).once(data => {
          if(data && !items[item].includes('*')) {
            console.log(items[item])
          }
          else if(hidden && items[item].includes('*')){
            console.log('[ hidden ]', items[item])
          }
          else if(deleted && !items[item].includes('*')) {
            console.log('[ deleted ]', items[item])
          }
        })
      }
      setTimeout(()=>{
        console.log()
        question()
      }, 50)
    })
  }

  async function del(name){
    gun.user().get('gunsafe').get(name).once(data => {
      if(!data){
        console.log('The record,', name + ',', 'does not exist. Type \'list\' to print all records.\r\n')
        return question()
      } else {
        rl.question(`Are you sure you want to delete this record: ${name}? > `, answer => {
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
}