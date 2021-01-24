const firebase = require('firebase/app');
const fetch = require('node-fetch');
const valve = require('./valve');
require('firebase/auth');
require('firebase/database');
require('firebase/firestore');
const fs = require('fs');
//เก็บที่อยู่ของรูปที่ใช้ในการแจ้งเตือน
const openValvePicture = 'https://firebasestorage.googleapis.com/v0/b/arm-test-kotlin.appspot.com/o/139710253_166926591492386_6703717536615166401_n.jpg?alt=media&token=820a36fb-dc3a-4774-8df5-9cd0e9ed2640';
const downPicture = 'https://firebasestorage.googleapis.com/v0/b/arm-test-kotlin.appspot.com/o/138599437_217276986723325_6742609839678005802_n.jpg?alt=media&token=0361776b-c445-4738-bff0-a1c1d1cc426d';
const dueValvePicture = 'https://firebasestorage.googleapis.com/v0/b/arm-test-kotlin.appspot.com/o/139846001_1024837407925453_7230359648935453453_n.jpg?alt=media&token=efa73e3c-5758-458d-a424-d96becc54c77';
const carlendar = [
    'https://firebasestorage.googleapis.com/v0/b/arm-test-kotlin.appspot.com/o/138912631_861975211264557_5807053272329866652_n.jpg?alt=media&token=fa524e0f-28a2-4b52-8b4e-6a9a7051e1f0',
    'https://firebasestorage.googleapis.com/v0/b/arm-test-kotlin.appspot.com/o/139643036_526739308300337_7323941130976633497_n.jpg?alt=media&token=f6020c92-c65a-4b05-a289-abb9e72c4162',
    'https://firebasestorage.googleapis.com/v0/b/arm-test-kotlin.appspot.com/o/139360993_403400960922714_7605701390961187629_n.jpg?alt=media&token=b8803608-1fe2-42ce-aa7c-826a45925e59',
    'https://firebasestorage.googleapis.com/v0/b/arm-test-kotlin.appspot.com/o/139488725_238765027706612_2467291435947795712_n.jpg?alt=media&token=4523693d-b4e2-49c0-8b55-80a40c8e8779',
    'https://firebasestorage.googleapis.com/v0/b/arm-test-kotlin.appspot.com/o/139075620_126019706029884_6597850472436504978_n.jpg?alt=media&token=c99806a1-1d4d-4ed3-a3d6-7274e3657e08',
    'https://firebasestorage.googleapis.com/v0/b/arm-test-kotlin.appspot.com/o/139731794_1760358570792473_3480520602933232807_n.jpg?alt=media&token=58acdfdf-8de2-4265-af99-10d8da88f4cb',
    'https://firebasestorage.googleapis.com/v0/b/arm-test-kotlin.appspot.com/o/139636149_3476840252365399_8850879200061046716_n.jpg?alt=media&token=a8b28319-dcb3-4101-973c-e52fad16a274'
]

const key = 'AAAAtSNvJSE:APA91bFWylkNnfBEzLLhn2SPqRgSN4mdNCHcHjgYUjxT03SosX0cMm6twiHdoab2Lr-3HdGPtx7-LsHn4Th0T4O44c_x4X39DkPsBp6EN2XOGxBiBR9JuflT_jOjBrHeBq4ZByIhPc-V'//คีย์ในการส่งแจ้งเตือน
var token = ''//โทเคนในการส่งแจ้งเตือน
var countnoti = 3;//นับจำนวนแจ้งเตือน
var countDowtime = 1;//จำนวน log กล่องขาดการเชื่อมต่อ
var countSensorData = 1;//จำนวนข้อมูลเซ็นเซอร์ที่ได้จากกล่องมาทั้งหมด
var countLog = 1;//จำนวน log การเปิดน้ำของผู้ใช้
var countLogData = 1;//จำนวน log ๘้อมูลที่ต้องเก็บรายวัน
var season = 1;//เลขที่ฤดูกาลในการปลูก
const calendar = {//สิ่งที่แจ้งเตือนตามปฏิทินการเกษตร 
    1:[1],  //1 เตรียมดิน
    2:[1],  //2 เตรียมท่อนพันธ์
    3:[1,2,3],  //3 การปลูกอ้อย
    4:[1,2,3,4,5],  //4 การใส่ปุ๋ย
    5:[3,4,5],  //5 การกำจัดวัชพืช
    6:[4,5],    //6 การป้องกันไฟ
    7:[4,5,7],  //7 การให้น้ำ
    8:[4,5,7],
    9:[],
    10:[6],
    11:[6],
    12:[]
}
const setToken = (input)=>{//เก็บ token ในการใช้แจ้งเตือน
    token = input;
}
const firebaseConfig = {
    apiKey: "AIzaSyA5du6BN7EiuE_8QgX4PurPkLV2gCEAQSY",
    authDomain: "arm-test-kotlin.firebaseapp.com",
    databaseURL: "https://arm-test-kotlin-default-rtdb.firebaseio.com/",
    projectId: "arm-test-kotlin",
    storageBucket: "arm-test-kotlin.appspot.com",
    messagingSenderId: "777983567137",
    appId: "1:777983567137:web:f8efc99a52b8951c70ca60",
    measurementId: "G-QGXFTQ4CFS"
  };
  // Initialize Firebase
firebase.initializeApp(firebaseConfig);

const saveDatabaseState = ()=>{//เก็บ stateDatabase
    firebase.firestore().collection('Data').doc('databaseState').set({
        CountLog: countLog,
        CountDowtime: countDowtime,
        CountLogData: countLogData,
        CountSensorData: countSensorData,
        CountNoti: countnoti,
        Season: season,
        DatabaseState: 'Yes',
        Token: token
    });
}

const consolecheck = ()=>{
    console.log(countDowtime)
    console.log(countLog)
    console.log(countLogData)
    console.log(countSensorData)
    console.log(countnoti)
}

// setInterval(consolecheck,10000);
const loadState = ()=>{//ดึง state มาใช้
    firebase.firestore().collection('Data').where('DatabaseState','==','Yes').get().then((snaps)=>{
        snaps.forEach(function(docs){
            const snap = docs.data();
            countLog = snap.CountLog;
            countDowtime = snap.CountDowtime;
            countLogData = snap.CountLogData;
            countnoti = snap.CountNoti;
            countSensorData = snap.CountSensorData;
            season = snap.Season;
            token = snap.Token;
        })
    })
}

const writeConfig = (data)=>{//บันทึกข้อมูล config
    const db = firebase.database().ref('Farmer');
    db.child('Config').set({
        Interval: data.interval,
        PumpRate: data.pumpRate,
        Time: data.time,
        StartDate: data.startDate,
        TotalValve: data.totalValve
    });
}
const writeNewConfig = (data)=>{//บันทึกข้อมูล config ใหม่
    const db = firebase.database().ref('Farmer');
    db.child('Config').set({
        Interval: data.interval,
        Time: data.time,
        PumpRate: data.pumpRate
    });
}
const writeInformation = (data)=>{//บันทึกข้อมูลเกษตร
    let fertilize = data.fertilizer.split('-');
    const db = firebase.database().ref('Farmer');
    db.child('Information').set({
        ID: data.id,//หมายเลขบัตรประชาชน
        Name: data.name,
        CoordinateFarm: data.coordinate.toString(),//พิกัดแปลง
        Size: data.size,//ขนาดแปลง
        StartDate: data.startDate,
        Species: data.typeSugarcane,//พันธ์อ้อย
        Duration: data.duration,//ระยะเวลาในการปลูก 1 ฤดูกาล
        Fertilizer: {//ปุ๋ยที่ใช้
            N: fertilize[0],
            P: fertilize[1],
            K: fertilize[2]
        },
        Register: 'True'
    });
}
const downtime = (data)=>{//บันทึกการขาดการเชื่อมต่อของกล่อง
    const db = firebase.database().ref('Downtime');
    db.child(countDowtime).set({
        date: data.date,
        time: data.time,
        long: data.long+' hours' //เวลาในหน่วยชัวโมง
    });
    countDowtime++;
}
const writeSensorData = (data)=>{//บันทึกข้อมูลเซ็นเซอร์
    console.log(data);
    const db = firebase.database().ref('SensorData');
    db.child(countSensorData).set({
        Date: data.date,
        Time: data.time,
        RainVolume: data.rain,
        MaxTemp: data.maxTemp,
        MinTemp: data.minTemp,
        Solimoisture: data.soliMoisture,
        AirHumidity: data.airHumidity,
        BoxHumidity: data.boxHumidity,
        MaxTempBox: data.maxTempBox,
        MinTempBox: data.minTempBox
    });
    countSensorData++;
}

const writeLog = (data)=>{//บันทึกการให้น้ำของระบบ
   // console.log('asds');
    const db = firebase.database().ref('Log');
    db.child(countLog).set({
        Valve: data.valve,
        Water: data.totalWater,
        Date: data.date,
        Time: data.time,
        TimeOpenValve: data.timeOpenValve,
        Mode: data.mode
    });
    countLog++;
}

const writeDataLog = (data)=>{//บันทึกข้อมูลที่เก็บรายวัน
    const db = firebase.database().ref('DalyLog');
    db.child(countLogData).set({
        NO: countLogData,
        Day: data.dap,
        Date: data.date,
        Time: data.time,
        MaxTemp: data.maxTemp,
        MinTemp: data.minTemp,
        AvarageTemp: data.avarageTemp,
        AirMoisture: data.airMoisture,
        SoliMoisture: data.soliMoisture,
        Prec: data.tempRainVolume,
        ETp: data.et,
        Kc: data.kc,
        On_Off: data.on_off,
        Valve: data.valve,
        EffectiveIrr: data.effectiveIrr,
        EffectivePrec: data.effectivePrec,
    });

    for(var i=0;i<data.valveData.length;i++){
        firebase.database().ref('DalyLog/'+countLogData).child('valve'+(i+1)).set({
            Etc: data.valveData[i].etc,
            AccEtc: data.valveData[i].accEtc
        })
    }
    countLogData++;
}

const sendToApp = (data,humidity)=>{//บึนทึกข้อมูลเพื่อให้แอปดึงไปแสดง
    //console.log('check');
    const db = firebase.database().ref();
    firebase.firestore().collection('humidity').where('degree','==',humidity).get().then((snaps)=>{
        snaps.forEach((docs)=>{
            const humidityDegree = docs.data().text;
            console.log('check');
            db.child('application').set({
                Date: data.Date,
                MaxTemp: data.MaxTemp,
                MinTemp: data.MinTemp,
                Rain: data.Rain,
                HumidityDegree: humidityDegree,
                Humidity: data.Humidity,
                StartData: data.StartDate,
                NextValve: data.NextValve,
            })
            const v = firebase.database().ref('valve');
            for(var i=0;i<data.valveData.length;i++){
                //console.log('check');
                v.child(i+1).set({
                    DueDate: data.valveData[i].duedate,
                    WaterRequire: data.valveData[i].waterRequire,
                    WaterRequirePerDay: data.valveData[i].waterRequirePerDay,
                    Status: data.valveData[i].canOpen,
                    Time: data.valveData[i].time,
                    Zone: data.valveData[i].zone
                })
            }
        })
    })

}
const saveCSVDalyLog = (totalValve)=>{//ดึงข้อมูลรายวันออกจาก database มาเก็บ
    firebase.database().ref('DalyLog').once('value').then((snap)=>{
        const data = snap.val();
        console.log('day')
        console.log(data);
        if(data!=null){
            let csvContent = 'NO,Day,Date_M (Day/Month/Year),Time,MaxTemp (Celsius),MinTemp (Celsius),AvarageTemp (Celsius),AirMoisture (Percent),SoliMoisture (Percent),Prec (mm),ETp,Kc,On_Off,Valve,Effective_Irr (mm),Effective_Prec(mm)';
            for(let i=1;i<=totalValve;i++){
                csvContent +=`,Valve${i}_Etc (mm),Valve${i}_AccEtc (mm)`;
            }
            csvContent+='\n';
            data.forEach((d)=>{
                csvContent+=`${d.NO},${d.Day},${d.Date},${d.Time},${d.MaxTemp},${d.MinTemp},${d.AvarageTemp},${d.AirMoisture},${d.SoliMoisture},${d.Prec},${d.ETp},${d.Kc},${d.On_Off},${d.Valve},${d.EffectiveIrr},${d.EffectivePrec}`;
                for(let j=1;j<=totalValve;j++){
                    csvContent+=`,${d['valve'+j].Etc},${d['valve'+j].AccEtc}`;
                }
                csvContent+='\n';
            })
            
            fs.writeFile(__dirname+'/../Data/DalyLogSeason'+season+'.csv', csvContent, (error)=>{
                console.log(error);
            })
        }

    })
}
const saveCSVDowntimeLog = ()=>{//ดึงข้อมูลการขาดการเชื่อมต่อออกจาก database มาเก็บ
    firebase.database().ref('Downtime').once('value').then(function(snap){
        const data = snap.val();
        console.log(data);
        if(data!=null){
            let csvContent = 'NO,Date (Day/Month/Year),Time,Long (Hour)\n';
            let countNO = 1;
            data.forEach((d)=>{
            csvContent+=`${countNO},${d.date},${d.time},${d.long}\n`;
            countNO++;
            })
        
            fs.writeFile(__dirname+'/../Data/DowntimeSeason'+season+'.csv', csvContent, (error)=>{
                console.log(error);
            })
        }
    });
}

const saveCSVLogUser = ()=>{//ดึงข้อมูลการให้น้ำออกจาก database มาเก็บ
    firebase.database().ref('Log').once('value').then((snap)=>{
        const data = snap.val();
        console.log(data);
        if(data!=null){
            let csvContent = 'NO,Date (Day/Month/Year),Time,Valve,Water (Cubic Meter),OpenValveTime (minute),Mode\n';
            let countNO = 1;
            data.forEach((d)=>{
            csvContent+=`${countNO},${d.Date},${d.Time},${d.Valve},${d.Water},${d.TimeOpenValve},${d.Mode}\n`;
            countNO++;
            })
            fs.writeFile(__dirname+'/../Data/IrrigationLogSeason'+season+'.csv', csvContent, (error)=>{
                console.log(error);
            })
        }
        
    })
}
const saveCSVSensorData = ()=>{//ดึงข้อมูลเซ็นเซอร์ออกจาก database มาเก็บ
    firebase.database().ref('SensorData').once('value').then((snap)=>{
        const data = snap.val();
       // console.log(data);
        if(data!=null){
            let csvContent = 'NO,Date (Day/Month/Year),Time,MaxTemp (Celsius),MinTemp (Celsius),RainVolume (mm),Moisture (Percent),AirHumidity (Percent),MaxTempBox (Celsius),MinTempBox (Celsius),BoxHumidity(Percent)\n';
            let countNO = 1;
            data.forEach((d)=>{
                csvContent+=`${countNO},${d.Date},${d.Time},${d.MaxTemp},${d.MinTemp},${d.RainVolume},${d.Solimoisture},${d.AirHumidity},${d.MaxTempBox},${d.MinTempBox},${d.BoxHumidity}\n`;
               countNO++;
            })
            
            fs.writeFile(__dirname+'/../Data/SensorDataSeason'+season+'.csv', csvContent, (error)=>{
                console.log(error);
            })
        }
    })
}
const saveInformation = (ZoneSize)=>{//ดึงข้อมูลเกษตรออกจาก database มาเก็บ
    firebase.database().ref('Farmer/Information').once('value').then((snap)=>{
        const d = snap.val();
        console.log(d);
        let csvContent='';
            console.log(d.CoordinateFarm)
            let temp = d.CoordinateFarm.split(',');
            let latitude = temp[1].split(':');
            let longitude = temp[0].split(':');
            temp = d.Size.split('-');
            let size = (temp[0]*1600)+(temp[1]*400)+(temp[2]*4);
            csvContent=`ID,Name,Latitude,Longitude,Size (Square meters),StartDate (Day/Month/Year),Duration (Day),Species,Fertilizer`;
            for(let i=0;i<ZoneSize.length;i++){
                csvContent+=`,SizeZone${i+1} (Square meters)`;
            }
            csvContent+=`\n${d.ID},${d.Name},${latitude[1]},${longitude[1]},${size},${d.StartDate},${d.Duration},${d.Species},${d.Fertilizer.N}-${d.Fertilizer.P}-${d.Fertilizer.K}`
            for(let i=0;i<ZoneSize.length;i++){
                csvContent+=`,${ZoneSize[i]}`;
            }
        
        
        fs.writeFile(__dirname+'/../Data/FarmerInformation'+season+'.txt', csvContent, (error)=>{
            console.log(error);
        })
    })
}

const saveConfig = ()=>{//ดึงข้อมูลการตั้งค่าออกจาก database มาเก็บ
    firebase.database().ref('Farmer/Config').once('value').then((snap)=>{
        const d = snap.val();
        console.log(d);
        let csvContent=`Interval (Day),Pumprate (LiterPerMinute),Startdate (Day/Month/Year),Timewatersupply ,Totalvale\n`;
        csvContent += `${d.Interval},${d.PumpRate},${d.StartDate},${d.Time},${d.TotalValve}`
        fs.writeFile(__dirname+'/../Data/FarmerConfig'+season+'.txt', csvContent, (error)=>{
            console.log(error);
        })
    })
}

const saveCSV = (totalValve,ZoneSize)=>{//บันทึกข้อมูลทั้งหมดที่ต้องการบันทึกไว้
    saveCSVDalyLog(totalValve);
    saveCSVDowntimeLog();
    saveCSVSensorData();
    saveCSVLogUser();
    saveInformation(ZoneSize);
    saveConfig();
}
//saveCSV(2,[123,123,123,21,312]);
const duevalvenoti = (data)=>{//แจ้งเตือนให้น้ำล่วงหน้า
    firebase.firestore().collection('notidata').where('mont','==','no').get().then((snaps)=>{

        snaps.forEach(function(docs){
        const snap = docs.data();
        let titletemp = snap.title+snap.date+data.date+' '+snap.time+data.time;
        let detailtemp = snap.zone+data.valve+snap.totalwater+data.totalwater+snap.unit+' '+snap.long+data.hour+snap.unit2+' '+data.minute+snap.unit3;
        console.log(titletemp);
        console.log(detailtemp);
        let temp = countnoti;
        countnoti++;
       // console.log(snap.length);
        firebase.firestore().collection('noti').doc(temp.toString()).set({
            title: titletemp,
            detail: detailtemp,
            image: dueValvePicture
        })
        noti(titletemp);
        })
        
    })
}
//duevalvenoti({date:'12/12/2020',time:'9:20',valve:'2',totalwater:'22',hour:'2',minute:'33'});
const openvalvenoti = (data)=>{//แจ้งเตือนให้น้ำ
    firebase.firestore().collection('notidata').where('mont','==','no').get().then((snaps)=>{

        snaps.forEach(function(docs){
        const snap = docs.data();
        let titletemp = snap.title+snap.now+' '+snap.time+data.time;
        let detailtemp = snap.zone+data.valve+snap.totalwater+data.totalwater+snap.unit+' '+snap.long+data.hour+snap.unit2+' '+data.minute+snap.unit3;
        console.log(titletemp);
        console.log(detailtemp);
        console.log(snap.length);
        firebase.firestore().collection('noti').doc('1').set({
            title: titletemp,
            detail: detailtemp,
            image: openValvePicture
        });
        noti(titletemp);
        })
        
    })
}
//openvalvenoti({date:'13/12/2020',time:'9:00',valve:'3',totalwater:'22',hour:'2',minute:'33'});
const downtimenoti = ()=>{//แจ้งเตือนเมื่อกล่องขาดการเชื่อมต่อมากกว่า 2 วัน
    firebase.firestore().collection('notidata').where('mont','==','down').get().then((snaps)=>{

        snaps.forEach(function(docs){
        const snap = docs.data();
        let titletemp = snap.title;
        let detailtemp = snap.detail;
        console.log(titletemp);
        console.log(detailtemp);
        console.log(snap.length);
        firebase.firestore().collection('noti').doc('2').set({
            title: titletemp,
            detail: detailtemp,
            image: downPicture
        });
        noti(titletemp);
        })
        
    })
}
//downtimenoti();
// var d1 = {
//     date: '64/12/12',
//     time: '13:22',
//     long: 23
// }
// downtime(d1);
const clearnoti = ()=>{//ลบการแจ้งเตือนทั้งหมด
    for(let i=1;i<=countnoti;i++){
        firebase.firestore().collection('noti').doc(i.toString()).delete();
    }
    countnoti = 3;
}
const calendarnoti = (month)=>{//แจ้งเตือนปฏิทินเกษตร
    let temp = calendar[month];
    console.log(temp)
    let doing = ''
    let countdoing = 0;
    for(let i=0;i<temp.length;i++){//ตรวจดูว่าต้องแจ้งเตือนเรื่องใดบ้าง
        firebase.firestore().collection('notidata').where('no','==',temp[i].toString()).get().then((snaps)=>{
            snaps.forEach(function(docs){
            const snap = docs.data();
            const t = countnoti;
            countnoti++;
            firebase.firestore().collection('noti').doc(t.toString()).set({
                title: snap.title,
                detail: snap.detail,
                image: carlendar[temp[i]-1]
            });
            noti(snap.title);
            if(countdoing<2){
                doing+=`${snap.title}\n`;
                countdoing++;
            }
            else if(countdoing==2){
                doing+=`${snap.title}`;
                countdoing++;
            }
            
            })
            firebase.database().ref().child('Do').set({
                Doing: doing
            });
        });
    }
}
//calendarnoti(4);
//calendarnoti(7);
//calendarnoti(10);
const writeState = (state)=>{//บันทึกข้อมูล state ของ control
    firebase.firestore().collection('Data').doc('State').set(state);
}
const getState = (callback)=>{//ดึงข้อมูล state ของ control และนำกลับไปใช้
    //console.log('staaaaaa');
    firebase.firestore().collection('Data').where('HaveState','==','Yes').get().then((snaps)=>{
        snaps.forEach(function(docs){
            const snap = docs.data();
            console.log("snap"+snap);
            callback(snap);
        })
    })
}
const newSeason = ()=>{//รีเซ็ตเมื่อเริ่มต้นฤดูกาลใหม่
    countDowtime = 1;
    countSensorData = 1;
    countLog = 1;
    countLogData = 1;
    season++;
    firebase.database().ref('Downtime').remove();
    firebase.database().ref('DalyLog').remove();
    firebase.database().ref('Log').remove();
    firebase.database().ref('SensorData').remove();
    //firebase.database().ref('appliication').remove();
}

// writeConfig(5,70,'12:21','12/12/63',4);
//writeInformation('123213','ณัฐพันธ์ อะไรนะ','12.321,33.3223',1600,'12/12/63','พันธ์ดี','120','12-12-12')
// writeSensorData('63/12/24','13:00',12.4,34,12,40)
// writeLog('63/12/24','13:24',4,230);
// sendToApp('12/12/63',35,12,32,'แห้ง',12,'10/10/63',25,[{duedate:'13/12/63',waterRequire:345,waterRequirePerDay:233},{duedate:'14/12/63',waterRequire:333,waterRequirePerDay:263}])
loadState();//โหลด state เมื่อเริ่มทำงาน
setInterval(saveDatabaseState,1000*60*60);//บันทึก state ทุกๆ 1 ชัวโมง
const noti = (data)=>{//ยิงแจ้งเตือน
    (async () => {
        const rawResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'key='+key
          },
          body: JSON.stringify(
            {   "notification": {
                "title": "Notification",
                "text": data
        
            },
        
            "to" : token
        })
        });
        const content = await rawResponse.json();
        //console.log(content);
      })();
}
module.exports = {
    writeConfig,
    writeInformation,
    writeLog,
    writeSensorData,
    sendToApp,
    writeNewConfig,
    duevalvenoti,
    openvalvenoti,
    clearnoti,
    calendarnoti,
    downtime,
    downtimenoti,
    writeState,
    getState,
    writeDataLog,
    saveCSV,
    newSeason,
    setToken
};
