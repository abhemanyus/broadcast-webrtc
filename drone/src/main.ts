import client from "socket.io-client"

// const connectButton = document.querySelector<HTMLButtonElement>("#connect")!;
const video = document.querySelector<HTMLVideoElement>("#video")!;

const polite = true;

const sc = client("http://localhost:3000", {
  query: {
    uin: "BOB",
    type: "MavDrone"
  }
});

const connect = () => {

  const pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: ["turn:localhost:5450"],
        username: "test",
        credential: "test"
      }
    ],
    iceCandidatePoolSize: 10
  });

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === "failed") {
      pc.restartIce();
    }
  };
  pc.onicecandidate = ({ candidate }) => sc.emit("holler", { candidate });
  let makingOffer = false;
  pc.onnegotiationneeded = async () => {
    makingOffer = true;
    try {
      await pc.setLocalDescription();
      sc.emit("holler", { sdp: pc.localDescription });
    }
    catch (err) {
      console.error(err);
    }
    finally {
      makingOffer = false;
    }
  }

  let ignoreOffer = false;
  sc.on("holler", async ({ sdp, candidate }) => {
    try {
      if (sdp) {
        const offerCollision = (sdp.type === "offer") &&
          (makingOffer || pc.signalingState !== "stable");

        ignoreOffer = !polite && offerCollision;
        if (ignoreOffer) {
          return;
        }

        await pc.setRemoteDescription(sdp);
        if (sdp.type === "offer") {
          await pc.setLocalDescription();
          sc.emit("holler", { sdp: pc.localDescription })
        }
      } else if (candidate) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          if (!ignoreOffer) {
            throw err;
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  })
  return pc;
}



sc.on("begin", async () => {
  video.srcObject = null;
  const pc = await connect();
  const stream = await navigator.mediaDevices.getUserMedia({ "video": true, "audio": true });
  video.srcObject = stream;
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
})

