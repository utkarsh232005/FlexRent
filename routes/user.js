const express = require("express");
const router = express.Router();
const passport = require("passport");
const wrapAsync = require("../utils/wrapAsync");
const { saveRedirectUrl } = require("../middleware");
const UserController = require("../controllers/user");

router.route("/signup")
    .get(UserController.renderSignupForm)
    .post(wrapAsync(UserController.signup));

router.route("/login")
    .get(UserController.renderLoginForm)
    .post(saveRedirectUrl, passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }), UserController.login);

router.get("/logout", UserController.logout);

module.exports = router;