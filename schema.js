const Joi = require("joi");

const listingSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.number().required().min(0),
    image: Joi.string().allow("", null),
    location: Joi.string().required(),
    country: Joi.string().required(),
})

module.exports = listingSchema;