const express = require("express");
const mongoose = require("mongoose");
const app = express();
const Listing = require("./model/listing");
const MONGO_URL = "mongodb://127.0.0.1:27017/airbnb";
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

app.listen(8080, () => {
    console.log("running on port 8080");
});


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
    const newListing = new Listing(req.body.listing);
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
    const listing = await Listing.findByIdAndUpdate(id, {
        ...rest,
        image: {
            filename: "listingimage",
            url: image,
        },
    });
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
