const Listing = require("../model/listing");
const { cloudinary } = require("../cloudConfig");
const { syncAtlas } = require("../utils/dbSync");

// ── Geocoding helper ────────────────────────────────────────────────────────
const geocode = async (locationStr) => {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationStr)}.json?access_token=${process.env.MAP_TOKEN}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.features && data.features.length > 0) {
        return data.features[0].center; // [longitude, latitude]
    }
    return [0, 0]; // fallback
};

// GET /listings
module.exports.index = async (req, res) => {
    const q = (req.query.q || "").trim();
    let allListings;
    if (q) {
        const regex = new RegExp(q, "i");
        allListings = await Listing.find({
            $or: [{ title: regex }, { location: regex }, { country: regex }]
        });
    } else {
        allListings = await Listing.find({});
    }
    res.render("./listings/index.ejs", { allListings, searchQuery: q });
};

// GET /listings/suggestions?q=...
module.exports.suggestions = async (req, res) => {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 1) {
        return res.json([]);
    }
    const regex = new RegExp(q, "i");
    const matches = await Listing.find({
        $or: [{ title: regex }, { location: regex }, { country: regex }]
    })
        .limit(6)
        .select("title location country image _id");

    const results = matches.map((item) => ({
        id: item._id,
        title: item.title,
        location: `${item.location}, ${item.country}`,
        image: item.image?.url
    }));

    res.json(results);
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

    // Geocode the location and store coordinates
    const locationStr = `${rest.location}, ${rest.country}`;
    newListing.geometry.coordinates = await geocode(locationStr);

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

    const listing = await Listing.findById(id);

    if (req.file) {
        // A new image was uploaded — delete old one from Cloudinary (if it's a real upload)
        if (listing && listing.image && listing.image.filename && listing.image.filename !== "listingimage") {
            await cloudinary.uploader.destroy(listing.image.filename);
        }
        updateData.image = { url: req.file.path, filename: req.file.filename };
    }
    // else: no new file uploaded — keep the existing image as-is

    // Re-geocode if location or country changed
    const locationStr = `${rest.location || listing.location}, ${rest.country || listing.country}`;
    updateData.geometry = {
        type: "Point",
        coordinates: await geocode(locationStr)
    };

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