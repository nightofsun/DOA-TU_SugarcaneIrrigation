const http = require('http');
const url = require('url');
const { setConfig, closeValveState, openValveState, openValveAutoOFF, sensorData, setAutoSystem, setupNoti, setDuration, setTotalValve, setZone, changeConfig } = require('./module/control');
const { writeConfig,writeInformation ,writeNewConfig, setToken} = require('./module/database');
const { sendData } = require('./module/valve');
//const { writeConfig, readConfig, writeInformationFarmer } = require('./module/IOFile');

//ip and port
const host = '0.0.0.0';
const port = 2000;



const requestListener = (req, res) => {
    var data = url.parse(req.url, true).query;
    if(data.type == 'sensordata'){  //รับข้อมูลจากเซ็นเซอร์ที่กล่องควบคุมส่งมา
        let d = data;
        sensorData(d);  //เรียกใช้ฟังก์ชันในโมดูล control เพื่อจัดการกับข้อมูลเซ็นเซอร์
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('success');
    }
    else if(data.type == 'getRequest'){ //รับคำขอคำสั่งการทำการจากกล่อง
        sendData((dataTobox)=>{ //เรียกใช้ฟงก์ชันจากโมดูลวาล์วเพื่อทำตามคำขอ
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(dataTobox); //ส่งข้อมูลคำสั่งการทำงานกลับไปยังกล่องควบคุม
        })
    }
    else if(data.type == 'setZone'){    //แอปพลิเคชันส่งข้อมูลขนาดพื้นที่ในแต่ละโซนจ่ายน้ำมาให้
        let size = data;
        setZone(size);  //นำข้อมูลไปบันทึกและใช้งานภายในโมดูล control
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('success');

    }
    else if (data.type == 'writeConfig'){   //แอปพลิเคชันส่งข้อมูล config มาให้
        const input = data;
        if(data.interval>=data.totalValve){ //ตรวจสอบเงื่อนไขการตั้งค่านั่นคือ interval>=totalvalve
                    //console.log(`data = ${pumpRate} ${interval} ${timeToWaterSupply} ${dateStart} ${totalValve} ${valve} ${totalWaterPerValve}`)
            writeConfig(input); //นำข้อมูลที่ส่งมาไปเก็บบน database
            setConfig(input); //นำข้อมูลไปใช้ในโมดูล control
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('success');
        }
        else{
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('error');
        }

    }
    else if(data.type == 'token'){ //รับโทเคนจากแอปเพื่อทำการยิง notification
        const token = data.token;;
        setToken(token); //นำโทเคนไปเก็บบนโมดูล Database
        console.log(token);
    }
    else if(data.type == 'changeConfig'){//แอปส่งข้อมูล config ที่ผู้ใช้ทำการเปลี่ยนแปลงมาให้
        const input = data;
        if(data.interval>=data.totalValve){ //เซ็คเงื่อนไขการตั้งค่า
                    //console.log(`data = ${pumpRate} ${interval} ${timeToWaterSupply} ${dateStart} ${totalValve} ${valve} ${totalWaterPerValve}`)
            writeNewConfig(input); //นำไปเก็บบน Database
            changeConfig(input);//นำไปใช้ในโมดูล control
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('success');
        }
        else{
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('error');
        }
    }
    else if(data.type == 'writeInformation'){ //แอปส่งข้อมูลเกษตร
        const input = data;
        writeInformation(input) //นำข้อมูลเกษตรไปเก็บบนฐานข้อมูล
        setDuration(input.duration);    //นำข้อมูลเกี่ยวกับระยะเวลาในการปลูกพืชไปเก็บไว้ในโมดูล control เพื่อใช้ในการตรวจสอบจบฤดูกาล
        setTotalValve(input.totalValve); //นำข้อมูลจำนวนวาล์วไปเก็บบน โมดูล control
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('success');
    }
    else if(data.type == 'autoOff'){ //แอปสั่งการเปิดน้ำแบบปิดอัตโนมัติ
        let v = data.valve;//หมายเลขวาล์วที่เปิด
        let time = data.time;//ระยะเวลาที่เปิด
        openValveAutoOFF(v,time);//ให้ฟังก์ชันใน control ทำงาน
        res.writeHead(200, {'Content-Type': 'text/html'});
        console.log("autosuccess");
        res.end('autosuccess');
    }
    else if(data.type == 'openValve'){//แอปสั่งเปิดวาล์ว
        let v = data.valve;
        openValveState(v);//เรียกให้ฟังก์ชันใน โมดูล control ทำการเปิดน้ำ
        res.writeHead(200, {'Content-Type': 'text/html'});
        console.log("opensuccess");
        res.end('opensuccess');
    }
    else if(data.type == 'closeValve'){//แอปสั่งปิดวาล์ว
        let v = data.valve;
        closeValveState(v);//เรียกให้ฟังก์ชันใน โมดูล control ทำการปิดน้ำ
        res.writeHead(200, {'Content-Type': 'text/html'});
        console.log("closesuccess");
        res.end('closesuccess');
    }

    else if(data.type == 'setAuto'){//แอปเปลี่ยนรูปแบบการให้น้ำโดยจะส่งมาบอกว่า true || false
        if(data.auto=='true'){
            setAutoSystem(true);//หากเป็น true คือให้ระบบให้น้ำโดยอัตโนมัติ
        }
        else if(data.auto=='false'){
            setAutoSystem(false);//หากเป็น false คือเกษตรจะให้น้ำด้วยตนเอง
        }
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('success');
    }
    else if(data.type == 'setNoti'){//แอปส่งข้อมูลการตั้งค่าเกี่ยวกับการแจ้งเตือน
        let d = data;//ข้อมูลที่ส่งมาจะเป็น จำนวนวันที่จะให้แจ้งเตือนล่วงหน้าและเวลาที่จะให้แจ้งเตือน
        setupNoti(d);
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('success');
    }
    else{
        res.end('Wrong Requirement');
    }
    
};
const server = http.createServer(requestListener);
server.listen(port, host, ()=>{
    console.log("Server Start!!!");
    console.log("Running at http://"+host+":"+port);
});