const User = require("../model/user");
const passport = require("passport");

// GET /signup
module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};

// POST /signup
module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, password } = req.body;
        let newUser = new User({ email, username });
        let registeredUser = await User.register(newUser, password);
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
};

// GET /login
module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

// POST /login (after passport.authenticate)
module.exports.login = async (req, res, next) => {
    req.flash("success", "Welcome back to FlexRent!");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    req.session.save((err) => {
        if (err) return next(err);
        res.redirect(redirectUrl);
    });
};

// GET /logout
module.exports.logout = (req, res, next) => {
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
};
