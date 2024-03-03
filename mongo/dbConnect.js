const mongoose = require('mongoose');

function dbconnect() {
  mongoose.connect(process.env.MONGO_URI, {
    useUnifiedTopology: true
  });

  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error: "));
  db.once("open", function () {
    console.log("Database connected successfully");
  });
}

module.exports = dbconnect;