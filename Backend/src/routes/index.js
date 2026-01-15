const express = require('express')
const router = express.Router()

router.use('/room',require('./Createroom.routes'))

router.get('/',(req, res) =>{
    res.json({status:'ok'})
})

module.exports = router
