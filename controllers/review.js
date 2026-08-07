const Listing = require("../model/listing");
const Review = require("../model/review");
const { syncAtlas } = require("../utils/dbSync");

// POST /listings/:id/reviews
module.exports.create = async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    let { _id, ...reviewData } = req.body.review;
    let newReview = new Review(reviewData);
    newReview.author = req.user._id;
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();

    // Synchronize the newly created review to MongoDB Atlas (Development Sync)
    await syncAtlas(req, "createReview", { listingId: req.params.id, reviewId: newReview._id, data: req.body.review });

    req.flash("success", "Review Created!");
    res.redirect(`/listings/${listing._id}`);
};

// DELETE /listings/:id/reviews/:reviewId
module.exports.destroy = async (req, res) => {
    let { id, reviewId } = req.params;

    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    // Synchronize review deletion to MongoDB Atlas (Development Sync)
    await syncAtlas(req, "deleteReview", { listingId: id, reviewId });

    req.flash("success", "Review Deleted!");
    res.redirect(`/listings/${id}`);
};
