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
const wrapAsync = require("./utils/wrapAsync");
const ExpressError = require("./utils/ExpressError");
const { listingSchema, reviewSchema } = require("./schema.js");
const Review = require("./model/review");

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

const validatelisting = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        throw new ExpressError(error.details[0].message, 400)
    } else {
        next();
    }
}
const validatereview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        throw new ExpressError(error.details[0].message, 400)
    } else {
        next();
    }
}

//index route for listings
app.get("/listings", wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("./listings/index.ejs", { allListings });
}));

//create route for listings
app.get("/listings/new", (req, res) => {
    res.render("./listings/new");
});

//show route for listings
app.get("/listings/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    res.render("./listings/show", { listing });
}));


//create route for listings post request
app.post("/listings", validatelisting, wrapAsync(async (req, res) => {
    let { image, ...rest } = req.body.listing;
    const listingId = new mongoose.Types.ObjectId();
    const newListing = new Listing({ _id: listingId, ...rest });
    if (image && image !== "") {
        newListing.image = { filename: "listingimage", url: image };
    }
    await newListing.save();

    if (!IS_VERCEL) {
        const newAtlasListing = new AtlasListing({ _id: listingId, ...rest });
        if (image && image !== "") {
            newAtlasListing.image = { filename: "listingimage", url: image };
        }
        await newAtlasListing.save();
    }

    res.redirect(`/listings`);
    console.log("Listing saved");
}));


//update route for listings
app.get("/listings/:id/edit", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("./listings/edit", { listing });
}));

//update route for listings put request
app.put("/listings/:id", validatelisting, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const { image, ...rest } = req.body.listing;
    const updateData = { ...rest };
    if (image && image !== "") {
        updateData.image = { filename: "listingimage", url: image };
    } else {
        updateData.image = {
            filename: "listingimage",
            url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8aG90ZWxzfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60"
        };
    }
    const listing = await Listing.findByIdAndUpdate(id, updateData, { new: true });

    if (!IS_VERCEL) {
        await AtlasListing.findByIdAndUpdate(id, updateData);
    }

    res.redirect(`/listings/${listing._id}`);
}));

//delete route for listings
app.delete("/listings/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);

    if (!IS_VERCEL) {
        let atlasListing = await AtlasListing.findById(id);
        if (atlasListing) {
            await AtlasReview.deleteMany({ _id: { $in: atlasListing.reviews } });
        }
        await AtlasListing.findByIdAndDelete(id);
    }

    console.log("Listing deleted");
    res.redirect("/listings");
}));

//Reviews
//post route
app.post("/listings/:id/reviews", validatereview, wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    const reviewId = new mongoose.Types.ObjectId();
    let newReview = new Review({ _id: reviewId, ...req.body.review });

    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();

    if (!IS_VERCEL) {
        let atlasListing = await AtlasListing.findById(req.params.id);
        let newAtlasReview = new AtlasReview({ _id: reviewId, ...req.body.review });
        atlasListing.reviews.push(newAtlasReview);
        await newAtlasReview.save();
        await atlasListing.save();
    }

    res.redirect(`/listings/${listing._id}`);
}));

//delete route for reviews
app.delete("/listings/:id/reviews/:reviewId", wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    if (!IS_VERCEL) {
        await AtlasListing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
        await AtlasReview.findByIdAndDelete(reviewId);
    }

    res.redirect(`/listings/${id}`);
}));

//middleware
app.all("/*any", (req, res, next) => {
    next(new ExpressError("Page not found", 404));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "something went wrong" } = err;
    res.status(statusCode).render("error", { err: { statusCode, message, stack: err.stack } });
});

module.exports = app;
