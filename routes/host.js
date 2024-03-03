const { v4: uuidv4 } = require("uuid");

const express = require("express");
const app = express();

const { requireAuth } = require("../middleware/authMiddleware");
const venues = require("../mongo/venue/venues");
const activities = require("../mongo/activity/activities");
const bookings = require("../mongo/records/bookings");
const accounts = require("../mongo/user/accounts");

app.post("/create-venue", requireAuth, async (req, res) => {
  try {
    const {
      name,
      location,
      description,
      images,
      host_name,
      host_id,
      sport,
      timings,
      availability,
      price,
    } = req.body;
    if (
      !name ||
      !location ||
      !description ||
      !host_name ||
      !host_id ||
      !sport ||
      !timings
    ) {
      res.status(400).send({ error: "Required fields are missing" });
      return;
    }
    await venues
      .create({
        name: name,
        uid: uuidv4(),
        location: location,
        description: description,
        images: images || [],
        host_name: host_name,
        host_id: host_id,
        sport: sport,
        timings: timings,
        availability: availability || false,
        price: price || 0,
      })
      .then(() => {
        res.status(200).send("Succesfully added venue");
      })
      .catch((err) => Throw`${err}`);
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});
app.get("/fetch-venues", requireAuth, async (req, res) => {
  const { host_id } = req.query;
  if (!host_id) {
    res.status(400).send({ error: "Required fields are missing" });
    return;
  }
  try {
    let venueList = (await venues.find({ host_id: host_id })) || [];
    res.status(200).send({ venues: venueList });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});
app.get("/venue-details", requireAuth, async (req, res) => {
  try {
    const { uid, host_id } = req.query;
    if (!uid || !host_id) {
      res.status(400).send({ error: "Required fields are missing" });
    }
    let venueDetails =
      (await venues.findOne({ uid: uid, host_id: host_id })) || null;
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

app.post("/create-activity", requireAuth, async (req, res) => {
  try {
    const {
      name,
      location,
      description,
      images,
      host_name,
      host_id,
      sport,
      date,
      time,
      participantsLimit,
      availability,
      price,
    } = req.body;
    if (
      !name ||
      !location ||
      !description ||
      !host_name ||
      !host_id ||
      !sport ||
      !date ||
      !time ||
      !participantsLimit
    ) {
      res.status(400).send({ error: "Required fields are missing" });
      return;
    }
    await activities
      .create({
        name: name,
        uid: uuidv4(),
        location: location,
        description: description,
        images: images || [],
        host_name: host_name,
        host_id: host_id,
        sport: sport,
        participantsLimit: participantsLimit,
        date: date,
        time: time,
        availability: availability || false,
        price: price || 0,
      })
      .then(() => {
        res.status(200).send("Succesfully added venue");
      })
      .catch((err) => Throw`${err}`);
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});
app.get("/fetch-activites", requireAuth, async (req, res) => {
  const { host_id } = req.query;
  if (!host_id) {
    res.status(400).send({ error: "Required fields are missing" });
    return;
  }
  try {
    let activityList = (await activities.find({ host_id: host_id })) || [];
    res.status(200).send({ venues: activityList });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});
app.get("/activity-details", requireAuth, async (req, res) => {
  try {
    const { uid, host_id } = req.query;
    if (!uid || !host_id) {
      res.status(400).send({ error: "Required fields are missing" });
    }
    let venueDetails =
      (await activities.findOne({ uid: uid, host_id: host_id })) || null;
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
// Update Venue
app.post("/update-venue", requireAuth, async (req, res) => {
  try {
    const {
      name,
      location,
      description,
      images,
      host_name,
      host_id,
      sport,
      availability,
      price,
      timings,
      venueid,
    } = req.body;
    await venues.updateOne(
      { uid: venueid },
      {
        $set: {
          name: name,
          location: location,
          description: description,
          images: images || [],
          host_name: host_name,
          host_id: host_id,
          sport: sport,
          timings: timings,
          availability: availability || false,
          price: price || 0,
        },
      }
    );
    res.status(200).send("Succesfully updated venue");
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});

//Update Activity
app.post("/update-activity", requireAuth, async (req, res) => {
  try {
    const {
      name,
      location,
      description,
      images,
      sport,
      date,
      time,
      participantsLimit,
      availability,
      price,
      activityid,
    } = req.body;
    await activities.updateOne(
      { uid: activityid },
      {
        $set: {
          name: name,
          location: location,
          description: description,
          images: images || [],
          sport: sport,
          participantsLimit: participantsLimit,
          date: date,
          time: time,
          availability: availability || false,
          price: price || 0,
        },
      }
    );
    res.status(200).send({ value: "Successfully updated Activity" });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});
//Get bookings
app.get("/bookings", requireAuth, async (req, res) => {
  try {
    const { host_id } = req.query;
    if (!host_id) {
      res.status(400).send({ error: "Required fields are missing" });
      return;
    }
    let activityBookings = await activities
      .find(
        { host_id: host_id, participants_uids: { $exists: true, $ne: [] } },
        {
          name: 1,
          location: 1,
          sport: 1,
          participantsLimit: 1,
          participants_uids: 1,
          date: 1,
          time: 1,
        }
      )
      .sort({ date: 1 });
    let venueBookingsAggregate = [
      {
        $match: {
          host_uid: host_id,
        },
      },
      {
        $addFields: {
          booking_status: {
            $cond: {
              if: {
                $gt: [
                  { $dateFromString: { dateString: "$booking_date" } },
                  new Date(),
                ],
              },
              then: "current",
              else: "prev",
            },
          },
        },
      },
      {
        $group: {
          _id: "$venue_uid",
          upcoming_bookings: {
            $push: {
              $cond: {
                if: { $eq: ["$booking_status", "current"] },
                then: {
                  customer_uid: "$customer_uid",
                  booking_date: "$booking_date",
                  booking_time_slot: "$booking_time_slot",
                },
                else: null,
              },
            },
          },
          prev_bookings: {
            $push: {
              $cond: {
                if: { $eq: ["$booking_status", "prev"] },
                then: {
                  customer_uid: "$customer_uid",
                  booking_date: "$booking_date",
                  booking_time_slot: "$booking_time_slot",
                },
                else: null,
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          upcoming_bookings: {
            $filter: {
              input: "$upcoming_bookings",
              as: "upcoming_bookings",
              cond: { $ne: ["$$upcoming_bookings", null] },
            },
          },
          prev_bookings: {
            $filter: {
              input: "$prev_bookings",
              as: "prevBooking",
              cond: { $ne: ["$$prevBooking", null] },
            },
          },
        },
      },
    ];
    let venueBookings = await bookings.aggregate(venueBookingsAggregate);

    // Fetch user details for each booking
    for (j = 0; j < venueBookings.length; j++) {
      venueDetails = await venues.findOne(
        { uid: venueBookings[j]["_id"] },
        { name: 1, location: 1 }
      );
      upcoming_bookings = venueBookings[j]["upcoming_bookings"];
      prev_bookings = venueBookings[j]["prev_bookings"];
      for (i = 0; i < upcoming_bookings.length; i++) {
        let cid = upcoming_bookings[i]["customer_uid"];
        customer_details = await accounts.findOne(
          { uid: cid },
          { _id: 0, email: 1, username: 1 }
        );
        upcoming_bookings[i] = {
          ...upcoming_bookings[i],
          ...customer_details["_doc"],
        };
      }
      for (i = 0; i < prev_bookings.length; i++) {
        let cid = prev_bookings[i]["customer_uid"];
        customer_details = await accounts.findOne(
          { uid: cid },
          { _id: 0, email: 1, username: 1 }
        );
        prev_bookings[i] = {
          ...prev_bookings[i],
          ...customer_details["_doc"],
        };
      }
      venueBookings[j] = {
        ...venueDetails["_doc"],
        ...venueBookings[j],
      };
    }

    let finalActivityBookings = {
      upcomingActivities: [],
      prevActivities: [],
    };
    //Fetch user details for each activity booking
    for (i = 0; i < activityBookings.length; i++) {
      activityBookings[i].participant_details = [];
      participant_uids = activityBookings[i]["participants_uids"];
      participant_details = [];
      for (j = 0; j < participant_uids.length; j++) {
        let details = await accounts.findOne(
          { uid: participant_uids[j] },
          { _id: 0, email: 1, username: 1 }
        );
        participant_details.push(details["_doc"]);
      }
      activityBookings[i]["_doc"] = {
        ...activityBookings[i]["_doc"],
        participant_details: participant_details,
      };

      let currentDate = new Date();
      let activityDate = new Date(activityBookings[i]["_doc"]["date"]);
      if (currentDate >= activityDate) {
        finalActivityBookings["prevActivities"].push(
          activityBookings[i]["_doc"]
        );
      } else {
        finalActivityBookings["upcomingActivities"].push(
          activityBookings[i]["_doc"]
        );
      }
    }

    res.send({
      data: { venueBookings, activityBookings: finalActivityBookings },
    });
  } catch (err) {
    console.log(err);
  }
});
module.exports = app;
