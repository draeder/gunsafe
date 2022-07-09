#! /usr/bin/env node
import fs from 'fs'
import '../index.js'
import Gun from 'gun'
import SEA from 'gun/sea.js'
import Carets from 'carets'

const gun = new Gun()
gun.gunsafe()

let params = {
  caret: 'gunsafe > ',
  docCaret: 'gunsafe $ > '
}

let carets = new Carets(params)

carets.prompt('gunsafe name > ')

let authedUser
carets.on('line', data => {
  let line = data.split(' ')
  if(!gun.gunsafe.keys && !authedUser) { 
    auth(line)
    setTimeout(()=>{
      carets.prompt(params.caret)
    })
  }
  if(line[0] === 'keypair') keypair(line)
  if(line[0] === 'peers') peers(line)
  if(line[0] === 'pair') pair(line)
  if(line[0] === 'put') put(line)
  if(line[0] === 'get') get(line) 
  if(line[0] === 'list') list(line)
  if(line[0] === 'delete') del(line)
})

let yes = ['Y', 'y', 'yes', 'Yes', 'true', 'True', '1']
let no = ['N', 'n', 'no', 'No', 'false', 'False', '0']

async function auth(line){
  if(line === '\r') return console.log('The gunsafe name may not be empty.')
  authedUser = line.join(' ')
  console.log('Keypair for the gunsafe named,', authedUser + ', created.')
  let key
  try {
    key = fs.readFileSync('./key', err => {}).toString()
    gun.gunsafe.name(key, authedUser)
  }
  catch {
    let pair = await SEA.pair()
    fs.writeFile('./key', pair.epriv, err => {})
    gun.gunsafe.name(pair.epriv, authedUser)
  }
}

function keypair(){
  let key = gun.gunsafe.key()
  console.log(key)
}

function peers(line){
  let peers
  if(line && line[1]){
    line.shift()
    gun.gunsafe.peers(line)
  } else {
    peers = gun.gunsafe.peers()
    console.log(peers)
  }
}

async function pair(line){
  if(line[1]) {
    gun.gunsafe.pair(line[1])
  }
  else {
    let pair = await gun.gunsafe.pair()
    console.log('\r\nYour pairing key', pair)
    carets.prompt(params.caret)
  }
}

function list(line){
  let gone = false
  if(line.includes('--deleted')) gone = true
  gun.gunsafe.list(gone, data => {
    carets.prompt('')
    console.log(data)
    carets.prompt(params.caret)
  })
}

function put(line){
  let dataIndex = line.indexOf('--data')
  let data = line.splice(dataIndex, line.length)
  data.shift()
  line.slice(dataIndex, line.length)
  line.slice(dataIndex)
  line.shift()
  let name = line

  name = name.join(' ')
  data = data.join(' ')

  gun.gunsafe.put(name, data, cb => {
    console.log(cb)
  })
  setTimeout(()=>carets.prompt(params.caret))
}

function putDoc(name, data){
  gun.gunsafe.put(name, data)
}

carets.on('docmode', bool => {
  if(bool) {
    setTimeout(()=>carets.prompt(''))
  }
})

function get(name){
  name.shift()
  let run
  let global = true
  if(name.includes('--run')) { 
    run = true
    name = name.filter(v => v !== '--run')
  }
  if(name.includes('--global')) {
    global = true
    name = name.filter(v => v !== '--global')
  }
  name = name.join(' ')
  gun.gunsafe.get(name, run, global, data => {
    carets.prompt('')
    console.log(data)
    carets.prompt(params.caret)
  })
}

function del(line){
  if(line.length > 1) { 
    line.shift()
    line = line.join(' ')
    gun.gunsafe.delete(line)
  }
  else {

    setTimeout(() => carets.prompt('This will delete all of this gusafe\'s data. Continue? > '))
    carets.on('line', data => {
      if(yes.includes(data)){
        gun.gunsafe.delete()
        setTimeout(() => carets.prompt(params.caret))
      }
    })
  }
}

carets.on('doc', data => {
  let doc = {}
  let keys = Object.keys(data)
  let docname = data[Math.min(...keys)]
  delete data[keys[0]]
  if(keys.length > 0){
    doc = data
    putDoc(docname, doc)
  }
  carets.prompt(params.caret)
})
