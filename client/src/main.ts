import client from "socket.io-client"

const icegatheringstatechange = document.querySelector<HTMLParagraphElement>("#icegatheringstatechange")!;
const iceconnectionstatechange = document.querySelector<HTMLParagraphElement>("#iceconnectionstatechange")!;
const signalingstatechange = document.querySelector<HTMLParagraphElement>("#signalingstatechange")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const connectButton = document.querySelector<HTMLButtonElement>("#connect")!;
const video = document.querySelector<HTMLVideoElement>("#video")!;

const socketClient = client("http://localhost:3000", {
    query: {
        uin: "BOB",
        type: "MavClient"
    }
});

const peerLocal = new RTCPeerConnection({
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302",
        },
        // {
        //     urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
        //     credential: 'openrelayproject',
        //     username: 'openrelayproject'
        // },
    ]
});


// peerDrone.addTransceiver({ direction: "recvonly" })

peerLocal.addEventListener("icegatheringstatechange", function () { icegatheringstatechange.textContent = this.iceGatheringState });
peerLocal.addEventListener("iceconnectionstatechange", function () { iceconnectionstatechange.textContent = this.iceConnectionState });
peerLocal.addEventListener("signalingstatechange", function () { signalingstatechange.textContent = this.signalingState });

// peerLocal.addEventListener('track', async (event) => {
//     const [remoteStream] = event.streams;
//     video.srcObject = remoteStream;
// });

peerLocal.addEventListener('datachannel', event => {
    console.log("Got data channel!");
    const dataChannel = event.channel;
});



socketClient.on("ANSWER", async (payload) => {
    status.textContent = "CLIENT: Got ANSWER from SERVER";
    const remoteOffer = new RTCSessionDescription(payload.answer);
    await peerLocal.setRemoteDescription(remoteOffer);
});

async function connect() {
    const localOffer = await peerLocal.createOffer();
    await peerLocal.setLocalDescription(localOffer);
    socketClient.emit("START_STREAM", {
        missionId: "62ebaaac75c8616fb3db39e7",
        offer: peerLocal.localDescription,
        assetId: "62010fe84e70b1b79f6228b1"
    });
    status.textContent = "Triggered Streaming"
};

connectButton.addEventListener("click", connect);


