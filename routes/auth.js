const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const OTPAuth = require("otpauth");
const { encode } = require("hi-base32");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");
const accounts = require("../mongo/user/accounts");

const generateTokens = require("../utils/generateTokens");
const { verifyRefreshToken } = require("../utils/verifyTokens.js");

app.use(cors());
app.post("/sign-in", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).send({ error: "Required fields are missing" });
      return;
    }
    const user = await accounts.findOne({
      $or: [
        { username: email, AuthType: "Credentials" },
        { email: email, AuthType: "Credentials" },
      ],
    });
    if (user) {
      const {
        email: userEmail,
        uid,
        username,
        password: hashedPassword,
        role,
      } = user;
      if (bcrypt.compareSync(password, hashedPassword)) {
        let userData = {
          email: userEmail,
          uid: uid,
          username: username,
          role: role,
        };
        const { accessToken, refreshToken } = await generateTokens(userData);
        res.cookie("REFRESH_JWT", refreshToken, {
          httpOnly: true,
          sameSite: "None",
          secure: true,
          maxAge: 24 * 60 * 60 * 1000,
        });
        res.status(200).send({ user: userData, accessToken: accessToken });
      } else {
        res.status(401).send({ error: "Invalid Password" });
      }
    } else {
      res.status(401).send({ error: "user not found" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
});

app.post("/sign-up", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    //Request parameters validation
    if (!username || !email || !password) {
      res.status(400).send({ error: "Required fields are missing" });
      return;
    }

    //Checking for existing users
    const existingAccount = await accounts.findOne({ email: email });
    if (existingAccount) {
      res.status(409).send({ error: "Account already exists" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hashSync(password, salt);

    await accounts
      .create({
        uid: uuidv4(),
        username: username,
        email: email,
        password: hashedPassword,
        role: role || "Customer",
      })
      .then(() => {
        res.status(200).send("Succesfully Created Account");
      })
      .catch(() => {
        throw "Unable to create account";
      });
  } catch (err) {
    res.status(500).send({ err: err });
  }
});

app.post("/oauth-sign-in", async (req, res) => {
  try {
    //If user already exists: - generate creds
    //Else create users and then generate creds
    const { email, username: OAuthUsername, role,token} = req.body;

    if(!token || !email || !OAuthUsername){
      res.status(400).send({err:"Fields are missing"})
      return
    }
    if(token!==process.env.OAUTH_CLIENTID){
      res.status(400).send({err:"Invalid origin"})
      return
    }

    const user = await accounts.findOne({ email: email, AuthType: "OAuth" });

    if (user) {
      const { email: userEmail, uid, username, role: userRole } = user;

      let userData = {
        email: userEmail,
        uid: uid,
        username: username,
        role: userRole,
      };
      const { accessToken, refreshToken } = await generateTokens(userData);
      res.cookie("REFRESH_JWT", refreshToken, {
        httpOnly: true,
        sameSite: "None",
        secure: true,
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.status(200).send({ user: userData, accessToken: accessToken });
    }
    // New User - Signup and then signIn
    else {
      await accounts
        .create({
          uid: uuidv4(),
          username: OAuthUsername,
          email: email,
          password: "",
          role: role || "Customer",
          AuthType: "OAuth",
        })
        .then(async ({ email: userEmail, uid, username, role: userRole }) => {
          let userData = {
            email: userEmail,
            uid: uid,
            username: username,
            role: userRole,
          };
          const { accessToken, refreshToken } = await generateTokens(userData);
          res.cookie("REFRESH_JWT", refreshToken, {
            httpOnly: true,
            sameSite: "None",
            secure: true,
            maxAge: 24 * 60 * 60 * 1000,
          });
          res.status(200).send({ user: userData, accessToken: accessToken });
        })
        .catch(() => {
          throw "Unable to create account";
        });
    }
  } catch (err) {
    res.status(500).send({ err: err });
  }
});
app.post("/refresh-accessToken", async (req, res) => {
  try {
    const refreshToken = req.cookies.REFRESH_JWT;
    if (!refreshToken) {
      res.status(403).send({ error: "Invalid Request - Cookie not found" });
      return;
    }
    await verifyRefreshToken(refreshToken)
      .then(({ tokenDetails }) => {
        const payload = {
          email: tokenDetails.email,
          username: tokenDetails.username,
        };
        const accessToken = jwt.sign(
          payload,
          process.env.ACCESS_TOKEN_PRIVATE_KEY,
          { expiresIn: "1h" }
          // { expiresIn: "10s" }
        );
        res.status(200).send({
          accessToken: accessToken,
          message: "Access Token Created",
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(403).send({ err: err });
      });
  } catch (err) {
    console.log(err);
    res.status(500).send({ err: "Internal Server Error" });
  }
});

app.get("/verify", async (request, response) => {
  const { captchaValue } = request.query;
  const { data } = await axios.post(
    `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.CAPTCHA_SECRET_KEY}&response=${captchaValue}`
  );
  const { success } = data;
  response.send({ success: success });
});

const generateRandomBase32 = () => {
  const buffer = crypto.randomBytes(15);
  const base32 = encode(buffer).replace(/=/g, "").substring(0, 24);
  return base32;
};

app.get("/generate-qr", async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      res.status(400).send({ error: "Required parameters are missing" });
      return;
    }

    const user = await accounts.findOne({ uid: uid });
    if (!user) {
      res.status(404).send({ error: "User not found!" });
      return;
    }

    const base32_secret = generateRandomBase32();

    let totp = new OTPAuth.TOTP({
      issuer: "Event Management System",
      label: "Event Management System",
      algorithm: "SHA1",
      digits: 6,
      secret: base32_secret,
    });

    let otpauth_url = totp.toString();
    await accounts.updateOne(
      { uid: uid },
      { otp_auth_url: otpauth_url, otp_base32: base32_secret }
    );

    res.status(200).send({ url: otpauth_url });
  } catch (err) {
    console.log(err);
    res.status(500).send({ err: "Internal Server Error" });
  }
});

//To verify OTP for the first time from the profile page
app.post("/verify-otp", async (req, res) => {
  try {
    const { uid, token } = req.body;
    if (!uid || !token) {
      res.status(400).send({ error: "Required parameters are missing" });
      return;
    }
    const user = await accounts.findOne({ uid: uid });
    if (!user) {
      res.status(404).send({ error: "User not found!" });
      return;
    }

    let totp = new OTPAuth.TOTP({
      issuer: "Event Management System",
      label: "Event Management System",
      algorithm: "SHA1",
      digits: 6,
      secret: user.otp_base32,
    });

    let verified = totp.validate({ token });

    if (verified == null) {
      res.status(401).send({ verified: false });
      return;
    } else {
      await accounts.updateOne(
        { uid: uid },
        { $set: { otp_enabled: true, otp_verified: true } }
      );
      res.status(200).send({ verified: true });
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ err: "Internal Server Error" });
  }
});

app.post("/validate-otp", async (req, res) => {
  try {
    const { uid, token } = req.body;
    if (!uid || !token) {
      res.status(400).send({ error: "Required parameters are missing" });
      return;
    }
    const user = await accounts.findOne({ uid: uid });
    if (!user) {
      res.status(404).send({ error: "User not found!" });
      return;
    }

    let totp = new OTPAuth.TOTP({
      issuer: "Event Management System",
      label: "Event Management System",
      algorithm: "SHA1",
      digits: 6,
      secret: user.otp_base32,
    });

    let verified = totp.validate({ token });

    if (verified == null) {
      res.status(401).send({ verified: false });
      return;
    } else {
      res.status(200).send({ verified: true });
      return;
    }
    
  } catch (err) {
    console.log(err);
    res.status(500).send({ err: "Internal Server Error" });
  }
});

app.get("/enabled-2FA", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      res.status(400).send({ error: "Required parameters are missing" });
      return;
    }
    const user = await accounts.findOne(
      { email: email },
      { otp_enabled: 1, otp_verified: 1 }
    );
    if (user) {
      return res
        .status(200)
        .send({
          otp_enabled: user?.otp_enabled || false,
          otp_verified: user?.otp_verified || false,
        });
    }
    else{
      return res.status(404).send({error:"User does not exist"})
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ err: "Internal Server Error" });
  }
});

app.get("/disable-2FA",async(req,res)=>{
  try{
    const { email } = req.query;
      if (!email) {
        res.status(400).send({ error: "Required parameters are missing" });
        return;
      }
      const user = await accounts.findOne({ email: email });
      if (!user) {
        res.status(404).send({ error: "User not found!" });
        return;
      }
      await accounts.updateOne(
        { email: email },
        { $set: { otp_enabled: false, otp_verified: false } }
      );
      res.status(200).send({ MFAreset: true });
      return;

  }catch (err) {
    console.log(err);
    res.status(500).send({ err: "Internal Server Error" });
  }
})

app.get("/2FA-check",async(req,res)=>{
  try {
    const { email, password } = req.query;
    if (!email || !password) {
      res.status(400).send({ error: "Required fields are missing" });
      return;
    }
    const user = await accounts.findOne({
      $or: [
        { username: email, AuthType: "Credentials" },
        { email: email, AuthType: "Credentials" },
      ],
    });
    if (user) {
      const {
        uid,
        password: hashedPassword,
        otp_enabled
      } = user;
      if (bcrypt.compareSync(password, hashedPassword)) {
       
        res.status(200).send({data:{TwoFactorAuth:otp_enabled,uid:uid}});
      } else {
        res.status(401).send({ error: "Invalid Password" });
      }
    } else {
      res.status(401).send({ error: "user not found" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Server Error" });
  }
})

module.exports = app;
