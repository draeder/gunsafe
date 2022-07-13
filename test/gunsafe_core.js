import '../index.js'
import hardwareid from 'hardwareid'
import { expect } from 'chai'
import Gun from 'gun'

let id = await hardwareid()

const gun = new Gun()
gun.gunsafe()

describe('Test all gunsafe methods', async () => {
  it('A named gunsafe vault has been created', async () => {
    await gun.gunsafe.name(id, 'Alice Doe')
    let pair = gun.gunsafe.key()
    expect(Object.keys(pair).length === 4).to.equal(true)
  })
  it('A named gunsafe vault has logged into gun successfuly', () => {
    let authenticated = gun.user().is
    expect(Object.keys(authenticated).length === 3).to.equal(true)
  })
  it('A single line record has been put to gunsafe', () => {
    gun.gunsafe.put('hi', 'hi?')
  })
  it('A multiline record has been put to gunsafe', () => {
    let doc = {
      [+new Date()]: 'hi?',
      [+new Date()+1]: 'hello?',
    }
    gun.gunsafe.put('hi', doc)
  })
  it('Gunsafe can get the single line record', () => {
    gun.gunsafe.get('hi', false, false, data => {
      expect(data === 'hi?').to.equal(true)
    })
  })
  it('Gunsafe can get the multiline record', () => {
    gun.gunsafe.get('hi', false, false, data => {
      expect(data === 'hi?').to.equal(true)
    })
  })
  it('Gunsafe can list the available record names', () => {
    gun.gunsafe.list(false, data => {
      expect(data === 'hi' || data === 'hello').to.equal(true)
    })
  })
  it('Gunsafe can delete a record by name', () => {
    gun.gunsafe.delete('hi')
    gun.gunsafe.list(true, data => {
      expect(data === '[ deleted ] hi' || data === '[ deleted ] hello').to.equal(true)
    })
  })
  it('Gunsafe can delete all records', () => {
    gun.gunsafe.delete()
    gun.gunsafe.list(true, data => {
      expect(data === '[ deleted ] hi').to.equal(true)
    })
  })
  it('Gunsafe can list the deleted record names', () => {
    gun.gunsafe.list(true, data => {
      expect(data === '[ deleted ] hi' || data === '[ deleted ] hello').to.equal(true)
    })
  })
  it('Gunsafe returns its keypair', () => {
    let pair = gun.gunsafe.key()
    expect(typeof pair === 'object' && Object.keys(pair).length === 4).to.equal(true)
  })
  it('Gunsafe returns a pairing key', async () => {
    let pair = await gun.gunsafe.pair()
    expect(typeof pair === 'string').to.equal(true)
  })
  it('Adds peers to gunsafe for p2p storage', async () => {
    let peerHosts = ['https://relay.peer.ooo/gun', 'https://gunjs.herokueapp.com']
    await gun.gunsafe.peers(peerHosts)
    let peers = gun.gunsafe.peers()
    let p = Object.keys(peers)
    let same = p.sort().toString() == peerHosts.sort().toString() 
    expect(same).to.equal(true)
  })
  it('Creates a 2nd gunsafe instance and pairs the 1st with the 2nd', async ()=>{
    await gun.gunsafe.name(id, 'Bob Doe')
    let aliceKey = await gun.gunsafe.key()

    let pair = await gun.gunsafe.pair()
    
    gun.gunsafe.pair(pair)
    let bobKey = await gun.gunsafe.key()

    expect(aliceKey === bobKey).to.equal(true)
  })
})