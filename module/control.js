const { writeLog, sendToApp, duevalvenoti, openvalvenoti, clearnoti, calendarnoti, downtime, downtimenoti, writeSensorData, writeState, getState, writeDataLog, saveCSV, newSeason } = require("./database");
const { closeValve, openValve, EndOfDayRequest } = require("./valve");

const one_day = 1000*60*60*24;//ระยะเวลา 1 วันในหน่วงมิลลิวินาที
const p = [0.26,0.26,0.27,0.28,0.29,0.29,0.29,0.28,0.28,0.27,0.26,0.25];//ค่า p ที่ใช้ในการคำนวนค่า ETp
const k = [-0.0000003,0.0002,0.0227,1.0367];//ค่าคงที่ ที่ใช้ในการคำนวนค่าkc
const e = [0.46,2,8];//ค่าคงที่ ที่จะใช้ในการคำนวนค่า ETp

var DalyLog = {//ข้อมูลรายวันที่จะต้องเก็บไว้
    dap: 0,//อายุพืช
    date: '',//วันที่ที่เก็บ
    time: '',//เวลาที่เก็บ
    maxTemp: 0,//อุณหภูมิสูงสุดประจำวัน
    minTemp: 0,//อุณหภูมิต่ำสุดประจำวัน
    avarageTemp: 0,//อุณหภูมิเฉลี่ย
    soliMoisture: 0,//ความชื้นในดิน
    airMoisture: 0,//ความชื้นในอากาศ
    tempRainVolume: 0,//ปริมาณน้ำฝนประจำวัน
    et: 0,//ค่า ETp ประจำวัน
    kc: 0,//ค่า Kc ประจำวัน
    on_off: 0,//บอกว่าเปิดวาล์วหรือไม่
    valve: 0,//หากเปิดวาล์วจะบอกเลขที่ของวาล์วแต่หากไม่จะเป็น 0
    effectiveIrr: 0,//ปริมาณน้ำที่ให้ประจำวัน
    effectivePrec: 0,//ปริมาณน้ำฝนที่สะสมมาของวาล์วที่เปิด
    valveData: [],//ข้อมูลของแต่ละวาล์วซึ่งจะมีค่า ETcประจำวัน และ ค่า ETc สะสม
}
var manual = false;//ตัวตรวจสอบว่าทำการแจ้งเตื่อนให้ผู้ใช้ให้น้ำแล้วหรือไม่ เมื่อผู้ใช้อยู่ในโหมดให้น้ำด้วยตนเอง
var canSetConfig = true;//ตัวตรวจสอบว่าผู้ใช้สามารถตั้งค่า config ใหม่ทั้งหมดได้หรือไม่
var duration = 365;//ระยะเวลาในการปลูกอ้อย 1 ฤดูกาลโดยปกติจะเป็น 365 วัน
var successDalyLog = false;//ตัวตรวจสอบว่าได้ทำการบันทึกข้อมูลประจำวันแล้วหรือไม่
var autoSystem = true;//ตัวบอกว่าผู้ใช้กำหนดโหมดการทำงานเป็นแบบไหน อัตโนมัติหรือกำหนดเอง
var timeNoti = {//ตัวเก็บเวลาในการแจ้งเตือน
    hour: 6,
    minute: 30
};
var nextvalve =0;//ตัวบอกว่าจะให้น้ำถัดไปวาล์วไหน
var intervalSaveState;//interval ในการบันทึกสถานะของตัวระบบเพื่อแบ็คอัพข้อมูลไว้กันเชิฟล่ม
var intervalSaveWeekly;//interval ในการบันทึกข้อมูลที่จะต้องเก็บต่างๆ เช่นพวก log จาก database ไว้เป็นไฟล์เพื่อให้ผู้ใช้สามารถโหลดไปดูได้
var intervalCheckEndSeason;//interval สำหรับตรวจสอบว่าจบฤดูกาลหรือยัง
var noti = 1;//บอกว่าให้แจ้งเตือนล่วงหน้ากี่วัน
var successnoti = false;//ตัวตรวจสอบว่าได้ทำการแจ้งเตือนประจำวันแล้วหรือไม่
var lastconnect = new Date();//เก็บไว้ตรวจสอบว่ากล่องควบคุมเชื่อมต่อครั้งสุดท้ายเมื่อไหร่เพื่อบันทึก downtime
var pumpRate = 20;//ความแรงของปั้ม
var interval = 2;//บอกระยะเวลาในการเว้นช่วงให้น้ำหน่วยเป็นวัน
var timeToWaterSupply = {//เวลาในการให้น้ำ
    hours:9,
    minute: 0
};
var tempTime = new Date();//ตัวเก็บเวลาไว้ตรวจสอบหลังจากถึงเวลาให้น้ำ ว่าผู้ใช้ได้ทำการให้น้ำแล้วหรือไม่
var zoneSize = [0,0,0,0,0];//ขนาดของพื้นที่แต่ละโซน
var startDate =new Date('2020','11','10');//วันที่เริ่มต้นปลูกพืช
var totalValve = 2;//จำนวนวาลว์
var duevalve = [];//เก็บว่าอีกกี่วันจะถึงเวลาให้น้ำของแต่ละวาล์ว
var et0PerValve = {//เก็บค่า ETc ของแต่ละวาล์ว
    valve1: [],
    valve2: [],
    valve3: [],
    valve4: [],
    valve5: []
};
var valveState = {//บอกว่ามีวาล์วไหนเปิดอยู่บ้าง
    1:false,
    2:false,
    3:false,
    4:false,
    5:false,
}
var intervalValveOpen;//interval ไว้นับปริมาณน้ำที่ให้เมื่อเปิดวาล์ว
var intervalCheck;//interval ไว้ตรวจสอบว่าถึงเวลาแจ้งเตือน ให้น้ำ หรือบันทึกข้อมูลประจำวันแล้วหรือยัง
var successWaterSupply = false;//บอกว่าให้น้ำแล้วหรือไม่
var waterRequire = [0,0,0,0,0];//ปริมาณน้่ำที่ต้องการในแต่ละวาล์ว
var tempDate = new Date('2021','0','7');//เก็บไว้ตรวจสอบว่าเปลี่ยนวันหรือยัง
var tempRainVolume = 0;//ปริมาณน้ำฝนประจำวัน
var rainVolume = {//ปริมาณน้ำฝนที่เก็บไว้ของแต่ละวาล์ว
    valve1: [],
    valve2: [],
    valve3: [],
    valve4: [],
    valve5: []
};
var waterSupplyPerValve = [0,0,0,0,0];//ปริมาณน้ำที่ให้ของแต่ละวาล์วใน 1 วัน
var tempWatersupplyPerValve = [0,0,0,0,0];//ปริมาณน้ำที่ให้ในการเปิดวาล์ว 1 ครั้ง
var temperature ={//อุณหภูมิ ต่ำสุด สูงสุด
    max: 0,
    min: 1000
};
var humidity = 20;//ความชื้น
var humidityDegree = '1';//ระดับความชื้น

const round = (number, decimal)=>{//ปัดทศนิยม
    const factorOfTen = Math.pow(10,decimal);
    return Math.round(number*factorOfTen) / factorOfTen;
}
const setDuration = (dura)=>{//ตั้งระยะเวลาในการปลูก 1 ฤดูกาล
    duration = parseInt(dura);
}
const setAutoSystem = (input)=>{//ตั้งค่ารูปแบบการให้น้ำ
    autoSystem = input;
}
const setZone = (size)=>{//เก็บขนาดโซน
    for(let i=1;i<6;i++){
        let zone = size['zone'+i].split('-');
        zoneSize[i-1]=(zone[0]*1600)+(zone[1]*400)+(zone[2]*4);//ไร่ งาน วา แปลงเป็นตารางเมตร
    }
}
const setTotalValve = (valve)=>{//ตั้ง จำนวนวาลว์
    if(canSetConfig){//ไม่จบฤดูกาลจะเปลี่ยนจำนวนวาล์วไม่ได้
        totalValve = parseInt(valve);
    }
}
const setConfig = (data)=>{//setup ตั้งค่า
    if(canSetConfig){//ไม่จบฤดูกาลจะตั้งค่าใหม่ไม่ได้
        pumpRate = parseFloat(data.pumpRate);
        interval = parseInt(data.interval);
        for(let i=0;i<totalValve;i++){
            duevalve.push(interval+i);
            DalyLog.valveData.push({
                etc: 0,
                accEtc: 0
            })
        }
        let date = data.startDate.split('/');//วันที่มาในรูป day/month/year
        startDate = new Date(date[2],date[1]-1,date[0]);
        let time = data.time.split(':');//เวลามาในรูป ชัวโมง:นาที
        timeToWaterSupply = {
            hours: parseInt(time[0]),
            minute: parseInt(time[1])
        };
        let date2 = new Date();
        tempDate = new Date(date2.getFullYear(),date2.getMonth(),date2.getDate());
        setCheck();//เรียกใช้ฟังก์ชันในการเริ่มทำงาน และตรวจสอบสิ่งต่างๆประจำวัน
        intervalSaveWeekly = setInterval(saveWeeklyData,1000*60*60*24*7);//ตั้ง interval บันทุกข้อมูลรายสัปดาห์
        intervalCheckEndSeason = setInterval(checkEndSeason,1000*60*60*5);//ตั้ง interval ตรวจสอบจบฤดูกาล
        lastconnect = date2;//เก็บข้อมูลการเชื่อมต่อล่าสุด
        console.log(DalyLog);
        canSetConfig = false;//ทำให้ไม่สามารถุตั้งค่าซ้ำได้
    }
};
const saveWeeklyData = ()=>{//บันทึกข้อมูลรายสัปดาห์
    saveCSV(totalValve,zoneSize);//เรียกใช้จาก โมดูล database
}
const maxTemperature = (tempInput)=>{//ตรวจสอบ maxtemp
    if(temperature.max<tempInput){
        temperature.max=tempInput;
    }
};
const minTemperature = (tempInput)=>{//ตรวจสอบ mintemp
    if(temperature.min>tempInput){
        temperature.min=tempInput;
    }
};
const setCheck = ()=>{//ตั้ง interval ตรวจสอบรายวัน
    clearInterval(intervalCheck);
    //console.log('as')
    intervalCheck = setInterval(check,60000);//ตรวจสอบทุกๆ 1 นาที
}
const tranHumidity = ()=>{
    if(humidity>=90){
        humidityDegree = '1';//แปลว่าเปียก
    }
    else if(humidity>=40){
        humidityDegree = '2';//แปลว่าปานกลาง
    }
    else{
        humidityDegree = '3';//แปลว่าแห้ง
    }
}
const calculateWaterRequire = (valvenum)=>{//คำนวนปริมาณน้ำที่ต้องให้
    let sumet0 = 0;//ผลรวม ETc
    let etc = 0;
    let sumRain = 0;//ผลรวมน้ำฝน
    let count = et0PerValve['valve'+valvenum].length
    for(let i =0;i<count;i++){
        sumet0+=et0PerValve['valve'+valvenum][i]
        etc = et0PerValve['valve'+valvenum][i]
    }
    for(let i =0;i<count;i++){
        sumRain+=rainVolume['valve'+valvenum][i];
    }
    if(sumRain>40){
        sumRain = 40;
    }
    console.log("sumet"+sumet0);
    let avarage = (sumet0-sumRain)/count;//ค่าเฉลี่ยปริมาณน้ำที่ต้องกหารในแต่ละวัน
    console.log("set:"+ (((sumet0-sumRain)+(avarage*duevalve[valvenum-1]))*0.001));
    waterRequire[valvenum-1] = (((sumet0-sumRain)+(avarage*duevalve[valvenum-1]))*0.001*zoneSize[valvenum-1]);//คำนวนปริมาณน้ำที่ต้องการเมื่อครบกำหนด
    DalyLog.valveData[valvenum-1].etc = round(etc,2);
    DalyLog.valveData[valvenum-1].accEtc = round(sumet0,2);
    DalyLog.effectivePrec = round(sumRain,2);

    console.log(waterRequire[valvenum-1]);
};
const dalyReset = ()=>{//รีเซ็ตรายวันหลังคำนวนเสร็จ
    temperature.max = 0;
    temperature.min = 1000;
    tempRainVolume = 0;
}
const sensorData = (data)=>{
    
    // console.log(tempDate.getDate());
    // console.log(date.getTime()-tempDate.getTime());
    // console.log(one_day);
    let now = new Date();
    maxTemperature(parseFloat(data.maxTemp));
    minTemperature(parseFloat(data.minTemp));
    humidity = data.soliMoisture;//ความชื้นในดิน
    tranHumidity();
    tempRainVolume+=parseFloat(data.rain);
    if((now.getTime()-lastconnect.getTime())>7200000){//ตรวจสอบว่ามีการขาดการเชื่อมต่อมากกว่า 2 ชัวโมงหรือไม่
        let d = {
            date: lastconnect.getDate()+'/'+(lastconnect.getMonth()+1)+'/'+lastconnect.getFullYear(),
            time: lastconnect.getHours()+':'+lastconnect.getMinutes(),
            long: round((now.getTime()-lastconnect.getTime())/3600000,0)
        }
        downtime(d);//เก็บข้อมูลการขาดการเชื่อมต่อไว้
    }
    lastconnect = new Date();//บันทึกเวลาที่เชื่อมต่อล่าสุดใหม่
    let datatolog = {
        date: now.getDate()+'/'+(now.getMonth()+1)+'/'+now.getFullYear(),
        time: now.getHours()+':'+now.getMinutes(),
        maxTemp: data.maxTemp,
        minTemp: data.minTemp,
        soliMoisture: data.soliMoisture,
        airHumidity: data.airHumidity,
        boxHumidity: data.boxHumidity,
        rain: data.rain,
        maxTempBox: data.maxTempBox,
        minTempBox: data.minTempBox
    };//เตรียมข้อมูลที่ส่งมาเพื่อส่งไปเขียนเก็บบน database
    writeSensorData(datatolog);
    DalyLog.airMoisture = data.airHumidity;
    dataToApp()//ส่งข้อมูลที่มีการอัพเดตล่าสุดไปให้แอปพลิเคชัน
        
        // console.log(et0PerValve);
        // console.log(rainVolume);
        // console.log(temperature.max);
        // console.log(tempRainVolume);
        // console.log(tempDate.getDate());
    
    
};

const changeConfig = (data)=>{//เปลี่ยนแปลงการตั้งค่า
    interval = parseInt(data.interval);
    pumpRate = parseFloat(data.pumpRate);
    let time = data.time.split(':');
    timeToWaterSupply = {
        hours: parseInt(time[0]),
        minute: parseInt(time[1])
    };
};


const openValveState = (v)=>{//เปิดวาล์ว
    if(duevalve[v-1]==0){//ตรวจสอบว่าสามารถเปิดได้
        valveState[v]=true;//เปลี่ยนสถานะวาล์วเป็นเปิด
        let long = round((waterRequire[v-1]/(pumpRate/1000)),0);//ระยะเวลาในการเปิดวาล์สูงสุด
        openValve(v,long);//สั่งเปิดวาล์ว
        clearInterval(intervalValveOpen);//ลบ interval
        intervalValveOpen = setInterval(countWater,1000); //ตั้ง interval ไว้เพื่อนับปริมาณน้ำ
        DalyLog.on_off = 1;
        DalyLog.valve = v;
    }

};
const closeValveState = (v)=>{//ปิดวาล์ว
    valveState[v]=false;//เปลี่ยนสถานะวาล์วเป็นปิด
    console.log('close valve')
    let mode = ''
    if(autoSystem){//ตรวจสอบว่าให้น้ำโหมดไหนอยู่
        mode = 'Auto';
    }
    else{
        mode = 'Manual';
    }
    let nowDate = new Date();
    let valvelog = {//ข้อมูลที่ต้องเก็บ
        valve: v,
        totalWater: round(tempWatersupplyPerValve[v-1],2),
        date: nowDate.getDate()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getFullYear(),
        time: nowDate.getHours()+':'+nowDate.getMinutes(),
        timeOpenValve: round(tempWatersupplyPerValve[v-1]/(pumpRate/1000),0),
        mode : mode
    }
    writeLog(valvelog);//เขียนข้อมูลเก็บไว้
    closeValve(v);//สั่งปิดวาล์ว
    tempWatersupplyPerValve[v-1]=0;//ลบปริมาณน้ำที่ให้ในการเปิดครั้งนี้
}
const openValveAutoOFF = (v,time)=>{//เปิดวาล์วแบบปิดอัตโนมัติ
    openValveState(v);//สั่งเปิดวาล์ว
    let timesplit = time.split(':');
    let long = ((timesplit[0]*3600)+(timesplit[1]*60))*1000;//แปลงเวลาจาก ชั่วโมง:นาที เป็น มิลลิวินาที
    const close = ()=>{
        closeValveState(v);//ปิดวาล์ว
    };
    setTimeout(close,long);//ตั้งเวลาในการสั่งปิดวาล์ว
}
const setupNoti = (data)=>{//ตั้งค่าแจ้งเตือน
    let t = data.time.split(':');
    timeNoti.hour = parseInt(t[0]);//เวลาแจ้งเตือน
    timeNoti.minute = parseInt(t[1]);
    noti = parseInt(data.long);//ระยะเวลาในการแจ้งเตือนล่วงหน้า
}
const countWater = ()=>{//นับปริมาณน้ำที่ให้เมื่อวาล์วเปิด
    let count=0;//นับจำนวนวาล์วที่เปิดอยู่
    for(let i=1;i<totalValve+1;i++){
        if(valveState[i]==true){//หากวาล์วชเปิดอยู่
            count++;
            waterSupplyPerValve[i-1]+=(pumpRate/60/1000);//เพิ่มปริมาณน้ำที่ให้ตามความแรงของปั้ม
            tempWatersupplyPerValve[i-1]+=(pumpRate/60/1000);
            if(waterSupplyPerValve[i-1]>=waterRequire[i-1]){//หากปริมาณน้ำมากเกินที่คำนวนได้ให้ปิดวาล์ว
                valveState[i]=false;
                closeValveState(i);
            }
            console.log(waterSupplyPerValve[i-1]);
        }
    }
    if(count==0){
        clearInterval(intervalValveOpen);//เมื่อไม่มีวาล์วเปิดอยู่ให้หยุดนับ
    }
}
const calculateEndOfDay = ()=>{//คำนวนเมื่อจบวันและส่งข้อมูลไปยังกล่อง
    let eod ='';
    let temp = 0;//วาล์วที่ต้องให้น้ำต่อไป
    let nowDate = new Date();
    for(let i=0;i<totalValve;i++){//ตรวจสอบว่าจะให้น้ำวาล์วถึดไปคือวาล์วไหน
        if(duevalve[i]!=0&&duevalve[i]<duevalve[temp]){
            temp=i;
        }
    }
    let newDate = new Date(nowDate.getTime()+(one_day*duevalve[temp]));//วันที่ต้องให้น้ำ
    let long = (waterRequire[temp]/(pumpRate/60000))*1000;//ระยะเวลามากที่สุดในการให้น้ำ
    let start = new Date(2020,1,1,timeToWaterSupply.hours,timeToWaterSupply.minute,0);//เวลาที่เริ่มให้น้ำ
    let stop = new Date(start.getTime()+long);//เวลาที่หยุดให้น้ำ
    eod+=`${temp+1}:${round(waterRequire[temp],2)}:${start.getHours()}.${start.getMinutes()}:${stop.getHours()}.${stop.getMinutes()}:${newDate.getDate()}/${(newDate.getMonth()+1)}/${newDate.getFullYear()}`;//ข้อมูลที่ต้องส่งไปให้กล่อง
    nextvalve = temp+1;//เก็บวาล์วถัดไปเพื่อส่งให้แอป
    EndOfDayRequest(eod);//เรียกใช้เพื่อส่ง end of day ให้กล่อง
}
const check = ()=>{//ตรวจสอบ
    let nowDate = new Date();
    // console.log(nowDate);
    // console.log(tempDate);
    if((nowDate.getTime()-tempDate.getTime())>=one_day){//วันใหม่
        waterSupplyPerValve = [0,0,0,0,0];//รีเซ็ตปริมาณน้ำที่ให้
        successWaterSupply = false;
        successnoti = false;
        successDalyLog = false;
        clearnoti();
        DalyLog.on_off = 0;
        DalyLog.valve = 0;
        console.log(et0PerValve['valve'+1]);
        console.log(et0PerValve['valve2']);
        tempDate = new Date(nowDate.getFullYear(),nowDate.getMonth(),nowDate.getDate());
        for(let i=0;i<duevalve.length;i++){
            if(duevalve[i]==0){//หากวาล์วไหนเป็น 0 นั่นคือให้น้ำไปแล้วในวันก่อนหน้า ลบข้อมูลวาล์วทั้งหมดเพื่อเก็บใหม่
                duevalve[i]=interval;
                console.log(i);
                console.log('asdsa:'+et0PerValve['valve'+(i+1)]);
                et0PerValve['valve'+(i+1)] = [];
                rainVolume['valve'+(i+1)] = [];
                console.log('qwewq'+et0PerValve['valve'+(i+1)]);
            }
            console.log(et0PerValve['valve'+(i+1)]);
            
            duevalve[i]--;
        }
    }
    if(successnoti==false&&nowDate.getHours()>=timeNoti.hour&&nowDate.getMinutes()>=timeNoti.minute){//ยังไม่ได้แจ้งเตือนและถึงเวลาแจ้งเตือน
        for(let i = 0;i<totalValve;i++){
            if(duevalve[i]==noti){//แจ้งเตือนให้น้ำล่วงหน้า
                let tempday = new Date(nowDate.getTime()+(one_day*noti));//วันที่ต้องให้น้ำ
                let long = (waterRequire[i]/(pumpRate/1000));//ระยะเวลาในการให้น้ำ
                let hourcalculate = Math.floor(long/60);
                let minutecalculate = long-(hourcalculate*60);
                console.log('long'+long);
                console.log('hour'+hourcalculate);
                console.log('minute'+minutecalculate)
                console.log('water'+waterRequire[i]);
                let d = {
                    date: tempday.getDate()+'/'+(tempday.getMonth()+1)+'/'+tempday.getFullYear(),
                    time : timeToWaterSupplys.hours+':'+timeToWaterSupply.minute,
                    valve: i+1,
                    totalwater: round(waterRequire[i],2),
                    hour: hourcalculate,
                    minute: round(minutecalculate,0)
                }
                console.log(d);
                duevalvenoti(d);//ยิงแจ้งเตือนไปยัง แอป

            }
        }
        calendarnoti(nowDate.getMonth()+1);//แจ้งเตือนตามปฏิทินเกษตร
        if((nowDate.getTime()-lastconnect.getTime())>=(2*one_day)){//ตรวจสอบว่ากล่องขาดการเชื่อมต่อมากกว่า 2 วันหรือไม่หากเกิน 2 วันจะทำการแจ้งเตือนไปยังแอป
            //noti dowtime
            downtimenoti();
        }
        successnoti=true;
    }
    if(autoSystem==true){//ตรวจสอบว่าเป็นระบบอัตโนมัติหรือไม่
        if(successWaterSupply==false){//ให้น้ำแล้วหรือไม่
            if(nowDate.getHours()>=timeToWaterSupply.hours&&nowDate.getMinutes()>=timeToWaterSupply.minute){//ถึงเวลาให้น้ำ
                dalyCalculate();//คำนวนประจำวัน
                dataToApp()//ส่งข้อมูลไปยังแอป
                for(let i=1;i<totalValve+1;i++){
                    console.log('test water = '+waterRequire[i-1]);
                if(duevalve[i-1]==0&&waterSupplyPerValve[i-1]==0&&waterRequire[i-1]>0){//ตรวจดูว่าวาล์วไหนต้องให้น้ำ
                    openValveState(i);//ให้น้ำ
                    console.log('Open Valve');

                }
                
            }
             successWaterSupply=true;
            }
        }
    }
    else{//ให้น้ำกำหนดเอง
        if(successWaterSupply==false){
            if(manual==false&&nowDate.getHours()>=timeToWaterSupply.hours&&nowDate.getMinutes()>=timeToWaterSupply.minute){//ถึงเวลาให้น้ำ
                dalyCalculate();
                dataToApp()
                manual=true;
                //send noti
                for(let i=1;i<totalValve+1;i++){
                    if(duevalve[i-1]==0&&waterSupplyPerValve[i-1]==0&&waterRequire[i-1]>0){//ตรวจสอบว่าต้องให้น้ำวาล์วไหนและวาล์นั้นต้องยังไม่ได้ให้น้ำ
                        let long = (waterRequire[i-1]/(pumpRate/1000));//ระยะเวลาในการให้น้ำ
                        let hourcalculate = Math.floor(long/60);
                        let minutecalculate = long-(hourcalculate*60);
                        let d = {
                            time : timeToWaterSupply.hours+':'+timeToWaterSupply.minute,
                            valve: i,
                            totalwater: round(waterRequire[i-1]),
                            hour: hourcalculate,
                            minute: round(minutecalculate)
                        }
                        openvalvenoti(d);//ส่งแจ้งเตือนไปยังผู้ใช้
                    }
                }
                tempTime = nowDate;
            }
            else if(manual==true&&nowDate.getTime()>=(tempTime.getTime()+(1000*60*10))){//ตรวจสอบเมื่อถึงเวลาว่าผู้ใช้ได้ให้น้ำหรือไม่
                for(let i=1;i<totalValve+1;i++){
                    if(duevalve[i-1]==0&&waterSupplyPerValve[i-1]==0&&waterRequire[i-1]>0){//หากยังไม่ได้ให้น้ำระบบจะให้ตามปริมาณที่คำนวนได้
                        openValveState(i);
                    }
                }
                manual = false;
                successWaterSupply = true;
            }
        }
    }
    if(successDalyLog==false&&nowDate.getHours()>=23&&nowDate.getMinutes()==30){//ถึงเวลาบันทึก log รายวัน
        successDalyLog = true;
        DalyLog.date = nowDate.getDate()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getFullYear();
        DalyLog.time = nowDate.getHours()+':'+nowDate.getMinutes();
        for(let i=0;i<duevalve.length;i++){
            if(duevalve[i]==0){
                DalyLog.effectiveIrr = round(waterSupplyPerValve[i]*1000/zoneSize[i],2);
            }
        }
        writeDataLog(DalyLog);//ส่งไปเก็บไว้บน database
    }

};
const dalyCalculate = ()=>{//คำนวนรายวัน
    var date = new Date();
    var dap = Math.floor((date.getTime()-startDate.getTime())/one_day);//อายุพืช
    var kc = (k[0]*(dap*dap*dap))+(k[1]*(dap*dap))-(k[2]*dap)+k[3];
    var et = p[date.getMonth()]*((e[0]*((temperature.max+temperature.min)/e[1]))+e[2]);
    // console.log((temperature.max+temperature.min)/e[1]);
    // console.log(temperature.min);
    // console.log(temperature.max);
    // console.log(temperature.max+temperature.min);
    // console.log(e[1]);
    var et0 = et*kc;//ETc
    // console.log('calculate')
    // console.log(dap);
    // console.log(kc);
    // console.log(et);
    // console.log(et0);
    if(temperature.max==0){//หากไม่มีข้อมูลจากกล่องเข้ามาเลยจะให้ค่าทั้งหมดเป็น 0
        et0 = 0;
        kc = 0;
        et = 0;
    }
    //เก็บข้อมูลไว้สำหรับการเขียน log รายวัน
    DalyLog.dap = dap;
    DalyLog.kc = round(kc,2);
    DalyLog.et = round(et,2);
    DalyLog.maxTemp = round(temperature.max,2);
    DalyLog.minTemp = round(temperature.min,2);
    DalyLog.avarageTemp = round((temperature.max+temperature.min)/2,2);
    DalyLog.tempRainVolume = round(tempRainVolume,2);
    DalyLog.soliMoisture = round(humidity,2);
    for(let i=1;i<totalValve+1;i++){//เก็บข้อมูลไว้ใน array ของแต่ละวาล์ว
        et0PerValve['valve'+i].push(et0);
        //console.log("et0"+et0);
        rainVolume['valve'+i].push(tempRainVolume);
    }




    for(let i=1;i<totalValve+1;i++){//สั่งคำนวนปริมาณน้ำที่ต้องให้ของฟทุกๆวาล์ว
        calculateWaterRequire(i);
    }
    dalyReset();//รีเซ็ตรายวัน
    calculateEndOfDay();//คำนวน end of day
}
const dataToApp = ()=>{//ส่งข้อมูลไปยังแอป
    const day = new Date();
    const d = {
        Date: day.getDay()+'/'+day.getDate()+'/'+(day.getMonth()+1)+'/'+day.getFullYear(),
        MaxTemp: temperature.max.toString(),
        MinTemp: temperature.min.toString(),
        Rain: round(tempRainVolume,1).toString(),
        Humidity: humidity.toString(),
        StartDate: startDate.getDate()+'/'+(startDate.getMonth()+1)+'/'+startDate.getFullYear(),
        NextValve: nextvalve.toString(),
        valveData: [],
    }
    for(var i=0;i<totalValve;i++){
        let due = new Date(day.getTime()+(duevalve[i]*one_day));
        let can_open='';
        if(duevalve[i]==0){//บอกว่าวาล์วนี้สามารถเปิดได้หรือไม่
            can_open = 'true';
        }
        else{
            can_open = 'false';
        }
        let long = (waterRequire[i]/(pumpRate/1000));//ระยะเวลาเปิดวาล์วสูงสุด
        let hour = Math.floor(long/60);
        let minute = long-(hour*60);
        let ValveData = {
            duedate: due.getDate()+'/'+(due.getMonth()+1)+'/'+due.getFullYear(),
            waterRequire: round(waterRequire[i],1).toString(),
            waterRequirePerDay: round(waterRequire[i]/(duevalve[i]+et0PerValve['valve'+(i+1)].length),1).toString(),
            canOpen: can_open,
            time: `${hour}:${round(minute,0)}`,
            zone: zoneSize[i].toString()
        }
        d.valveData.push(ValveData);
    }

    sendToApp(d,humidityDegree);//ส่งข้อมูลไปยังแอปโดยใช้ โมดูล Database
}

const saveState = ()=>{//บันทึกสถานะไว้backup
    let state = {
        Autosystem: autoSystem,
        TimeNoti: timeNoti,
        Noti: noti,
        SuccessNoti: successnoti,
        Lastconnect: lastconnect.getTime(),
        PumpRate: pumpRate,
        Interval: interval,
        TimeTowaterSupply: timeToWaterSupply,
        TempTime: tempTime.getTime(),
        ZoneSize: zoneSize,
        StartDate: startDate.getTime(),
        TotalValve: totalValve,
        Duevalve: duevalve,
        EtcPerValve: et0PerValve,
        ValveState: valveState,
        SuccessWaterSupply: successWaterSupply,
        WaterRequire: waterRequire,
        TempDate: tempDate.getTime(),
        TempRainVolume: tempRainVolume,
        RainVolume: rainVolume,
        WaterSupplyPerValve: waterSupplyPerValve,
        TempWatersupplyPerValve: tempWatersupplyPerValve,
        Temperature: temperature,
        Humidity: humidity,
        HumidityDegree: humidityDegree,
        HaveState: 'Yes',
        Daly: DalyLog,
        SuccessDalyLog: successDalyLog,
        CanSetConfig: canSetConfig,
        Duration: duration
    }
    writeState(state);
}

// const consoleState = ()=>{
//     console.log('state');
//     console.log(api);
//     console.log(autoSystem);
//     console.log(timeNoti);
//     console.log(noti);
//     console.log(successnoti);
//     console.log(lastconnect);
//     console.log(pumpRate);
//     console.log(interval);
//     console.log(timeToWaterSupply);
//     console.log(tempTime);
//     console.log(zoneSize);
//     console.log(startDate);
//     console.log(totalValve);
//     console.log(duevalve);
//     console.log(et0PerValve);
//     console.log(valveState);
//     console.log(successWaterSupply);
//     console.log(waterRequire);
//     console.log(tempDate);
//     console.log(tempRainVolume);
//     console.log(rainVolume);
//     console.log(waterSupplyPerValve);
//     console.log(tempWatersupplyPerValve);
//     console.log(temperature);
//     console.log(humidity);
//     console.log(humidityDegree);
// }

const checkState = ()=>{//ตรวจสอบว่ามีสถารนะหรือไม่
    getState(setState);
}
const setState = (state)=>{//น้ำข้อมูลสถานะที่มีเก็บไว้มาใช้
    //console.log(state);
    autoSystem = state.Autosystem;
    timeNoti = state.TimeNoti;
    noti = state.Noti;
    successnoti = state.SuccessNoti;
    lastconnect = new Date(state.Lastconnect);
    pumpRate = state.PumpRate;
    interval = state.Interval;
    timeToWaterSupply = state.TimeTowaterSupply;
    tempTime = new Date(state.TempTime);
    zoneSize = state.ZoneSize;
    startDate = new Date(state.StartDate);
    totalValve = state.TotalValve;
    duevalve = state.Duevalve;
    et0PerValve = state.EtcPerValve;
    valveState = state.ValveState;
    successWaterSupply = state.SuccessWaterSupply;
    waterRequire = state.WaterRequire;
    tempDate = new Date(state.TempDate);
    tempRainVolume = state.TempRainVolume;
    rainVolume = state.RainVolume;
    waterSupplyPerValve = state.WaterSupplyPerValve;
    tempWatersupplyPerValve = state.TempWatersupplyPerValve;
    temperature = state.Temperature;
    humidity = state.Humidity;
    humidityDegree = state.HumidityDegree;
    DalyLog = state.Daly;
    successDalyLog = state.SuccessDalyLog;
    canSetConfig = state.CanSetConfig;
    duration = state.Duration;
    if(canSetConfig==false){//หาก setconfig เป็น false แสดงว่ายังอยู่ในช่วงการทำงานภายในฤดูกาลนั้น ทำการตั้งค่า interval ต่างๆให้ทำงานตามปกติ
        clearInterval(intervalCheck);
        clearInterval(intervalValveOpen);
        clearInterval(intervalSaveWeekly);
        clearInterval(intervalCheckEndSeason);
        setCheck();
        intervalValveOpen = setInterval(countWater,1000); 
        intervalSaveWeekly = setInterval(saveWeeklyData,1000*60*60*24*7);
        intervalCheckEndSeason = setInterval(checkEndSeason,1000*60*60*5);
    }
}
const endSeason = ()=>{//เมื่อจบฤดูกาลจะทำการรีเซ็ตจ้อมูลทั้งหมด เพื่อเตรียมพร้อมสำหรับการเริ่มต้นฤดูใหม่
    let Zone = zoneSize
    saveCSV(totalValve,Zone);//บันทุกข้อมูลที่มีเก็บไว้ทั้งหมด
    setTimeout(newSeason,10000);//ลบข้อมูลที่มีออกจาก Database
    duration = 365;
    DalyLog = {
        dap: 0,
        date: '',
        time: '',
        maxTemp: 0,
        minTemp: 0,
        avarageTemp: 0,
        soliMoisture: 0,
        airMoisture: 0,
        tempRainVolume: 0,
        et: 0,
        kc: 0,
        on_off: 0,
        valve: 0,
        effectiveIrr: 0,
        effectivePrec: 0,
        valveData: [],
    }
    successDalyLog = false;
    autoSystem = true;
    timeNoti = {
        hour: 6,
        minute: 30
    };
    clearInterval(intervalSaveWeekly);
    noti = 1;
    successnoti = false;
    timeToWaterSupply = {
        hours:11,
        minute: 39
    };
    zoneSize = [0,0,0,0,0];
    totalValve = 0;
    duevalve=[];
    et0PerValve = {
        valve1: [],
        valve2: [],
        valve3: [],
        valve4: [],
        valve5: []
    };
    valveState = {
        1:false,
        2:false,
        3:false,
        4:false,
        5:false,
    }
    clearInterval(intervalValveOpen);
    clearInterval(intervalCheck);
    successWaterSupply = false;
    waterRequire = [0,0,0,0,0];
    tempRainVolume = 0;
    rainVolume = {
        valve1: [],
        valve2: [],
        valve3: [],
        valve4: [],
        valve5: []
    };
    waterSupplyPerValve = [0,0,0,0,0];
    tempWatersupplyPerValve = [0,0,0,0,0];
    temperature ={
        max: 0,
        min: 1000
    };
    humidity = 20;
    humidityDegree = '1';
    canSetConfig = true;
}
//consoleState();
const checkEndSeason = ()=>{
    let nowDate = new Date();
    if((nowDate.getTime()-startDate.getTime())/one_day>duration){//เมื่อระยะเวลาในการปลูกพืชมากกว่าหรือเท่ากับอายุพืชนั่นคือจบฤดูกาล
        endSeason();
        clearInterval(intervalCheckEndSeason);
    }
}
// let d = {
//     date: '10/2/2020',
//     time: '12:20',
//     long: 3,
//     rain: 2,
//     maxTemp: 23,
//     minTemp: 12,
//     soliMoisture: 33,
//     airHumidity: '22',
//     boxHumidity: '23',
//     maxTempBox: 23,
//     minTempBox: 11,
//     valve: 1,
//     totalWater: 1.2323,
//     dap: 12,
//     avarageTemp: 17,
//     tempRainVolume: 22,
//     et: 1.2323,
//     kc: 2.12,
//     on_off: 1,
//     effectiveIrr: 12.111,
//     effectivePrec: 12.111,
//     valveData: [{etc: 12.11,accEtc: 122.123},{etc: 12.11,accEtc: 122.123},{etc: 12.11,accEtc: 122.123}],
//     pumpRate: '65',
//     interval: '3',
//     totalValve: '3',
//     startDate: '12/12/2020',
    

// }
//dataToApp();
// const chectlogdowtime = ()=>{
//     writeSensorData(d);
// }
//setInterval(chectlogdowtime,10000);
checkState();//ตรวจสอบถานะเมื่อเริ่มโปรแกรมทุกครั้ง
intervalSaveState = setInterval(saveState,1000*60*60);//ทำการ บันทุกสภานะทุกๆ 1 ชัวโมง
//setCheck();

module.exports = {
    setConfig,
    sensorData,
    changeConfig,
    openValveState,
    closeValveState,
    openValveAutoOFF,
    setAutoSystem,
    calculateEndOfDay,
    setZone,
    setupNoti,
    setState,
    setDuration,
    setTotalValve
}
