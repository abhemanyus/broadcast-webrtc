import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { RTCPeerConnection } from "wrtc";

type UIN = string;

// const app: Application = express();
const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"]
    }
});

type Query = {
    type: "MavDrone" | "MavClient",
    uin: UIN
}

const droneStreams = new Map<UIN, MediaStream>();

const polite = false;

const connect = (sc: Socket) => {
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

    pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
            pc.restartIce();
        }
    };
    pc.onicecandidate = ({ candidate }) => sc.emit("message", { candidate });
    let makingOffer = false;
    pc.onnegotiationneeded = async () => {
        makingOffer = true;
        try {
            await pc.setLocalDescription(await pc.createOffer());
            sc.emit("message", { sdp: pc.localDescription });
        }
        catch (err) {
            console.error(err);
        }
        finally {
            makingOffer = false;
        }
    }

    let ignoreOffer = false;
    sc.on("message", async ({ sdp, candidate }) => {
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
                    await pc.setLocalDescription(await pc.createAnswer());
                    sc.emit("message", { sdp: pc.localDescription })
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

io.on("connection", async (socket) => {
    try {
        const query = socket.handshake.query as Query;
        console.log(query.type, query.uin);
        if (query.type == "MavClient") {
            socket.on("start", async () => {
                const pc = await connect(socket);
                const stream = droneStreams.get(query.uin);
                if (stream) {
                    stream.getTracks().forEach(track => pc.addTrack(track, stream));
                } 
            })

        } else if (query.type == "MavDrone") {
            const pc = await connect(socket);
            socket.emit("start");
            pc.ontrack = ({streams}) => {
                const [remoteStream] = streams;
                droneStreams.set(query.uin, remoteStream);
            }
        }
    } catch (error) {
        console.error(error)
    }

});


httpServer.listen(3000, "0.0.0.0", () => console.log("Server running on port 3000"));