require( "dotenv" ).config();
const { v4: uuidv4 } = require("uuid");
const AccessToken = require("twilio").jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const express = require("express");
const app = express();
const port = 5000;

// use the Express JSON middleware
app.use(express.json());

// create the twilioClient
const twilioClient = require("twilio")(
    process.env.TWILIO_API_KEY_SID,
    process.env.TWILIO_API_KEY_SECRET,
    { accountSid: process.env.TWILIO_ACCOUNT_SID }
);

// Start the Express server
app.listen(port, () => {
    console.log(`Express server running on port ${port}`);
    console.log(`process.env.TWILIO_API_KEY_SID ${process.env.TWILIO_API_KEY_SID} \nprocess.env.TWILIO_API_KEY_SECRET ${process.env.TWILIO_API_KEY_SECRET}`);
});

const findOrCreateRoom = async (roomName) => {
    try {
        // see if the room exists already. If it doesn't, this will throw
        // error 20404.
        await twilioClient.video.rooms(roomName).fetch();
        console.log(`joined the room #1`);
    } catch (error) {
        console.log(`catch joined the room`);
        // the room was not found, so create it
        if (error.code == 20404) {
            console.log(`catch create room #2`);
            await createRoom(roomName);
            console.log(`joined the room #2`);
        } else {
            console.log(`error findOrCreateRoom code ${error.code}`);
            // let other errors bubble up
            // throw error;
            findOrCreateRoom(roomName);
        }
    }
};

/*separate try from findOrCreateRoom because cannot be caught on findOrCreateRoom itself*/
const createRoom = async (roomName) => {
    try {
        console.log(`try create the room ${roomName}`);
        await twilioClient.video.rooms.create({
            uniqueName: roomName,
            type: "go",
        });
    } catch (error) {
        console.log(`catch create the room, wont retry. reason ${error} :: ${error.code}`);
        if (error.code !== 53113){
        console.log(`create room ${roomName}`);
            await createRoom(roomName);
        }
    }
}

// An Access Token gives a participant permission to join video rooms.
const getAccessToken = (roomName) => {
    // create an access token
    const token = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_API_KEY_SID,
        process.env.TWILIO_API_KEY_SECRET,
        // generate a random unique identity for this participant
        { identity: uuidv4() }
    );
    // create a video grant for this specific room
    const videoGrant = new VideoGrant({
        room: roomName,
    });

    // add the video grant
    token.addGrant(videoGrant);
    // serialize the token and return it
    return token.toJwt();
};

// receiver from frontend when POST request with roomName as body
app.post("/join-room", async (req, res) => {
    console.log('received join room')
    // return 400 if the request has an empty body or no roomName
    if (!req.body || !req.body.roomName) {
        return res.status(400).send("Must include roomName argument.");
    }
    const roomName = req.body.roomName;
    // find or create a room with the given roomName
    findOrCreateRoom(roomName);
    // generate an Access Token for a participant in this room
    console.log('findOrCreateRoom')
    const token = getAccessToken(roomName);
    console.log('getAccessToken')

    res.send({
        token: token,
    });
    console.log('res.send token')
});

// serve static files from the public directory
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});