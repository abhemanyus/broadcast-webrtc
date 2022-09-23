import client from "socket.io-client"

const video = document.querySelector<HTMLVideoElement>("#video")!;
const connectButton = document.querySelector<HTMLButtonElement>("#connect")!;

const polite = true;

const sc = client("http://localhost:3000", {
    query: {
        uin: "BOB",
        type: "MavClient"
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
    pc.onicecandidate = ({ candidate }) => sc.emit("message", { candidate });
    let makingOffer = false;
    pc.onnegotiationneeded = async () => {
        makingOffer = true;
        try {
            await pc.setLocalDescription();
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
                    await pc.setLocalDescription();
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


connectButton.onclick = async () => {
    sc.emit("start");
    video.srcObject = null;
    const pc = await connect();
    pc.ontrack = ({streams}) => {
        const [remoteStream] = streams;
        video.srcObject = remoteStream;
    }
}