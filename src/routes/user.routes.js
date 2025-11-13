import { Router } from "express";
import { registerUser } from "../controllers/user.contoller.js";

import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// router.post("/register", registerUser);
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 5 },
  ]),
  registerUser
);

export default router;
