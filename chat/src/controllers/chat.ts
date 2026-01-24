import axios from "axios";
import TryCatch from "../config/trycatch.js";
import type { AuthenticatedRequest } from "../middlewares/isAuth.js";
import chat from "../models/chat.js";
import { Message } from "../models/Message.js";

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