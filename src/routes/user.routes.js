import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateUserCoverImage,
  updateUserProfile,
  updateUserProfileImage,
} from "../controllers/user.contoller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// router.post("/register", registerUser);
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 5 },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/user").get(verifyJWT, getCurrentUser);
router.route("/user").post(verifyJWT, updateUserProfile);
router.route("/update-profile-image").post(verifyJWT, updateUserProfileImage);
router.route("/update-cover-image").post(verifyJWT, updateUserCoverImage);
router.route("/refresh-access-token").post(refreshAccessToken);

export default router;
