#! /usr/bin/env node
import '../index.js'
import Gun from 'gun'
import Carets from 'carets'

const gun = new Gun()
gun.gunsafe()

let caretParams = {
  caret: 'gunsafe > ',
  docCaret: 'gunsafe $ > '
}

let carets = new Carets(caretParams)

carets.prompt('gunsafe name > ')

let authedUser
carets.on('line', data => {
  let line = data.split(' ')
  if(!gun.gunsafe.keys && !authedUser) { 
    auth(line)
    setTimeout(()=>{
      carets.prompt(caretParams.caret)
    }, 1)
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

function auth(line){
  if(line === '\r') return console.log('The gunsafe name may not be empty.')
  authedUser = line.join(' ')
  console.log('Keypair for the gunsafe named,', authedUser + ', created.')
  gun.gunsafe.name(authedUser)
}

function keypair(line){
  let key = gun.gunsafe.key()
  console.log(key)
}

function peers(line){
  let peers = gun.gunsafe.peers()
  console.log(peers)
}

async function pair(line){
  if(line[1]) {
    gun.gunsafe.pair(line[1])
  }
  else {
    let pair = await gun.gunsafe.pair()
    carets.pause()
    console.log('\r\nYour pairing key', pair)
    carets.resume()
    carets.prompt()
  }
}

function list(line){
  carets.pause()
  let gone = false
  if(line.includes('--deleted')) gone = true
  let timeout
  gun.gunsafe.list(gone, data => {
    console.log(data)
    timeout = setTimeout(()=>{
      clearTimeout(timeout)
      timeout = undefined
    }, 50)
  })
  let interval = setTimeout(()=>{
    if(!timeout){
      carets.resume()
      carets.prompt()
      clearInterval(interval)
    }
  },100)
}

function put(line){
  carets.pause()
  let dataIndex = line.indexOf('--data')
  let data = line.splice(dataIndex, line.length)
  data.shift()
  line.slice(dataIndex, line.length)
  line.slice(dataIndex)
  line.shift()
  let name = line

  name = name.join(' ')
  data = data.join(' ')

  gun.gunsafe.put(name, data)
  carets.resume()
  carets.prompt(caretParams.caret)
}

function putDoc(name, data){
  console.log(name, data)
  gun.gunsafe.put(name, data)
}

function get(name){
  name.shift()
  let run
  let global = true
  if(name.includes('--run')) { 
    run = true
    name =name.filter(v => v !== '--run')
  }
  if(name.includes('--global')) {
    global = true
    name = name.filter(v => v !== '--global')
  }
  name = name.join(' ')
  carets.pause()
  gun.gunsafe.get(name, run, global, data => {
    console.log(data)
    setTimeout(()=>{
      carets.resume()
      carets.prompt(caretParams.caret)
    }, 1)
  })
}

function del(line){
  if(line) { 
    line.shift()
    line = line.join(' ')
    gun.gunsafe.delete(line)
  }
  else {
    carets.pause()
    setTimeout(()=>{
      carets.resume()
      carets.prompt('This will delete all of this gusafe\'s data. Continue? > ')
    },1)
    carets.on('line', data => {
      if(yes.includes(data)){
        gun.gunsafe.delete()
      }
    })
  }
}

let doc = {}
let docName = ''

carets.on('doc', data => {
  if(data && typeof data === 'string') docName = data
  else if(Object.keys(data).length > 0){
    doc = data
    putDoc(docName, doc)
  }
})