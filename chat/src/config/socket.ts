import {Server,Socket} from 'socket.io'
import http from 'http';
import express from 'express';


const app = express();

const server = http.createServer(app);

const io = new Server(server,{
    cors:{
        origin:"*",
        methods:["GET","POST"],
    }
});

const userSocketMap:Record<string,string> = {};
io.on("connection",(socket:Socket)=>{
    console.log("User connected",socket.id);
    const userId = socket.handshake.query.userId as string | undefined

    if(userId && userId !== "undefined"){
        userSocketMap[userId]=socket.id
        console.log(`User ${userId} mapped to socket ${socket.id}`);
        
    }

    io.emit("getOnlineUser",Object.keys(userSocketMap))

    socket.on("disconnect",()=>{
        console.log("user disconnected",socket.id);
        if(userId){
            delete userSocketMap[userId];
            console.log(`user ${userId} removed from online users`);
            io.emit("getOnlineUser",Object.keys(userSocketMap))
            
        }
    })
    
    socket.on("connect_error",(error)=>{
       console.log("Socket connection Error",error);
        
    })
});



export {app,server};