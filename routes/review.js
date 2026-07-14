const express = require("express");
const router = express.Router({ mergeParams: true });
const mongoose = require("mongoose");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/ExpressError");
const { reviewSchema } = require("../schema.js");
const Listing = require("../model/listing");
const Review = require("../model/review");
const { syncAtlas } = require("../utils/dbSync");

const validatereview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        throw new ExpressError(error.details[0].message, 400);
    } else {
        next();
    }
};

// Reviews POST Route
router.post("/", validatereview, wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    const reviewId = new mongoose.Types.ObjectId();
    let newReview = new Review({ _id: reviewId, ...req.body.review });

    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();

    // Synchronize the newly created review to MongoDB Atlas (Development Sync)
    await syncAtlas(req, "createReview", { listingId: req.params.id, reviewId, data: req.body.review });

    res.redirect(`/listings/${listing._id}`);
}));

// Reviews DELETE Route
router.delete("/:reviewId", wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;

    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    // Synchronize review deletion to MongoDB Atlas (Development Sync)
    await syncAtlas(req, "deleteReview", { listingId: id, reviewId });

    res.redirect(`/listings/${id}`);
}));

module.exports = router;
