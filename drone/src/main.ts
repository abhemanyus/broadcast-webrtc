import client from "socket.io-client"
// import Cert from "./certificate";

const icegatheringstatechange = document.querySelector<HTMLParagraphElement>("#icegatheringstatechange")!;
const iceconnectionstatechange = document.querySelector<HTMLParagraphElement>("#iceconnectionstatechange")!;
const signalingstatechange = document.querySelector<HTMLParagraphElement>("#signalingstatechange")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const video = document.querySelector<HTMLVideoElement>("#video")!;

const socketDrone = client("http://localhost:3000", {
  query: {
    uin: "BOB",
    type: "MavDrone"
  }
});

const peerDrone = new RTCPeerConnection({
  iceServers: [
    {
      urls: "turn:0.0.0.0:3478",
      username: "sanndy",
      credential: "manndy"
    }
  ]
});

const dataChannel = peerDrone.createDataChannel("talk");
dataChannel.addEventListener("open", () => {
  console.log("data channel open!");
});

peerDrone.addEventListener("icegatheringstatechange", function () { icegatheringstatechange.textContent = this.iceGatheringState });
peerDrone.addEventListener("iceconnectionstatechange", function () { iceconnectionstatechange.textContent = this.iceConnectionState });
peerDrone.addEventListener("signalingstatechange", function () { signalingstatechange.textContent = this.signalingState });

socketDrone.on("START_STREAM", async (payload) => {
  status.textContent = "DRONE: got OFFER from SERVER";
  console.log(payload);
  const localStream = await playVideoFromCamera();
  localStream.getTracks().forEach(track => {
    peerDrone.addTrack(track, localStream);
  });
  const remoteOffer = new RTCSessionDescription(payload.offer);
  await peerDrone.setRemoteDescription(remoteOffer);
  const answer = await peerDrone.createAnswer();
  await peerDrone.setLocalDescription(answer);
  socketDrone.emit("ANSWER", { answer: answer });
  status.textContent = "DRONE: Sent ANSWER to SERVER";
});

async function playVideoFromCamera() {
  const constraints = { 'video': true, 'audio': true };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  return stream;
}
