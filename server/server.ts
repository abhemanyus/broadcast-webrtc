import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { RTCPeerConnection } from "wrtc";

type UIN = string;

// const app: Application = express();
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  },
});

type Query = {
  type: "MavDrone" | "MavClient";
  uin: UIN;
};

const droneStreams = new Map<UIN, MediaStream>();

const polite = false;

const connect = (sc: Socket) => {
  console.log("connect", sc.handshake.query.type);
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
    console.log("iceConnectionState", pc.iceConnectionState);
    if (pc.iceConnectionState === "failed") {
      pc.restartIce();
    }
  };
  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      console.log("send candidate");
      sc.emit("holler", { candidate });
    }
  };
  let makingOffer = false;
  pc.onnegotiationneeded = async () => {
    console.log("negotiation needed");
    makingOffer = true;
    try {
      await pc.setLocalDescription(await pc.createOffer());
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
          await pc.setLocalDescription(await pc.createAnswer());
          sc.emit("holler", { sdp: pc.localDescription });
          // console.log("sent answer", pc.localDescription);
        } else {
          console.log("got answer");
        }
      } else if (candidate) {
        try {
          console.log("got candidate");
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

io.on("connection", async (socket) => {
  const query = socket.handshake.query as Query;
  console.log(query.type, query.uin);
  // socket.on("begin", payload => socket.broadcast.emit("begin", payload));
  socket.on("message", (payload) => socket.broadcast.emit("message", payload));
    // try {
    //   if (query.type == "MavClient") {
    //     socket.on("begin", async () => {
    //       console.log("client: start");
    //       const pc = connect(socket);
    //       const stream = droneStreams.get(query.uin);
    //       if (stream) {
    //         stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    //       }
    //     });
    //   } else if (query.type == "MavDrone") {
    //     const pc = connect(socket);
    //     socket.emit("begin", { hello: "world" });
    //     console.log("drone: start");
    //     pc.ontrack = ({ streams }) => {
    //       console.log("drone track");
    //       const [remoteStream] = streams;
    //       droneStreams.set(query.uin, remoteStream);
    //     };
    //   }
    // } catch (error) {
    //   console.error(error);
    // }
});

httpServer.listen(3000, "0.0.0.0", () =>
  console.log("Server running on port 3000")
);
