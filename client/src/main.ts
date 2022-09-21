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
            urls: "turn:0.0.0.0:3478",
            username: "sanndy",
            credential: "manndy"
        }
    ]
});

peerLocal.addEventListener("icegatheringstatechange", function () { icegatheringstatechange.textContent = this.iceGatheringState });
peerLocal.addEventListener("iceconnectionstatechange", function () { iceconnectionstatechange.textContent = this.iceConnectionState });
peerLocal.addEventListener("signalingstatechange", function () { signalingstatechange.textContent = this.signalingState });

peerLocal.addEventListener('track', async (event) => {
    const [remoteStream] = event.streams;
    video.srcObject = remoteStream;
});

socketClient.on("ANSWER", async (payload) => {
    status.textContent = "CLIENT: Got ANSWER from SERVER";
    console.log(payload);
    const remoteOffer = new RTCSessionDescription(payload.answer);
    await peerLocal.setRemoteDescription(remoteOffer);
});

async function connect() {
    const localOffer = await peerLocal.createOffer();
    await peerLocal.setLocalDescription(localOffer);
    socketClient.emit("START_STREAM", {
        offer: peerLocal.localDescription,
    });
    status.textContent = "Triggered Streaming"
};

connectButton.addEventListener("click", connect);


