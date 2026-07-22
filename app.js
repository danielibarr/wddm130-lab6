require("dotenv").config();

const express = require("express");
let mongoConnection = null;

async function connectDB(){

    if(mongoConnection){
        return;
    }

    mongoConnection = await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB");
}
const path = require("path");
const { body, validationResult } = require("express-validator");

const mongoose = require("mongoose");
const Submission = require("./models/Submission");

const app = express();


app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("form", {
        errors: [],
        values: {}
    });
});

app.post(
    "/submit",
    [
        body("name")
            .notEmpty()
            .withMessage("Name is required."),

        body("email")
            .isEmail()
            .withMessage("Email is not valid."),

        body("lunch")
            .notEmpty()
            .withMessage("Please select lunch."),

        body("tickets")
            .isNumeric()
            .withMessage("Tickets must be a valid number.")
            .custom(value => {

                if (Number(value) <= 0) {
                    throw new Error("Tickets must be greater than 0.");
                }

                return true;

            }),

        body("lunch")
            .custom((value, { req }) => {

                if (value === "yes" && Number(req.body.tickets) < 3) {

                    throw new Error(
                        "Lunch can only be purchased when buying 3 or more tickets."
                    );

                }

                return true;

            }),

        body("campus")
            .notEmpty()
            .withMessage("Please select campus."),

        body("postcode")
            .matches(/^[A-Z][0-9][A-Z]\s[0-9][A-Z][0-9]$/i)
            .withMessage("Post code is not valid."),

        body("phone")
            .matches(/^\(?(\d{3})\)?[\.\-\/\s]?(\d{3})[\.\-\/\s]?(\d{4})$/)
            .withMessage("Phone number is not valid.")
    ],
    async (req, res) => {

    await connectDB();
    const validationErrors = validationResult(req);

    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const postcode = req.body.postcode;
    const lunch = req.body.lunch;
    const tickets = parseInt(req.body.tickets);
    const campus = req.body.campus;

    let errors = validationErrors.array().map(error => error.msg);

    if (errors.length > 0) {

        res.render("form", {
            errors: errors,
            values: req.body
        });

    } else {

        let cost = tickets * 100;

        if (lunch === "yes") {
            cost += 60;
        }

        let tax = cost * 0.13;

        let total = cost + tax;

        const newSubmission = new Submission({

            name,
            email,
            phone,
            postcode,
            campus,
            tickets,
            lunch,
            subtotal: cost,
            tax,
            total

        });

        await newSubmission.save();

        res.render("result", {
            name,
            email,
            lunch,
            campus,
            cost,
            tax,
            total
        });
    }
});

app.get("/submissions", async (req, res) => {

    try {
        await connectDB();
        const submissions = await Submission.find();

        res.render("submissions", {
            submissions
        });

    } catch (error) {

        console.log(error);

        res.send("Error loading submissions");

    }

});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});