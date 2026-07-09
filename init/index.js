const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../model/listing.js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/airbnb";
main()
    .then(() => console.log("connected to db"))
    .catch((err) => console.log(err));

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    await Listing.deleteMany({})
    await Listing.insertMany(initData.data);
    console.log("Database initialized with sample data");
}
initDB();