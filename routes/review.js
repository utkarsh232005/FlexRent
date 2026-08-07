const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, validateReview, isReviewAuthor } = require("../middleware");
const ReviewController = require("../controllers/review");

router.route("/")
    .post(isLoggedIn, validateReview, wrapAsync(ReviewController.create));

router.route("/:reviewId")
    .delete(isLoggedIn, isReviewAuthor, wrapAsync(ReviewController.destroy));

module.exports = router;
