const utils = require("./utils")
const adpu = require("./adpu")
const legacy = require("legacy-encoding")
const DatauriParser = require("datauri/parser")
const parser = new DatauriParser()

const STATUS = {
  START: "START",
  READING: "READING",
  COMPLETE: "COMPLETE",
  ERROR: "ERROR",
}

const parseDateToString = (date) => {
  return `${parseInt(date.slice(0, 4) - 543)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
}

const readData = async (reader, protocol, withPhoto, callback) => {
  let totalStep = 4

  if (withPhoto) {
    totalStep = 4 + adpu.CMD_GET_PHOTO.length
  }

  try {
    // Select
    callback({ status: STATUS.START })
    await sendCommand(reader, adpu.CMD_SELECT, protocol)

    // Get Data
    const citizenId = await sendCommand(reader, adpu.CMD_CID, protocol)
    callback({ status: STATUS.READING, obj: { step: 1, of: totalStep, message: "citizen_id" } })

    const rawPersonalInfo = await sendCommand(reader, adpu.CMD_PERSON_INFO, protocol, "personal_info")
    callback({ status: STATUS.READING, obj: { step: 2, of: totalStep, message: "personal_info" } })

    const rawAddress = await sendCommand(reader, adpu.CMD_ADDRESS, protocol)
    callback({ status: STATUS.READING, obj: { step: 3, of: totalStep, message: "address" } })

    const rawIssueExpire = await sendCommand(reader, adpu.CMD_ISSUE_EXPIRE, protocol)
    callback({ status: STATUS.READING, obj: { step: 4, of: totalStep, message: "issue_expire" } })

    let data = {}
    data.citizen_id = citizenId // เลขบัตรประชาชน

    const personalInfo = rawPersonalInfo.split(" ").filter((o) => o !== "")
    data.th_prefix = personalInfo[0] // คำนำหน้า (ภาษาไทย)
    data.th_first_name = personalInfo[1] // ชื่อ (ภาษาไทย)
    data.th_last_name = personalInfo[2] // นามสกุล (ภาษาไทย)
    data.en_prefix = personalInfo[3] // คำนำหน้า (ภาษาอังกฤษ)
    data.en_first_name = personalInfo[4] // ชื่อ (ภาษาอังกฤษ)
    data.en_last_name = personalInfo[5] // นามสกุล (ภาษาอังกฤษ)
    data.th_fullname = data.th_prefix + " " + data.th_first_name + " " + data.th_last_name // ชื่อ-นามสกุล (ภาษาไทย)
    data.en_fullname = data.en_prefix + " " + data.en_first_name + " " + data.en_last_name // ชื่อ-นามสกุล (ภาษาอังกฤษ)

    const tempBirthday = personalInfo[6].slice(0, -1)
    data.birthday = parseDateToString(tempBirthday) // วันเกิด YYYY-MM-DD

    // เพศ
    if (personalInfo[6].slice(-1) === "1") {
      data.gender = "male"
    } else if (personalInfo[6].slice(-1) === "2") {
      data.gender = "female"
    } else {
      data.gender = "other"
    }

    // ที่อยู่
    const tempAddress = rawAddress.split(" ").filter((o) => o !== "")
    data.address = tempAddress.join(" ")
    // วันออกบัตร
    data.issue_date = parseDateToString(rawIssueExpire.slice(0, 8))
    // วันหมดอายุ
    data.expire_date = parseDateToString(rawIssueExpire.slice(8, 16))

    // รูปภาพ
    if (withPhoto) {
      const photoBuffer = await readPhoto(reader, protocol, (step) => {
        callback({ status: STATUS.READING, obj: { step: 4 + step, of: totalStep, message: "photo" } })
      })

      const encodedData = parser.format(".jpg", photoBuffer) // datauri.format(".jpg", rawPhoto)
      data.photo = encodedData
      // data.photo = encodedData.content
    }

    callback({ status: STATUS.COMPLETE, obj: data })
  } catch (e) {
    callback({ status: STATUS.ERROR, obj: e })
  }

  reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
    if (err) {
      return
    }
  })
}

const readPhoto = async (reader, protocol, progress) => {
  let bufferList = []
  for (let i in adpu.CMD_GET_PHOTO) {
    await transmit(reader, adpu.CMD_GET_PHOTO[i][0], protocol)

    let result = await transmit(reader, adpu.CMD_GET_PHOTO[i][1], protocol)
    if (result.length > 2) {
      result = result.slice(0, -2)
    }

    bufferList.push(result)
    progress(bufferList.length)
  }

  const tempBuffer = Buffer.concat(bufferList)
  return tempBuffer
}

const sendCommand = async (reader, command, protocol, readname = "") => {
  let data = null
  for (let i in command) {
    data = await transmit(reader, command[i], protocol)
  }
  if (readname === "personal_info") {
    var buffer = legacy.decode(data, "tis620")
    var _personal = buffer.toString()
    // var _th_personal = _personal.substr(0, 100).split("#")
    // var _en_personal = _personal.substr(100, 100).split("#")
  }
  return utils.hex2string(data.toString("hex"))
}

const transmit = async (reader, command, protocol) => {
  return new Promise((resolve, reject) => {
    reader.transmit(Buffer.from(command), 256, protocol, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

module.exports = {
  readData,
  STATUS,
}
