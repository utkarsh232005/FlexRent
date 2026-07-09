if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const Listing = require("./model/listing");
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/airbnb";
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync");
const ExpressError = require("./utils/ExpressError");
const listingSchema = require("./schema.js");

main()
    .then(() => console.log("connected to db"))
    .catch((err) => console.log(err));

async function main() {
    await mongoose.connect(MONGO_URL);
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
    const listing = await Listing.findById(id);
    res.render("./listings/show", { listing });
}));


//create route for listings post request
app.post("/listings", validatelisting, wrapAsync(async (req, res) => {
    let { image, ...rest } = req.body.listing;
    const newListing = new Listing(rest);
    if (image && image !== "") {
        newListing.image = { filename: "listingimage", url: image };
    }
    await newListing.save();
    res.redirect(`/listings`);
    console.log(newListing);
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
    const listing = await Listing.findByIdAndUpdate(id, updateData);
    res.redirect(`/listings/${listing._id}`);
    // console.log(listing);
}));

//delete route for listings
app.delete("/listings/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    res.redirect("/listings");
}));

app.all("/*any", (req, res, next) => {
    next(new ExpressError("Page not found", 404));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "something went wrong" } = err;
    res.status(statusCode).render("error", { err: { statusCode, message, stack: err.stack } });
});

module.exports = app;
