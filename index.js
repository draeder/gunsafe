import Gun from 'gun'
import SEA from 'gun/sea.js'
import Pair from './pair.js'

Gun.chain.gunsafe = function(opts) {
  const gun = this

  let pair
  gun.gunsafe = {
    name: async (name) => {
      pair = await Pair(name)
      gun.user().auth(pair)
    },
    put: async (name, data) => {
      if(typeof data === 'object') data = JSON.stringify(data)
      if(typeof data === 'string') data = await SEA.encrypt(data, pair)
      gun.user().get('gunsafe').get('items').get(name).put(data)
      gun.user().get('gunsafe').get('list').set(name)
      gun.user().get('gunsafe').get('list').off()
    },
    get: async (name, run, global, cb) => {
      gun.user().get('gunsafe').get('items').get(name).once(async data => {
        if(!data) return cb('Record not found')
        data = await SEA.decrypt(data, pair)
        //gun.gunsafe.emit('doc', data)
        try{
          data = data.join(' ')
          if(!run) cb(data)
        } catch {}
        try{
          data = JSON.parse(data)
        } catch {}

        if(run){
          try{
            if(global === false) {
              let fn = new Function(data)
              fn()
            } else {
              eval(data)
            }
          }
          catch {
            cb(data)
          }
        } else {
          cb(data)
        }
        gun.user().get('gunsafe').get('items').get(name).off()
      })
    },
    list: async (del, cb) => {
      let last = []
      last.length = 0
      gun.user().get('gunsafe').get('list').map().once(data => {
        if(last.includes(data)) return
        gun.user().get('gunsafe').get('items').get(data).once(d => {
          if(d === null && del) {
            cb('[ deleted ] ' + data)
          }
          else if(d !== null && !del){ 
            cb(data)
          }
        })
        last.push(data)
      })
    },
    delete: async (name) => {
      if(!name) { 
        gun.user().get('gunsafe').put(null)
        gun.user().get('gunsafe').get('list').map().once(data => {
          gun.user().get('gunsafe').get('items').get(data).put(null)
          gun.user().get('gunsafe').get('list').put(null)
        })
      } else {
        gun.user().get('gunsafe').get('items').get(name).put(null)
      }
    },
    peers: (peers) => {
      if(peers && typeof peers === 'object') gun.opt({ peers: peers })
      if(peers === false){
        gun.back('opt.peers')
        gun._.opt.peers = {}
      }
      if(!peers) return gun._.opt.peers
    },
    key: () => { 
      return pair
    },
    pair: async (epriv) => {
      if(!epriv){
        let keys = await SEA.pair()
        let encryptedKeys = await SEA.encrypt(pair, keys.epriv)
        gun.get('gunsafe').get('pair').put(encryptedKeys)
        return keys.epriv
      } else {
        gun.get('gunsafe').get('pair').once(async data => {
          gun.user().leave()
          data = await SEA.decrypt(data, epriv)
          gun.user().auth(data, ack => {})
          gun.on('auth', ack => {
            pair = ack.sea
          })
        })
      }
    }
  }

  return gun
}