const express = require("express");
const router = express.Router();
const multer = require("multer");
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, isOwner, validateListing } = require("../middleware");
const ListingController = require("../controllers/listing");
const { storage } = require("../cloudConfig");

const upload = multer({
    storage,
    limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
});

// Wrapper to catch multer errors (e.g. file too large) and flash them instead of crashing
const uploadSingle = (req, res, next) => {
    upload.single("listing[image]")(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            req.flash("error", "Image must be smaller than 1 MB.");
            return res.redirect("back");
        }
        if (err) return next(err);
        next();
    });
};

router.route("/")
    .get(wrapAsync(ListingController.index))
    .post(isLoggedIn, uploadSingle, validateListing, wrapAsync(ListingController.create));

router.get("/new", isLoggedIn, ListingController.renderNewForm);

router.route("/:id")
    .get(wrapAsync(ListingController.show))
    .put(isLoggedIn, isOwner, validateListing, wrapAsync(ListingController.update))
    .delete(isLoggedIn, isOwner, wrapAsync(ListingController.destroy));

router.get("/:id/edit", isLoggedIn, wrapAsync(ListingController.renderEditForm));

module.exports = router;