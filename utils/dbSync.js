const IS_VERCEL = !!process.env.VERCEL || process.env.NODE_ENV === "production";

/**
 * Universal Atlas DB synchronization function.
 * Handles dual-writes to the MongoDB Atlas cluster for listings and reviews in local development environments.
 * 
 * @param {Object} req - The Express request object to retrieve database models.
 * @param {string} action - The action type to perform ('createListing', 'updateListing', 'deleteListing', 'createReview', 'deleteReview').
 * @param {Object} payload - Parameters for the database action.
 */
async function syncAtlas(req, action, payload) {
    if (IS_VERCEL) return;

    const AtlasListing = req.app.get("AtlasListing");
    const AtlasReview = req.app.get("AtlasReview");

    if (!AtlasListing || !AtlasReview) {
        console.error("Atlas database connections/models not initialized on the application instance.");
        return;
    }

    switch (action) {
        case "createListing": {
            const { id, data } = payload;
            const { image, ...rest } = data;
            const newAtlasListing = new AtlasListing({ _id: id, ...rest });
            if (image && image !== "") {
                newAtlasListing.image = { filename: "listingimage", url: image };
            }
            await newAtlasListing.save();
            break;
        }
        case "updateListing": {
            const { id, data } = payload;
            await AtlasListing.findByIdAndUpdate(id, data);
            break;
        }
        case "deleteListing": {
            const { id } = payload;
            let atlasListing = await AtlasListing.findById(id);
            if (atlasListing) {
                await AtlasReview.deleteMany({ _id: { $in: atlasListing.reviews } });
            }
            await AtlasListing.findByIdAndDelete(id);
            break;
        }
        case "createReview": {
            const { listingId, reviewId, data } = payload;
            let atlasListing = await AtlasListing.findById(listingId);
            if (atlasListing) {
                let newAtlasReview = new AtlasReview({ _id: reviewId, ...data });
                atlasListing.reviews.push(newAtlasReview);
                await newAtlasReview.save();
                await atlasListing.save();
            }
            break;
        }
        case "deleteReview": {
            const { listingId, reviewId } = payload;
            await AtlasListing.findByIdAndUpdate(listingId, { $pull: { reviews: reviewId } });
            await AtlasReview.findByIdAndDelete(reviewId);
            break;
        }
        default:
            throw new Error(`Unknown sync action: ${action}`);
    }
}

module.exports = {
    syncAtlas
};
