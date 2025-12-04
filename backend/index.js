const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------
// Serve React frontend (Vite)
// ----------------------
// Adjust the path depending on your repo structure.
// If backend is in `backend/` and frontend in `frontend/`:
// During Render deployment, `postinstall` will build frontend.
const frontendPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendPath));

// --------- LIVE MEMORY DATA ---------
let currentPoll = null;
let students = {}; // socketId -> { name }
let pastPolls = [];

// --------- SOCKET CONNECTION ---------
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ✅ STUDENT JOIN
    socket.on("student:join", (payload, cb) => {
        const name = payload.name?.trim();
        if (!name) return cb({ error: "Name required" });

        const duplicate = Object.values(students).some((s) => s.name === name);
        if (duplicate) return cb({ error: "Name already taken" });

        students[socket.id] = { name };
        io.emit("students:update", students);

        cb({ ok: true });

        if (currentPoll) {
            socket.emit("poll:started", { poll: currentPoll });
        }
    });

    // ✅ TEACHER CREATE POLL
    socket.on("teacher:create", (payload) => {
        currentPoll = {
            id: Date.now().toString(),
            question: payload.question,
            options: payload.options.map((o, i) => ({
                id: String(i),
                text: o.text,
                isCorrect: o.isCorrect || false,
                count: 0,
            })),
            answers: {},
            timeLimit: payload.timeLimit || 60000,
        };

        io.emit("poll:started", { poll: currentPoll });

        setTimeout(() => {
            if (!currentPoll) return;
            pastPolls.unshift(currentPoll);
            io.emit("poll:ended", { poll: currentPoll });
            currentPoll = null;
        }, currentPoll.timeLimit);
    });

    // ✅ STUDENT ANSWER
    socket.on("student:answer", (payload, cb) => {
        if (!currentPoll) return cb({ error: "No active poll" });

        const student = students[socket.id];
        if (!student) return cb({ error: "You were removed" });

        const name = student.name;
        if (currentPoll.answers[name]) return cb({ error: "Already answered" });

        currentPoll.answers[name] = payload.choiceId;

        const opt = currentPoll.options.find((o) => o.id === payload.choiceId);
        if (opt) opt.count++;

        io.emit("poll:results", { poll: currentPoll });

        cb({ ok: true });
    });

    // ✅ TEACHER GET PAST POLLS
    socket.on("teacher:getPast", (cb) => {
        cb({ polls: pastPolls });
    });

    // ✅ TEACHER GET STUDENTS
    socket.on("teacher:getStudents", (cb) => {
        cb({ students });
    });

    // ✅ TEACHER KICK STUDENT
    socket.on("teacher:kick", (socketId) => {
        if (students[socketId]) {
            io.to(socketId).emit("student:kicked");
            delete students[socketId];
            io.emit("students:update", students);
        }
    });

    // ✅ CHAT
    socket.on("chat:message", (msg) => {
        io.emit("chat:message", msg);
    });

    // ✅ CLEAN DISCONNECT
    socket.on("disconnect", () => {
        delete students[socket.id];
        io.emit("students:update", students);
    });
});

// ✅ HEALTH CHECK
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Catch-all to serve frontend for React router
app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// Use dynamic port for deployment platforms like Render, Heroku
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
