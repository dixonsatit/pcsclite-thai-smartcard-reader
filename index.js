const { ThaiCardReader, EVENTS, MODE } = require("./lib")
const axios = require('axios');

const Reader = () => {

    const reader = new ThaiCardReader()
    reader.readMode = MODE.PERSONAL_PHOTO
    reader.autoRecreate = true
    reader.startListener()

    /**
     * DEVICE_CONNECTED
     */
    reader.on(EVENTS.DEVICE_CONNECTED, (reader) => {
        console.log(EVENTS.DEVICE_CONNECTED, reader)
    })

    /**
     * CARD_INSERTED
     */
    reader.on(EVENTS.CARD_INSERTED, (reader) => {
        console.log(EVENTS.CARD_INSERTED)
    })

    /**
     * READING_START
     */
    reader.on(EVENTS.READING_START, (reader) => {
        console.log(EVENTS.READING_START)
    })

    /**
     * READING_PROGRESS
     */
    reader.on(EVENTS.READING_PROGRESS, (progress) => {
        console.log(EVENTS.READING_PROGRESS, progress)
    })

    /**
     * READING_COMPLETE
     */
    reader.on(EVENTS.READING_COMPLETE, (data) => {
        console.log(EVENTS.READING_COMPLETE, data)
    })

    /**
     * READING_FAIL
     */
    reader.on(EVENTS.READING_FAIL, (error) => {
        console.log(EVENTS.READING_FAIL, error)
    })

    /**
     * CARD_REMOVED
     */
    reader.on(EVENTS.CARD_REMOVED, () => {
        console.log(EVENTS.CARD_REMOVED)
    })

    /**
     * DEVICE_DISCONNECTED
     */
    reader.on(EVENTS.DEVICE_DISCONNECTED, () => {
        console.log(EVENTS.DEVICE_DISCONNECTED)
    })
}

Reader();



