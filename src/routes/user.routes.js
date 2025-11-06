import { Router } from "express";
import { registerUser } from "../controllers/user.contoller.js";

const router = Router();

// router.post("/register", registerUser);
router.route("/register").get(registerUser);

export default router;
