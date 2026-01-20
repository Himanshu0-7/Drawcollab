const express = require('express')
const router = express.Router()
const roomData = require('../shareMemory')


router.post('/payload',(req, res) =>{
  const buffer = req.body
   roomData.set(buffer)

    res.status(200).json({ok: true})
})
module.exports = router