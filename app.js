if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const Listing = require("./model/listing");
const MONGO_URL = process.env.MONGO_URL;
const LOCAL_MONGO_URL = process.env.LOCAL_MONGO_URL || "mongodb://127.0.0.1:27017/airbnb";
const dbUrl = MONGO_URL || LOCAL_MONGO_URL;

const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError");
const Review = require("./model/review");
const listings = require("./routes/listing.js");
const reviews = require("./routes/review.js");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const connectFlash = require("connect-flash");
const User = require("./model/user.js");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const userRouter = require("./routes/user.js");

const IS_VERCEL = !!process.env.VERCEL || process.env.NODE_ENV === "production";

let AtlasListing, AtlasReview;

async function connectDB() {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    await mongoose.connect(dbUrl);
}

connectDB()
    .then(() => console.log("connected to DB"))
    .catch((err) => console.error("DB connection error:", err));

if (!IS_VERCEL && MONGO_URL && dbUrl !== MONGO_URL) {
    const atlasConnection = mongoose.createConnection(MONGO_URL);
    atlasConnection.on("connected", () => console.log("connected to atlas db (Development Sync)"));
    atlasConnection.on("error", (err) => console.error("atlas db error:", err));

    AtlasListing = atlasConnection.model("Listing", Listing.schema);
    AtlasReview = atlasConnection.model("Review", Review.schema);
} else {
    AtlasListing = Listing;
    AtlasReview = Review;
}

app.set("AtlasListing", AtlasListing);
app.set("AtlasReview", AtlasReview);

// Ensure DB connection is ready before processing requests (fixes buffering timeout in serverless)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        next(err);
    }
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);

if (!process.env.VERCEL) {
    app.listen(8080, () => {
        console.log("running on port 8080");
    });
}

const secret = process.env.SECRET || "mysupersecretcode";

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: secret,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
    store,
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
};

app.use(session(sessionOptions));
app.use(connectFlash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//local variable middleware to store flash messages and user info
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

//root route
app.get("/", (req, res) => {
    res.render("./home");
});

app.use("/listings", listings);
app.use("/listings/:id/reviews", reviews);
app.use("/", userRouter);

app.get("/demouser", async (req, res) => {
    let fakeUser = new User({
        email: "student@gmail.com",
        username: "delta-student"
    });
    let registeredUser = await User.register(fakeUser, "helloworld");
    res.send(registeredUser);
});

//middleware
app.all("/*any", (req, res, next) => {
    next(new ExpressError("Page not found", 404));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "something went wrong" } = err;
    res.status(statusCode).render("error", { err: { statusCode, message, stack: err.stack } });
});

module.exports = app;
