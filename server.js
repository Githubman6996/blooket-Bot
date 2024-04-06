const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, signInWithCustomToken, setPersistence } = require('firebase/auth');
const { getDatabase, ref, set, get, onValue } = require('firebase/database');
const request = require('request-promise');
var express = require("express");
const path = require("path");
const WebSocket = require("ws");
const app = express();
const { exec } = require('child_process');
const jimp = require('jimp');
import('node-fetch').then(({ default: fetch }) => {
  global.fetch = fetch;
}).catch(error => {
  console.error('Error importing node-fetch:', error);
});
request.get("https://play.blooket.com/play",function(a,resp,c){
global.cookiew = resp.headers["set-cookie"][0].split(";")[0];
console.log("Blooket Cookie Ready!");
});
app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "/index.html"));
});
app.get("/script.js", function(req, res) {
  res.sendFile(path.join(__dirname, "/script.js"));
});
app.get("/style.css", function(req, res) {
  res.sendFile(path.join(__dirname, "/style.css"));
});
const webserver = app.listen(process.env.PORT, function() {
  console.log('Webserver started on port ' + process.env.PORT + '!');
});
let wss = new WebSocket.Server({ noServer: true });
webserver.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, socket => {
    wss.emit('connection', socket, request);
  });
});
//wss msg format: {c:"control string",v:"value"}
wss.on('connection', function(ws, req) {
ws.send(JSON.stringify({c:"con"}));
console.log("Client connected!");
ws.sendJson = function(data){this.send(JSON.stringify(data));}
ws.log = function(msg,lvl){this.send(JSON.stringify({c:"log",l:lvl,v:msg}));}
ws.on('message', function(msg){
var control = JSON.parse(msg);
switch(control.c){
case "join":
if(ws.liveApp){deleteApp(ws.liveApp);ws.liveApp=false;}
connectToGame(control.gc,control.name,ws).then(e=>{if(ws.db){ws.sendJson({c:"bc",v:true});}});
break;
case "sv":
if(!ws.db){return;}
try{setVal(ws.db,control.val);}catch(e){ws.log("Error: "+e,"error");}
break;
case "leave":
if(ws.liveApp){deleteApp(ws.liveApp);ws.liveApp=false;ws.sendJson({c:"bc",v:false});}
break;
case "brosocr":
try{getBestBros(ws);}catch(e){ws.log("error","Something went wrong: " + e);}
break;
}
});
ws.on('close', function(){
console.log("Client disconnected!");
if(ws.liveApp){
deleteApp(ws.liveApp);ws.liveApp=false;}
});
});
//control stat is {c:"log",l:"loglevel",v:"logmessage"}
//bot connect is c:"bc"
//bot disconnect is c:"bdc"
async function connectToGame(gid,name,ws){
console.log("Connecting to game "+gid+" with name "+name);
const body = await request.put({body:{id:gid,name:name},json:true,uri:"https://fb.blooket.com/c/firebase/join",headers:{Cookie:global.cookiew}});
if(!body.success){ws.log("Connect Error: " + body.msg, "error");ws.sendJson({c:"bc",v:false});return;}
try{
var db = await connect(body,gid,name,ws);
ws.db = db;
onValue(ref(db,gid),(msg)=>{var data = msg.val();ws.sendJson({c:"update",v:data});});
}
catch(e){ws.log("Error: " + e, "error");return;}
}
async function connect(body,gameid,name,ws)
{		
		const liveApp = initializeApp({
                        apiKey: "AIzaSyCA-cTOnX19f6LFnDVVsHXya3k6ByP_MnU",
                        authDomain: "blooket-2020.firebaseapp.com",
                        projectId: "blooket-2020",
                        storageBucket: "blooket-2020.appspot.com",
                        messagingSenderId: "741533559105",
                        appId: "1:741533559105:web:b8cbb10e6123f2913519c0",
                        measurementId: "G-S3H5NGN10Z",
                        databaseURL: body.fbShardURL
                    }, name);
                    const auth = getAuth(liveApp);
                    await signInWithCustomToken(auth, body.fbToken);
                    const db =  getDatabase(liveApp);
		    ws.liveApp = liveApp;
await set(ref(db,`${gameid}/c/${name}`),{b:"Rainbow Astronaut",bg:"fire",rt:true});
return db;
}
function setVal(db,value){
set(ref(db,value.path),value.val);
}
//use setval like setVal(db,{path:"c/name",val:{b:"Rainbow Astronaut"}})
async function getBestBros(ws){
ws.log("block","sdisp");
ws.log("getting url","status");
exec('yt-dlp -g https://www.youtube.com/watch?v=YQXEUkL9-3U', (err, stdout, stderr) => {
  if (err) {
    // node couldn't execute the command
    console.log("failure");
    ws.log("BEST BROS STREAM FETCH FAILED!","error");
    return;
  }
ws.log("fetching video","status");
var cmd = 'ffmpeg -i "' + stdout.replace("\n","") + '" -frames:v 1 -y stream.png';
exec(cmd,function(e,stdout,stderr){console.log(stdout);console.log(stderr);jimp.read("stream.png").then(image=>{ws.log("cropping image","status");image.crop(1061,428,215,50).writeAsync("streamcropped.png").then(e=>{
//ocr here
tesseract.recognize("streamcropped.png","eng",{ logger: m => ws.log(m.status,"status") }).then((({ data: { text } })=>{
var gamecode = findGameCode(text);
if(gamecode){
ws.log(gamecode,"id");
}
else{
ws.log("Text recognition did not find a valid game code but found: " + text,"error");
}
ws.log("none","sdisp");
}));});});});});}
function findGameCode(str) {
  const regex = /\b\d{7}\b/;
  const match = str.match(regex);
  if (match) {
    return match[0];
  } else {
    return null;
  }
}