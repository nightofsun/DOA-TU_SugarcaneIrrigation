var dataToBox ='';//ข้อมูลคำสั่งที่จะส่งไปให้กล่อง

const openValve = (valve,long)=>{//บันทึกข้อมูลคำสั่งเปิดวาล์ว
    dataToBox+=`open:${valve}:${long},`;
}
const closeValve = (valve)=>{//บันทึกข้อมูลคำสั่งปิดวาล์ว
    dataToBox+=`close:${valve},`
}
const EndOfDayRequest = (eod)=>{//บันทึกข้อมูล End of Day
    dataToBox+=`eod:${eod},`
}
const sendData = (callback)=>{//ส่งข้อมูลไปยังกล่องเมื่อมีคำขอรับคำสั่งจากกล่อง
    let d = dataToBox;
    callback(d);
    dataToBox = '';//ทำการลบคำสั่งที่บันทึกไว้
}
module.exports = {
    openValve,
    closeValve,
    EndOfDayRequest,
    sendData
}