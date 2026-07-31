const express = require("express");
const router = express.Router();
const User = require("../model/user");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");

router.get("/signup", (req, res) => {
    res.render("users/signup.ejs");
});

router.post("/signup", wrapAsync(async (req, res, next) => {
    try {
        let { username, email, password } = req.body;
        let newUser = new User({ email, username });
        let registeredUser = await User.register(newUser, password);
        console.log(registeredUser);
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to FlexRent!");
            req.session.save((err) => {
                if (err) return next(err);
                res.redirect("/listings");
            });
        });
    } catch (e) {
        req.flash("error", e.message);
        req.session.save(() => {
            res.redirect("/signup");
        });
    }
}));

router.get("/login", (req, res) => {
    res.render("users/login.ejs");
});

router.post("/login", passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }), async (req, res, next) => {
    req.flash("success", "Welcome back to FlexRent!");
    req.session.save((err) => {
        if (err) return next(err);
        res.redirect("/listings");
    });
});

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "Logged out successfully!");
        req.session.save((err) => {
            if (err) return next(err);
            res.redirect("/listings");
        });
    });
});

module.exports = router;