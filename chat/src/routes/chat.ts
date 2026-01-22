import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { createChat } from "../controllers/chat.js";
const router = express.Router();

router.post("/chat/new", isAuth, createChat);

export default router;