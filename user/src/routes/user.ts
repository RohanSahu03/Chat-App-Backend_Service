import express from "express";
import { getAllUsers, getById, loginUser, myProfile, verifyOtp } from "../controllers/user.js";
import { isAuth } from "../middleware/isAuth.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/verify-otp", verifyOtp);
router.get("/profile", isAuth, myProfile);
router.get("/user/:id", getById);
router.get("/users", getAllUsers);

export default router;