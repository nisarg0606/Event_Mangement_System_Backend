const cors = require("cors");
const express = require("express");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

const dbconnect = require("./mongo/dbConnect.js");

const app = express();
app.use(cookieParser());

dotenv.config({ path: "./.env" });
dbconnect()

//Route files
const authRoutes = require("./routes/auth");
const hostRoutes = require("./routes/host")
const customerRoutes = require("./routes/customer.js")

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.text());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

app.use("/rest/auth", authRoutes);
app.use("/rest/host", hostRoutes);
app.use("/rest/customer", customerRoutes)

app.listen(process.env.PORT, () => {
  console.log(`Server is up and running on port: ${process.env.PORT}!`);
});
