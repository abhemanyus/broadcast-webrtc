import client from "socket.io-client";

const video = document.querySelector<HTMLVideoElement>("#video")!;
const connectButton = document.querySelector<HTMLButtonElement>("#connect")!;

const polite = true;

const sc = client("http://localhost:3000", {
  query: {
    uin: "BOB",
    type: "MavClient",
  },
});
const connect = () => {
  const pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: ["turn:localhost:5450"],
        username: "test",
        credential: "test",
      },
    ],
    iceCandidatePoolSize: 10,
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
    } catch (err) {
      console.error(err);
    } finally {
      makingOffer = false;
    }
  };

  let ignoreOffer = false;
  sc.on("holler", async ({ sdp, candidate }) => {
    try {
      if (sdp) {
        const offerCollision =
          sdp.type === "offer" &&
          (makingOffer || pc.signalingState !== "stable");

        ignoreOffer = !polite && offerCollision;
        if (ignoreOffer) {
          return;
        }

        await pc.setRemoteDescription(sdp);
        if (sdp.type === "offer") {
          console.log("got offer");
          await pc.setLocalDescription();
          sc.emit("holler", { sdp: pc.localDescription });
          // console.log("sent answer", pc.localDescription);
        } else {
          console.log("got answer");
        }
      } else if (candidate) {
        console.log("got candidate");
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
  });
  return pc;
};

connectButton.onclick = async () => {
  console.log("starting!");
  sc.emit("begin", "hello");
  video.srcObject = null;
  const pc = await connect();
  pc.ontrack = ({ streams }) => {
    const [remoteStream] = streams;
    video.srcObject = remoteStream;
  };
};
