const express = require('express')
const router = express.Router()
const {randomUUID} = require('crypto')
router.get('/create',(req, res) =>{
    const roomid = randomUUID()
    return res.json({
        roomid: roomid
    })

})
module.exports = router