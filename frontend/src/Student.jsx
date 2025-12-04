import { useEffect, useState } from "react";
import { socket } from "./socket";
import "./Student.css";

export default function Student() {
    const [name, setName] = useState("");
    const [joined, setJoined] = useState(false);
    const [poll, setPoll] = useState(null);
    const [selected, setSelected] = useState(null);
    const [locked, setLocked] = useState(false);
    const [ended, setEnded] = useState(false);
    const [kicked, setKicked] = useState(false);

    useEffect(() => {
        const onPollStarted = ({ poll }) => {
            setPoll(poll);
            setSelected(null);
            setLocked(false);
            setEnded(false);
        };

        const onPollEnded = () => {
            setEnded(true); // ✅ do NOT clear poll
        };

        const onKicked = () => {
            setKicked(true);   // ✅ UI based kick
            setPoll(null);
            setLocked(true);
        };

        socket.on("poll:started", onPollStarted);
        socket.on("poll:ended", onPollEnded);
        socket.on("student:kicked", onKicked);

        return () => {
            socket.off("poll:started", onPollStarted);
            socket.off("poll:ended", onPollEnded);
            socket.off("student:kicked", onKicked);
        };
    }, []);

    const join = () => {
        socket.emit("student:join", { name }, (res) => {
            if (res?.error) alert(res.error);
            else setJoined(true);
        });
    };

    const vote = (id) => {
        if (locked || ended) return;

        setSelected(id);
        setLocked(true);

        socket.emit("student:answer", { choiceId: id }, (res) => {
            if (res?.error) {
                alert(res.error);
                setLocked(false); // ✅ unlock if server rejected
            }
        });
    };

    /* ---------------- KICKED UI (HIGHEST PRIORITY) ---------------- */
    if (kicked) {
        return (
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                flexDirection: "column",
                background: "#ffe6e6"
            }}>
                <h2 style={{ color: "red" }}>You were removed by the teacher</h2>
                <p>You no longer have access to this session.</p>
            </div>
        );
    }

    /* ---------------- JOIN UI ---------------- */
    if (!joined) {
        return (
            <div>
                <h3>Student Panel</h3>
                <input
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <button onClick={join}>Join</button>
            </div>
        );
    }

    /* ---------------- WAITING UI ---------------- */
    if (!poll) {
        return <h3>Waiting for poll...</h3>;
    }

    /* ---------------- POLL UI ---------------- */
    return (
        <div>
            <h3>{poll.question}</h3>

            {poll.options.map((o) => (
                <button
                    key={o.id}
                    onClick={() => vote(o.id)}
                    className={`option-btn ${selected === o.id ? "selected" : ""}`}
                    disabled={locked || ended}
                >
                    {o.text}
                </button>
            ))}

            {locked && !ended && (
                <p style={{ color: "green" }}>✅ Answer submitted</p>
            )}

            {ended && (
                <p style={{ color: "blue" }}>
                    📊 Poll ended. Waiting for next poll…
                </p>
            )}
        </div>
    );
}
