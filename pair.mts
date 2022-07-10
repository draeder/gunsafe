let crypto = await import('crypto').then((WebCrypto) => {
  return WebCrypto.webcrypto
})
import forge from 'node-forge'
import EC from 'elliptic'
import btoa from 'btoa'
const ec = EC.ec

export default async function Pair(pwd: any, salt: string | any[]) {
  // forge.options.usePureJavaScript = true
  return new Promise((resolve, reject) => {
    let ec_p256 = new ec('p256')

    if (!pwd) pwd = forge.random.getBytesSync(32)

    let privateKey_d = forge.md.sha256.create().update('d').update(pwd) as any //decrypt key
    let privateKey_s = forge.md.sha256.create().update('s').update(pwd) as any //sign key

    if (salt) {
      if (salt instanceof String) salt = [salt]

      for (let i = 0; i < salt.length; i++) {
        privateKey_s = privateKey_s.update(salt[i])
        privateKey_d = privateKey_d.update(salt[i])
      }
    }

    privateKey_s = privateKey_s.digest().toHex()
    privateKey_d = privateKey_d.digest().toHex()

    let keyA_d = ec_p256.keyFromPrivate(privateKey_d, 'hex')
    let validation = keyA_d.validate()
    if (validation.reason) return reject(validation.reason)

    let keyA_s = ec_p256.keyFromPrivate(privateKey_s, 'hex')
    validation = keyA_s.validate()
    if (validation.reason) return reject(validation.reason)

    resolve({
      pub: keyBuffer_to_jwk('ECDSA', Buffer.from(keyA_s.getPublic('hex'), 'hex')),
      priv: arrayBufToBase64UrlEncode(Buffer.from(privateKey_s, 'hex')),
      epub: keyBuffer_to_jwk('ECDH', Buffer.from(keyA_d.getPublic('hex'), 'hex')),
      epriv: arrayBufToBase64UrlEncode(Buffer.from(privateKey_d, 'hex')),
      // secret: arrayBufToBase64UrlEncode(Buffer.from(keyA_d.derive(keyA_s.getPublic()).toString('hex'), 'hex'))
    })
  })

  function arrayBufToBase64UrlEncode(buf: Iterable<number>) {
    let binary = ''
    let bytes = new Uint8Array(buf)
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary).replace(/\//g, '_').replace(/=/g, '').replace(/\+/g, '-')
  }

  function keyBuffer_to_jwk(type: string, raw_publicKeyRawBuffer: Buffer) {
    let key
    switch (type) {
      case 'ECDSA':
      case 'ECDH':
        if (raw_publicKeyRawBuffer[0] == 4)
          key =
            arrayBufToBase64UrlEncode(raw_publicKeyRawBuffer.slice(1, 33)) +
            '.' +
            arrayBufToBase64UrlEncode(raw_publicKeyRawBuffer.slice(33, 66))
        break
      default:
        key = false
        break
    }
    return key
  }
  //Hey dan whats this?
  function b32(s: string) {
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

    let parts = []
    let quanta = Math.floor(s.length / 5)
    let leftover = s.length % 5

    if (leftover != 0) {
      for (let i = 0; i < 5 - leftover; i++) {
        s += '\x00'
      }
      quanta += 1
    }

    for (let i = 0; i < quanta; i++) {
      parts.push(alphabet.charAt(s.charCodeAt(i * 5) >> 3))
      parts.push(alphabet.charAt(((s.charCodeAt(i * 5) & 0x07) << 2) | (s.charCodeAt(i * 5 + 1) >> 6)))
      parts.push(alphabet.charAt((s.charCodeAt(i * 5 + 1) & 0x3f) >> 1))
      parts.push(alphabet.charAt(((s.charCodeAt(i * 5 + 1) & 0x01) << 4) | (s.charCodeAt(i * 5 + 2) >> 4)))
      parts.push(alphabet.charAt(((s.charCodeAt(i * 5 + 2) & 0x0f) << 1) | (s.charCodeAt(i * 5 + 3) >> 7)))
      parts.push(alphabet.charAt((s.charCodeAt(i * 5 + 3) & 0x7f) >> 2))
      parts.push(alphabet.charAt(((s.charCodeAt(i * 5 + 3) & 0x03) << 3) | (s.charCodeAt(i * 5 + 4) >> 5)))
      parts.push(alphabet.charAt(s.charCodeAt(i * 5 + 4) & 0x1f))
    }

    let replace = 0
    if (leftover == 1) replace = 6
    else if (leftover == 2) replace = 4
    else if (leftover == 3) replace = 3
    else if (leftover == 4) replace = 1

    for (let i = 0; i < replace; i++) parts.pop()
    for (let i = 0; i < replace; i++) parts.push('=')

    return parts.join('')
  }
}
