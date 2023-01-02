const {Twilio} = require("twilio");
const form = document.getElementById("room-name-form");
const joinForm = document.getElementById("join-room-form");
const roomNameInput = document.getElementById("room-name-input");
const tokenRoom = document.getElementById("room-token-input");
const container = document.getElementById("video-container");

form.addEventListener("submit", startRoom);
const startRoom = async (event) => {
    // prevent a page reload when a user submits the form
    event.preventDefault();
    // hide the join form
    form.style.visibility = "hidden";
    // retrieve the room name
    const roomName = roomNameInput.value;

    // fetch an Access Token from the join-room route
    const response = await fetch("/join-room", {
        method: "POST", headers: {
            Accept: "application/json", "Content-Type": "application/json",
        }, body: JSON.stringify({roomName: roomName}),
    });

    const { token } = await response.json();

    // join the video room with the token
    const room = await joinVideoRoom(roomName, token);

    // render the local and remote participants' video and audio tracks
    handleConnectedParticipant(room.localParticipant);
    room.participants.forEach(handleConnectedParticipant);
    room.on("participantConnected", handleConnectedParticipant);

    // handle cleanup when a participant disconnects
    room.on("participantDisconnected", handleDisconnectedParticipant);
    window.addEventListener("pagehide", () => room.disconnect());
    window.addEventListener("beforeunload", () => room.disconnect());
};