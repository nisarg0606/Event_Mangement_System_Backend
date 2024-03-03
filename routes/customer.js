const express = require("express");
const app = express();

const { requireAuth } = require("../middleware/authMiddleware");
const venues = require("../mongo/venue/venues");
const activities = require("../mongo/activity/activities");
const bookings = require("../mongo/records/bookings");
const activityBookings = require("../mongo/records/activityBookings");

const accounts = require("../mongo/user/accounts");

const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const CLIENT_EMAIL = process.env.EMAIL; //your email from where you'll be sending emails to users
const CLIENT_ID = process.env.OAUTH_CLIENTID; // Client ID generated on Google console cloud
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET; // Client SECRET generated on Google console cloud
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI; // The OAuth2 server (playground)
const REFRESH_TOKEN = process.env.OAUTH_REFRESH_TOKEN; // The refreshToken we got from the the OAuth2 playground

app.get("/fetch-venues", requireAuth, async (req, res) => {
  try {
    let venueList = (await venues.find({})) || [];
    res.status(200).send({ venues: venueList });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});

app.get("/venue-details", requireAuth, async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      res.status(400).send({ error: "UID is missing" });
    }
    let venueDetails = (await venues.findOne({ uid: uid })) || null;
    if (venueDetails) {
      res.status(200).send({ venues: venueDetails });
    } else {
      res.status(404).send({ venues: venueDetails });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});

app.post("/book-venue", requireAuth, async (req, res) => {
  try {
    const { cid, vid, selectedTimings } = req.body;
    const venueDetails = await venues.findOne(
      { uid: vid },
      { _id: 0, host_id: 1, name: 1 }
    );
    const customerDetails = await accounts.findOne(
      { uid: cid },
      { email: 1, username: 1 }
    );
    selectedTimings.map(
      async (record) =>
        await bookings.create({
          customer_uid: cid,
          venue_uid: vid,
          host_uid: venueDetails.host_id,
          booking_date: record[1],
          booking_time_slot: record[0],
        })
    );

    if ((customerDetails, venueDetails))
      sendMail(customerDetails, venueDetails, selectedTimings);
    res.status(200).send({ host: "record Successfully Inserted" });
  } catch (err) {
    res.status(500).send({ error: "Server Error" });
  }
});

//venue bookings
app.get("/booking-status", requireAuth, async (req, res) => {
  try {
    const { vid } = req.query;
    if (!vid) {
      res.status(400).send({ error: "Venue ID is missing" });
      return;
    }
    let bookingRecords = await bookings.find({ venue_uid: vid });
    res.status(200).send({ records: bookingRecords });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});

//fetch a customer's venue bookings
app.get("/bookings", requireAuth, async (req, res) => {
  try {
    const { cid } = req.query;
    if (!cid) {
      res.status(400).send({ error: "Venue ID is missing" });
      return;
    }
    let bookingRecords = await bookings.find({ customer_uid: cid });
    res.status(200).send({ records: bookingRecords });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});

// Activities
app.get("/fetch-activities", requireAuth, async (req, res) => {
  try {
    let activityList = (await activities.find({})) || [];
    res.status(200).send({ venues: activityList });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});
//get a single activity's details
app.get("/activity-details", requireAuth, async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      res.status(400).send({ error: "UID is missing" });
    }
    let activityDetails = (await activities.findOne({ uid: uid })) || null;
    if (activityDetails) {
      res.status(200).send({ venues: activityDetails });
    } else {
      res.status(404).send({ venues: venueDetails });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});

app.post("/book-activity", requireAuth, async (req, res) => {
  try {
    const { cid, aid } = req.body;
    const activityDetails = await activities.findOne(
      { uid: aid },
      { _id: 0, host_id: 1, name: 1, date: 1, time: 1 }
    );
    const customerDetails = await accounts.findOne(
      { uid: cid },
      { email: 1, username: 1 }
    );
    const Activity = await activities.findOne(
      { uid: aid },
      { _id: 0, host_id: 1, time: 1, date: 1, participants_uids: 1 }
    );

    if (!Activity) {
      res.status(404).send({ err: "Activity not found" });
      return;
    }

    await activityBookings.create({
      customer_uid: cid,
      activity_uid: aid,
      host_uid: Activity.host_id,
      booking_date: Activity.date,
      booking_time_slot: Activity.time,
    });

    await activities.updateOne(
      { uid: aid },
      { $set: { participants_uids: [...Activity.participants_uids, cid] } }
    );

    if ((customerDetails, activityDetails))
      sendActivityMail(customerDetails, activityDetails);
    res.status(200).send({ host: "record Successfully Inserted" });
  } catch (err) {
    res.status(500).send({ error: "Server Error" });
  }
});

app.get("/FetchVandA-details", requireAuth, async (req, res) => {
  try {
    const { custid } = req.query;
    let details = {
      upcoming_activities: [],
      upcoming_venues: [],
      prev_activities: [],
      prev_venues: [],
    };

    const bookingQuery = { customer_uid: custid };
    const bookingProjection = { _id: 0, activity_uid: 1 };
    let activityUidValues = await activityBookings.find(
      bookingQuery,
      bookingProjection
    );
    for (let i = 0; i < activityUidValues.length; i++) {
      var aid = activityUidValues[i].activity_uid;
      var activityDetails = await activities.find({ uid: aid });
      let record = {
        activity_uid: aid,
        ...activityDetails[0]["_doc"],
      };
      let activityDate = new Date(record["date"]);
      let currentDate = new Date();
      if (currentDate < activityDate) {
        details["upcoming_activities"].push(record);
      } else {
        details["prev_activities"].push(record);
      }
    }
    let venuedetails = await bookings.find({ customer_uid: custid });
    for (let i = 0; i < venuedetails.length; i++) {
      var vid = venuedetails[i]["venue_uid"];

      var vdetails = await venues.find(
        { uid: vid },
        { _id: 0, name: 1, location: 1, sport: 1 }
      );
      let record = {
        venue_uid: vid,
        ...venuedetails[i]["_doc"],
        ...vdetails[0]["_doc"],
      };
      let activityDate = new Date(record["booking_date"]);
      let currentDate = new Date();
      if (currentDate < activityDate) {
        details["upcoming_venues"].push(record);
      } else {
        details["prev_venues"].push(record);
      }
    }
    details["upcoming_activities"].forEach((obj) => {
      obj.dateTime = new Date(obj.date);
    });
    details["prev_activities"].forEach((obj) => {
      obj.dateTime = new Date(obj.date);
    });
    details["upcoming_venues"].forEach((obj) => {
      obj.dateTime = new Date(obj.booking_date);
    });
    details["prev_venues"].forEach((obj) => {
      obj.dateTime = new Date(obj.booking_date);
    });

    details["upcoming_activities"].sort((a, b) => a.dateTime - b.dateTime);
    details["prev_activities"].sort((a, b) => b.dateTime - a.dateTime);
    details["upcoming_venues"].sort((a, b) => a.dateTime - b.dateTime);
    details["prev_venues"].sort((a, b) => b.dateTime - a.dateTime);

    res.status(200).send({ data: details });
  } catch (err) {
    console.error(err); // Log the error for debugging purposes
    res.status(500).send({ error: "Internal Server Error" });
  }
});

//update profile details
app.post("/update-profile", requireAuth, async (req, res) => {
  try {
    const { customerid, interested_sports } = req.body;
    await accounts.updateOne(
      { uid: customerid },
      {
        $set: {
          interested_sports: interested_sports || [],
        },
      }
    );
    res.status(200).send({ value: "Successfully updated Profile details" });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});
//For email notification module
async function sendMail(customerDetails, venueDetails, selectedTimings) {
  const editedTimings = selectedTimings
    .map((e) => e.toString().replace(/.{14}$/, ""))
    .join(", and ");

  const OAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  OAuth2Client.setCredentials({
    refresh_token: process.env.OAUTH_REFRESH_TOKEN,
  });
  try {
    // Generate the accessToken on the fly
    const accessToken = await OAuth2Client.getAccessToken();
    // Create the email envelope (transport)
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: CLIENT_EMAIL,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    // Create the email options and body
    // ('email': user's email and 'name': is the e-book the user wants to receive)
    const mailOptions = {
      from: `Event Management System <${CLIENT_EMAIL}>`,
      to: customerDetails?.email,
      subject: `Booking Confirmation for ${customerDetails?.username}`,
      html: `
            
            
            <!doctype html>
            <html lang="en-US">
            
            <head>
            <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
            <title>Booking Confirmation</title>
            <meta name="description" content="TEST">
            <style type="text/css">
            a:hover {text-decoration: underline !important;}
            </style>
            </head>
            
            <body marginheight="0" topmargin="0" marginwidth="0" style="margin: 0px; background-color: #f2f3f8;" leftmargin="0">
            <!--100% body table-->
            <p>Booking confirmation for venue: ${venueDetails?.name} at ${editedTimings}.</p>
            </body>
                                        
                                        </html>
                                        `,
    };

    // Set up the email options and delivering it
    const result = await transport.sendMail(mailOptions);
    console.log(result);
    // if (result.response.includes("2.0.0 OK"))
    //   response.send({ data: "Notification Email Sent" });
  } catch (error) {
    console.log(error);
    return error;
  }
}

async function sendActivityMail(customerDetails, activityDetails) {
  const OAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  OAuth2Client.setCredentials({
    refresh_token: process.env.OAUTH_REFRESH_TOKEN,
  });
  try {
    // Generate the accessToken on the fly
    const accessToken = await OAuth2Client.getAccessToken();
    // Create the email envelope (transport)
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: CLIENT_EMAIL,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    // Create the email options and body
    // ('email': user's email and 'name': is the e-book the user wants to receive)
    const mailOptions = {
      from: `Event Management System <${CLIENT_EMAIL}>`,
      to: customerDetails?.email,
      subject: `Booking Confirmation for ${customerDetails?.username}`,
      html: `
            
            
            <!doctype html>
            <html lang="en-US">
            
            <head>
            <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
            <title>Booking Confirmation</title>
            <meta name="description" content="TEST">
            <style type="text/css">
            a:hover {text-decoration: underline !important;}
            </style>
            </head>
            
            <body marginheight="0" topmargin="0" marginwidth="0" style="margin: 0px; background-color: #f2f3f8;" leftmargin="0">
            <!--100% body table-->
            <p>Booking confirmation for activity: ${activityDetails?.name} at ${activityDetails?.time}, ${activityDetails?.date}.</p>
            </body>
                                        
                                        </html>
                                        `,
    };

    // Set up the email options and delivering it
    const result = await transport.sendMail(mailOptions);
    console.log(result);
    // if (result.response.includes("2.0.0 OK"))
    //   response.send({ data: "Notification Email Sent" });
  } catch (error) {
    console.log(error);
    return error;
  }
}

//Fetch other user list
app.get("/people", requireAuth, async (req, res) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) {
      res.status(400).send({ err: "Required fields missing" });
      return;
    }
    let searchQuery = req.query.searchQuery || "";
    let people = [];
    if (searchQuery.length) {
      people = await accounts.find(
        {
          uid: { $ne: customer_id },
          role: "Customer",
          username: {
            $regex: searchQuery,
            $options: "i",
          },
        },
        { _id: 0, email: 1, username: 1, interested_sports: 1 }
      );
    } else {
      people = await accounts.find(
        { uid: { $ne: customer_id }, role: "Customer" },

        { _id: 0, email: 1, username: 1, interested_sports: 1 }
      );
    }

    res.status(200).send({ data: { people } });
  } catch (err) {
    res.status(500).send({ error: "Server Error" });
  }
});

//Fetch user details
app.get("/profile-details", requireAuth, async (req, res) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) {
      res.status(400).send({ err: "Required fields missing" });
      return;
    }
    profileDetails = await accounts.findOne({ uid: customer_id });

    res.status(200).send({ data: { profileDetails } });
  } catch (err) {
    res.status(500).send({ error: "Server Error" });
  }
});
module.exports = app;
