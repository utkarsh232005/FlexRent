const express = require("express");
const mongoose = require("mongoose");
const app = express();
const Listing = require("./model/listing");
const MONGO_URL = "mongodb://127.0.0.1:27017/airbnb";
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

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

//index route for listings
app.get("/listings", async (req, res) => {
    const allListings = await Listing.find({});
    res.render("./listings/index.ejs", { allListings });
});

//create route for listings
app.get("/listings/new", (req, res) => {
    res.render("./listings/new");
});

//show route for listings
app.get("/listings/:id", async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("./listings/show", { listing });
});


//create route for listings post request
app.post("/listings", async (req, res) => {
    const newListing = new Listing(req.body.listing);
    await newListing.save();
    res.redirect(`/listings`);
    console.log(newListing);
});


//update route for listings
app.get("/listings/:id/edit", async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("./listings/edit", { listing });
});

//update route for listings put request
app.put("/listings/:id", async (req, res) => {
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
});

//delete route for listings
app.delete("/listings/:id", async (req, res) => {
    let { id } = req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    res.redirect("/listings");
})



