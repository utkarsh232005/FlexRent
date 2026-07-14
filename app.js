if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const Listing = require("./model/listing");
const MONGO_URL = process.env.MONGO_URL;
const LOCAL_MONGO_URL = process.env.LOCAL_MONGO_URL || "mongodb://127.0.0.1:27017/airbnb";
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError");
const Review = require("./model/review");
const listings = require("./routes/listing.js");
const reviews = require("./routes/review.js");

const IS_VERCEL = !!process.env.VERCEL || process.env.NODE_ENV === "production";

let AtlasListing, AtlasReview;

if (IS_VERCEL) {
    main()
        .then(() => console.log("connected to Atlas db (Production)"))
        .catch((err) => console.log(err));

    async function main() {
        await mongoose.connect(MONGO_URL);
    }

    AtlasListing = Listing;
    AtlasReview = Review;
} else {
    main()
        .then(() => console.log("connected to local db"))
        .catch((err) => console.log(err));

    async function main() {
        await mongoose.connect(LOCAL_MONGO_URL);
    }

    const atlasConnection = mongoose.createConnection(MONGO_URL);
    atlasConnection.on("connected", () => console.log("connected to atlas db (Development Sync)"));
    atlasConnection.on("error", (err) => console.error("atlas db error:", err));

    AtlasListing = atlasConnection.model("Listing", Listing.schema);
    AtlasReview = atlasConnection.model("Review", Review.schema);
}

app.set("AtlasListing", AtlasListing);
app.set("AtlasReview", AtlasReview);

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

//root route
app.get("/", (req, res) => {
    res.render("./home");
});

app.use("/listings", listings);
app.use("/listings/:id/reviews", reviews);

//middleware
app.all("/*any", (req, res, next) => {
    next(new ExpressError("Page not found", 404));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "something went wrong" } = err;
    res.status(statusCode).render("error", { err: { statusCode, message, stack: err.stack } });
});

module.exports = app;
