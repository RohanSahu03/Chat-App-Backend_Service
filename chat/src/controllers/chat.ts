import TryCatch from "../config/trycatch.js";
import type { AuthenticatedRequest } from "../middlewares/isAuth.js";
import chat from "../models/chat.js";

export const createChat = TryCatch(async (req:AuthenticatedRequest, res) => {
   const userId = req.user?._id;
   const {otherUserId} = req.body;

   if(!otherUserId){
    return res.status(400).json({message:"Invalid user id"})
    return;
   }

   const existingChat = await chat.findOne({users:{$all:[userId,otherUserId]}})
   if(existingChat){
    return res.status(200).json({
        message:"Chat already exists",
        chat:existingChat._id
    })
   }
   const newChat = await chat.create({
    users:[userId,otherUserId]
   })
   return res.status(200).json({
    message:"Chat created",
    chat:newChat._id
   })
})