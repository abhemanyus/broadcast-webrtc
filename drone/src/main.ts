import client from "socket.io-client"

const connectButton = document.querySelector<HTMLButtonElement>("#connect")!;
const video = document.querySelector<HTMLButtonElement>("#video")!;

const sc = client("http://localhost:3000", {
  query: {
    uin: "BOB",
    type: "MavDrone"
  }
});

const pc = new RTCPeerConnection({
  iceServers: [
      {
          urls: ["turn:0.0.0.0.3478"],
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
  console.log("sdp", sdp ? true : false);
  console.log("candidate", candidate ? true : false);
  if (sdp) {
    await pc.setRemoteDescription(sdp);
    if (sdp.type == "offer") {
      await pc.setLocalDescription(await pc.createAnswer());
      sc.emit("message", { sdp: pc.localDescription });
    }
  } else if (candidate) await pc.addIceCandidate(candidate);
})

connectButton.onclick = async () => {
  const stream;
}