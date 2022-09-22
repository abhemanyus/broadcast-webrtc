import client from "socket.io-client"

const video = document.querySelector<HTMLVideoElement>("#video")!;
// const connectButton = document.querySelector<HTMLButtonElement>("#connect")!;

const sc = client("http://localhost:3000", {
    query: {
        uin: "BOB",
        type: "MavClient"
    }
});

const pc = new RTCPeerConnection({
    iceServers: [
        {
            urls: ["turn:localhost:5450"],
            username: "sanndy",
            credential: "manndy"
        }
    ],
    iceCandidatePoolSize: 10
});

pc.oniceconnectionstatechange = () => console.log(pc.iceConnectionState);
pc.onicecandidate = ({ candidate }) => sc.emit("message", { candidate });
pc.onnegotiationneeded = async () => {
    await pc.setLocalDescription(await pc.createOffer());
    sc.emit("message", { sdp: pc.localDescription });
}



sc.on("message", async ({ sdp, candidate }) => {
    console.group("payload");
    console.log("sdp", sdp ? true : false);
    console.log("candidate", candidate ? true : false);
    console.groupEnd();
    if (sdp) {
        await pc.setRemoteDescription(sdp);
        if (sdp.type == "offer") {
            await pc.setLocalDescription(await pc.createAnswer());
            sc.emit("message", { sdp: pc.localDescription });
        }
    } else if (candidate) await pc.addIceCandidate(candidate);
})

pc.addEventListener("track", async (event) => {
    console.log("got track");
    const [remoteStream] = event.streams;
    video.srcObject = remoteStream;
});



