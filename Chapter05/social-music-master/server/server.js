const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const port = 9000
const distFolder = path.join(__dirname, '../public', 'dist')

app.use(distFolder, express.static(distFolder))
app.use(bodyParser.json())

app.use((req, res, next) => {
   console.log(`${req.method} Request to ${req.originalUrl}`)
   next()
})
app.get('*/bundle.js', (req, res) => {
   res.sendFile(path.join(distFolder, 'bundle.js'))
})
app.get('*', (req, res) => {
   res.sendFile(path.join(distFolder, 'index.html'))
})

app.listen(port, '0.0.0.0', (req, res) => {
    console.log(`Server listening on localhost:${port}`)
})
