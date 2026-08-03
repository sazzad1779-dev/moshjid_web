import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'

const app = express()
app.use(express.json())

// Dynamically load all api handlers
const handlers = {
  transactions:    (await import('./api/transactions.js')).default,
  auth:            (await import('./api/auth.js')).default,
  collectors:      (await import('./api/collectors.js')).default,
  'add-transaction': (await import('./api/add-transaction.js')).default,
}

for (const [name, handler] of Object.entries(handlers)) {
  app.all(`/api/${name}`, handler)
}

const PORT = 3001
createServer(app).listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})
