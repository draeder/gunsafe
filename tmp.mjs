import fs from 'fs/promises'

try {
  const data = await fs.readFile(__dirname + '/pair.js', { encoding: 'base64' })
  console.log(data)
} catch (err) {
  console.log(err)
}
