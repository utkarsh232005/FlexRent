const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/ExpressError");
const { listingSchema, reviewSchema } = require("../schema.js");
const Listing = require("../model/listing");
const { syncAtlas } = require("../utils/dbSync");

const validatelisting = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        throw new ExpressError(error.details[0].message, 400)
    } else {
        next();
    }
}

//index route for listings
router.get("/", wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("./listings/index.ejs", { allListings });
}));

//create route for listings
router.get("/new", (req, res) => {
    res.render("./listings/new");
});

//show route for listings
router.get("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    res.render("./listings/show", { listing });
}));


//create route for listings post request
router.post("/", validatelisting, wrapAsync(async (req, res) => {
    let { image, ...rest } = req.body.listing;
    const listingId = new mongoose.Types.ObjectId();
    const newListing = new Listing({ _id: listingId, ...rest });
    if (image && image !== "") {
        newListing.image = { filename: "listingimage", url: image };
    }
    await newListing.save();

    // Synchronize the newly created listing to MongoDB Atlas (Development Sync)
    await syncAtlas(req, "createListing", { id: listingId, data: req.body.listing });

    res.redirect(`/listings`);
    console.log("Listing saved");
}));

//update route for listings
router.get("/:id/edit", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("./listings/edit", { listing });
}));

//update route for listings put request
router.put("/:id", validatelisting, wrapAsync(async (req, res) => {
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

    // Synchronize listing updates to MongoDB Atlas (Development Sync)
    await syncAtlas(req, "updateListing", { id, data: updateData });

    res.redirect(`/listings/${listing._id}`);
}));

//delete route for listings
router.delete("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);

    // Synchronize listing deletion (along with its reviews) to MongoDB Atlas (Development Sync)
    await syncAtlas(req, "deleteListing", { id });

    console.log("Listing deleted");
    res.redirect("/listings");
}));

module.exports = router;