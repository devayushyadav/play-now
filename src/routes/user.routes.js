import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
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
router.route("/refresh-access-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/user").get(verifyJWT, getCurrentUser);

// use patch other wise it will replace the whole user object
router.route("/user").patch(verifyJWT, updateUserProfile);
router
  .route("/update-profile-image")
  .patch(verifyJWT, upload.single("avatar"), updateUserProfileImage);
router
  .route("/update-cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/channel/:username").get(getUserChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);

export default router;
