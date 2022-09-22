import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { RTCPeerConnection } from "wrtc";

type UIN = string;

const BossStream = new MediaStream();

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

let droneChannels = new Map<UIN, MediaStream>();

const handleClient = (sc: Socket, uin: UIN) => {
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

    pc.oniceconnectionstatechange = () => console.log("client", pc.iceConnectionState);
    pc.onicecandidate = ({ candidate }) => sc.emit("message", { candidate });
    pc.onnegotiationneeded = async () => {
        await pc.setLocalDescription(await pc.createOffer());
        sc.emit("message", { sdp: pc.localDescription });
    }

    sc.on("message", async ({ sdp, candidate }) => {
        console.log("client: sdp", sdp ? true : false);
        console.log("client: candidate", candidate ? true : false);
        if (sdp) {
            await pc.setRemoteDescription(sdp);
            if (sdp.type == "offer") {
                await pc.setLocalDescription(await pc.createAnswer());
                sc.emit("message", { sdp: pc.localDescription });
            }
        } else if (candidate) await pc.addIceCandidate(candidate);
    })

    BossStream.getTracks()
}
const handleDrone = (sc: Socket, uin: UIN) => {
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
        console.log("drone", pc.iceConnectionState);
        if (pc.iceConnectionState == "failed")
            droneChannels.delete(uin);
    };
    pc.onicecandidate = ({ candidate }) => sc.emit("message", { candidate });
    pc.onnegotiationneeded = async () => {
        await pc.setLocalDescription(await pc.createOffer());
        sc.emit("message", { sdp: pc.localDescription });
    }

    pc.ontrack = ({streams}) => {
        const [remoteStream] = streams;
    }

    sc.on("message", async ({ sdp, candidate }) => {
        console.log("drone: sdp", sdp ? true : false);
        console.log("drone: candidate", candidate ? true : false);
        if (sdp) {
            await pc.setRemoteDescription(sdp);
            if (sdp.type == "offer") {
                await pc.setLocalDescription(await pc.createAnswer());
                sc.emit("message", { sdp: pc.localDescription });
            }
        } else if (candidate) await pc.addIceCandidate(candidate);
    })

}

io.on("connection", async (socket) => {
    try {
        const query = socket.handshake.query as Query;
        console.log(query.type, query.uin);
        // socket.on("message", payload => socket.broadcast.emit("message", payload));
        switch (query.type) {
            case "MavClient": await handleClient(socket, query.uin); break;
            case "MavDrone": await handleDrone(socket, query.uin); break;
        }
    } catch (error) {
        console.error(error)
    }

});


httpServer.listen(3000, "0.0.0.0", () => console.log("Server running on port 3000"));