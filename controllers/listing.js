const Listing = require("../model/listing");
const { cloudinary } = require("../cloudConfig");
const { syncAtlas } = require("../utils/dbSync");

// GET /listings
module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("./listings/index.ejs", { allListings });
};

// GET /listings/new
module.exports.renderNewForm = (req, res) => {
    res.render("./listings/new");
};

// GET /listings/:id
module.exports.show = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({ path: "reviews", populate: "author" })
        .populate("owner");
    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }
    res.render("./listings/show", { listing });
};

// POST /listings
module.exports.create = async (req, res) => {
    let { _id, ...rest } = req.body.listing;
    const newListing = new Listing(rest);
    if (req.file) {
        newListing.image = { url: req.file.path, filename: req.file.filename };
    }
    newListing.owner = req.user._id;
    await newListing.save();

    // Synchronize the newly created listing to MongoDB Atlas (Development Sync)
    await syncAtlas(req, "createListing", { id: newListing._id, data: req.body.listing });
    req.flash("success", "Listing added");
    res.redirect("/listings");
};

// GET /listings/:id/edit
module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("./listings/edit", { listing });
};

// PUT /listings/:id
module.exports.update = async (req, res) => {
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
    await Listing.findByIdAndUpdate(id, updateData, { new: true });

    // Synchronize listing updates to MongoDB Atlas (Development Sync)
    await syncAtlas(req, "updateListing", { id, data: updateData });

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

// DELETE /listings/:id
module.exports.destroy = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findByIdAndDelete(id);

    // Delete image from Cloudinary if it exists
    if (listing && listing.image && listing.image.filename) {
        await cloudinary.uploader.destroy(listing.image.filename);
    }

    // Synchronize listing deletion (along with its reviews) to MongoDB Atlas (Development Sync)
    await syncAtlas(req, "deleteListing", { id });

    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};