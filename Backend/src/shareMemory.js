let payloadBuffer = null;

module.exports = {
    set(buffer){
        payloadBuffer = buffer
    },
    get(){
        return payloadBuffer
    },
    has(){
        return payloadBuffer !== null
    }
}