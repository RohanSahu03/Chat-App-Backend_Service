import axios from "axios";
import TryCatch from "../config/trycatch.js";
import type { AuthenticatedRequest } from "../middlewares/isAuth.js";
import chat from "../models/chat.js";
import { Message } from "../models/Message.js";
import { getReceiverSocketId, io } from "../config/socket.js";
import { isObjectIdOrHexString } from "mongoose";


export const createChat = TryCatch(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    const { otherUserId } = req.body;

    if (!otherUserId) {
        return res.status(400).json({ message: "Invalid user id" })
        return;
    }

    const existingChat = await chat.findOne({ users: { $all: [userId, otherUserId] } })
    if (existingChat) {
        return res.status(200).json({
            message: "Chat already exists",
            chat: existingChat._id
        })
    }
    const newChat = await chat.create({
        users: [userId, otherUserId]
    })
    return res.status(200).json({
        message: "Chat created",
        chat: newChat._id
    })
})

export const getAllChats = TryCatch(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    if (!userId) {
        return res.status(400).json({ message: "Invalid user id" })
    }
    const chats = await chat.find({ users: userId }).sort({ updatedAt: -1 })
    const chatWithUserData = await Promise.all(chats.map(async (chat) => {
        const otherUserId = chat.users.find((id) => id !== userId)

        const unseenCount = await Message.countDocuments({
            chatId: chat._id,
            seen: false,
            sender: {
                $ne: userId
            }
        })
        try {
            const { data } = await axios.get(`${process.env.USER_SERVICE_URL}/api/v1/user/${otherUserId}`)
            return {
                user: data,
                chat: {
                    ...chat.toObject(),
                    latestMessage: chat.latestMessage,
                    unseenCount
                }
            }
        } catch (error) {
            console.log(error);
            return {
                user: {
                    name: "Unknown",
                    _id: otherUserId
                },
                chat: {
                    ...chat.toObject(),
                    latestMessage: chat.latestMessage,
                    unseenCount
                }
            }

        }
    }))

    return res.status(200).json({
        message: "Chats fetched successfully",
        chats: chatWithUserData
    })
})

export const sendMessage = TryCatch(async (req: AuthenticatedRequest, res) => {
    const senderId = req.user?._id;
    const { chatId, text } = req.body;
    const imageFile = req.file;

    if (!senderId) {
        return res.status(400).json({ message: "Invalid user id" })
    }

    if (!chatId) {
        return res.status(400).json({ message: "Invalid chat id" })
    }

    if (!text && !imageFile) {
        return res.status(400).json({ message: "Invalid text or image" })
    }

    const Chat = await chat.findById(chatId)
    if (!Chat) {
        return res.status(400).json({ message: "chat not found" })
    }

    if (!Chat.users.includes(senderId)) {
        return res.status(400).json({ message: "You are not a part of this chat" })
    }

    const otherUserId = Chat.users.find((userId) => userId.toString() !== senderId.toString())

    if (!otherUserId) {
        return res.status(400).json({ message: "No other user found" })
    }
    //socket setup

    const receiverSocketId = getReceiverSocketId(otherUserId.toString());
    let isReceiverInChatRoom = false;
    if (receiverSocketId) {
        const receiverSocket = io.sockets.sockets.get(receiverSocketId);
        if (receiverSocket && receiverSocket.rooms.has(chatId)) {
            isReceiverInChatRoom = true;
        }
    }

    let messageData: {
        chatId: any;
        sender: any;
        seen: boolean;
        seenAt: Date | undefined;
        image?: {
            url: string;
            publicId: string;
        };
        messageType?: string;
        text?: string;
    } = {
        chatId,
        sender: senderId,
        seen: isReceiverInChatRoom,
        seenAt: isReceiverInChatRoom ? new Date() : undefined,
    }

    if (imageFile) {
        messageData.image = {
            url: imageFile.path,
            publicId: imageFile.filename
        };
        messageData.messageType = "image";
        messageData.text = text || "";
    }
    else {
        messageData.messageType = "text";
        messageData.text = text || "";
    }

    const message = new Message(messageData)
    const savedMessage = await message.save();

    const latestMessageText = imageFile ? "Image" : text;

    await chat.findByIdAndUpdate(chatId, {
        latestMessage: {
            text: latestMessageText,
            sender: senderId,

        },
        updatedAt: new Date()
    }, { new: true }
    )

    //emit to socket

    io.to(chatId).emit("newMessage", savedMessage)

    if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", savedMessage)
    }

    const senderSocketId = getReceiverSocketId(senderId.toString());
    if (senderSocketId) {
        io.to(senderSocketId).emit("newMessage", savedMessage)
    }

    if (isReceiverInChatRoom && senderSocketId) {
        io.to(senderSocketId).emit("messageSeen", {
            chatId,
            messageId: [savedMessage._id],
            seenBy: otherUserId
        })
    }

    res.status(201).json({
        message: savedMessage,
        sender: senderId,
    })

})

export const getMessagesByChat = TryCatch(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;
  
    if (!userId) {
        res.status(401).json({
            message: "Unauthorized",
        });
        return;
    }

    if (!chatId) {
        return res.status(400).json({ message: "Invalid chat id" });
    }


    /* ---------------- FETCH CHAT ---------------- */
    const Chat = await chat.findById(chatId);

    if (!Chat) {
        return res.status(404).json({ message: "chat not found" });
    }

    const isUserInChat = Chat.users.some((id) => id.toString() === userId.toString());

    if (!isUserInChat) {
        return res.status(403).json({ message: "You are not a part of this chat" });
    }


    const msgToMarkSeen = await Message.find({
        chatId,
        sender: { $ne: userId },
        seen: false
    });


    if (msgToMarkSeen.length > 0) {
        await Message.updateMany(
            { chatId, sender: { $ne: userId }, seen: false },
            { seen: true, seenAt: new Date() }
        );
    }

    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });

    const otherUserId = Chat.users.find(
        (id) => id.toString() !== userId.toString()
    );

    try {

        const { data } = await axios.get(
            `${process.env.USER_SERVICE_URL}/api/v1/user/${otherUserId}`
        );

        if (!otherUserId) {
            return res.status(400).json({ message: "No other user found" });
        }

        //socket work
        if(msgToMarkSeen.length>0){
            const otherUserSocketId = getReceiverSocketId(otherUserId.toString());
            if(otherUserSocketId){
                io.to(otherUserSocketId).emit("messageSeen", {
                    chatId,
                    messageId: msgToMarkSeen.map((msg) => msg._id),
                    seenBy: userId
                })
            }
        }

        return res.json({
            message:"Messages fetched successfully",
            messages,
            user:data
        })

    } catch (error: any) {
        console.error("❌ User service failed:", {
            message: error.message,
            status: error.response?.status
        });


        return res.json({
            messages,
            user:{
                name:"Unknown User",
                _id:otherUserId
            }
        })
    }
});
