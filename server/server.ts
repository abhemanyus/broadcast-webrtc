// import express, { Application } from "express";
// import wrtc from "wrtc";
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { RTCSessionDescription } from "wrtc";

type UIN = string;
type Pair = {
    drone: Socket | undefined,
    client: Socket | undefined
}
const Pairing = new Map<UIN, Pair>();

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

const SetupClient = (client: Socket, uin: UIN) => {
    client.on("START_STREAM", payload => {
        if (!payload?.offer) {
            console.log("Client didn't send payload, aborting...");
            return;
        }
        const offer = payload.offer as RTCSessionDescription;
        // console.log(offer);
        const pair = Pairing.get(uin);
        if (!pair?.drone) {
            console.log("Paired drone not found, aborting...");
            return;
        }
        const drone = pair.drone;
        drone.emit("START_STREAM", { offer });
        console.log("Client: START_STREAM");
    });
}

const SetupDrone = (drone: Socket, uin: UIN) => {
    drone.on("ANSWER", payload => {
        if (!payload?.answer) {
            console.log("Drone didn't send answer, aborting...");
            return;
        }
        const answer = payload.answer as RTCSessionDescription;
        // console.log(answer);
        const pair = Pairing.get(uin);
        if (!pair?.client) {
            console.log("Paired client not found, aborting...");
            return;
        }
        const client = pair.client;
        client.emit("ANSWER", { answer });
        console.log("Drone: ANSWER");
    });
}

io.on("connection", async (socket) => {
    const query = socket.handshake.query as Query;
    await socket.join(query.uin);
    socket.on("ANSWER", payload => socket.broadcast.emit("ANSWER", payload));
    socket.on("START_STREAM", payload => socket.broadcast.emit("START_STREAM", payload));
    // console.log(query);
    // switch (query.type) {
    //     case "MavClient": {
    //         const pair = Pairing.get(query.uin);
    //         if (!pair) {
    //             Pairing.set(query.uin, { client: socket, drone: undefined });
    //         } else {
    //             pair.client = socket;
    //         }
    //         SetupClient(socket, query.uin);
    //         console.log(pair?.client?.handshake.query, pair?.drone?.handshake.query);
    //     }
    //     case "MavDrone": {
    //         const pair = Pairing.get(query.uin);
    //         if (!pair) {
    //             Pairing.set(query.uin, { drone: socket, client: undefined });
    //         } else {
    //             pair.drone = socket;
    //         }
    //         SetupDrone(socket, query.uin);
    //     }
    // }
});


httpServer.listen(3000, "0.0.0.0");