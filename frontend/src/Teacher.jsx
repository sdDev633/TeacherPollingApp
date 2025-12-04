import { useEffect, useState } from "react";
import { socket } from "./socket";

export default function Teacher() {
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState([
        { text: "", isCorrect: false },
        { text: "", isCorrect: false }
    ]);
    const [timeLimit, setTimeLimit] = useState(60);
    const [activePoll, setActivePoll] = useState(null);
    const [pastPolls, setPastPolls] = useState([]);
    const [students, setStudents] = useState({}); // ✅ students list

    useEffect(() => {
        const onStarted = ({ poll }) => setActivePoll(poll);
        const onResults = ({ poll }) => setActivePoll({ ...poll });
        const onEnded = () => {
            setActivePoll(null);
            loadPast();
        };

        // ✅ student list updates
        const onStudentsUpdate = (data) => {
            setStudents(data);
        };

        socket.on("poll:started", onStarted);
        socket.on("poll:results", onResults);
        socket.on("poll:ended", onEnded);
        socket.on("students:update", onStudentsUpdate); // ✅

        loadPast();
        loadStudents();

        return () => {
            socket.off("poll:started", onStarted);
            socket.off("poll:results", onResults);
            socket.off("poll:ended", onEnded);
            socket.off("students:update", onStudentsUpdate);
        };
    }, []);

    const loadPast = () => {
        socket.emit("teacher:getPast", (res) => {
            setPastPolls(res.polls || []);
        });
    };

    const loadStudents = () => {
        socket.emit("teacher:getStudents", (res) => {
            setStudents(res.students || {});
        });
    };

    const kickStudent = (id) => {
        if (window.confirm("Remove this student?")) {
            socket.emit("teacher:kick", id);
        }
    };

    const create = () => {
        if (!question.trim() || options.some((o) => !o.text.trim())) {
            return alert("Fill all fields");
        }

        const hasCorrect = options.some((o) => o.isCorrect);
        if (!hasCorrect) {
            return alert("Select one correct option");
        }

        socket.emit("teacher:create", {
            question,
            options,
            timeLimit: timeLimit * 1000
        });

        setQuestion("");
        setOptions([
            { text: "", isCorrect: false },
            { text: "", isCorrect: false }
        ]);
        setTimeLimit(60);
    };

    const updateOptionText = (idx, value) => {
        setOptions((prev) =>
            prev.map((o, i) =>
                i === idx ? { ...o, text: value } : o
            )
        );
    };

    const markCorrect = (idx) => {
        setOptions((prev) =>
            prev.map((o, i) => ({
                ...o,
                isCorrect: i === idx
            }))
        );
    };

    const addOption = () => {
        setOptions((prev) => [
            ...prev,
            { text: "", isCorrect: false }
        ]);
    };

    return (
        <div>
            <h3>Teacher Dashboard</h3>

            {/* ---------------- STUDENT LIST ---------------- */}
            <h4>Connected Students ({Object.keys(students).length})</h4>

            {Object.keys(students).length === 0 && <p>No students joined</p>}

            {Object.entries(students).map(([id, s]) => (
                <div
                    key={id}
                    style={{ display: "flex", gap: 10, marginBottom: 6 }}
                >
                    <span>{s.name}</span>
                    <button onClick={() => kickStudent(id)}>❌ Kick</button>
                </div>
            ))}

            <hr style={{ margin: "20px 0" }} />

            {/* ---------------- CREATE POLL ---------------- */}
            {!activePoll && (
                <>
                    <label>Question</label>
                    <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                    />

                    <label>Options</label>

                    {options.map((opt, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 8
                            }}
                        >
                            <input
                                placeholder={`Option ${idx + 1}`}
                                value={opt.text}
                                onChange={(e) =>
                                    updateOptionText(idx, e.target.value)
                                }
                            />

                            <label style={{ display: "flex", gap: 4 }}>
                                <input
                                    type="radio"
                                    name="correct"
                                    checked={opt.isCorrect}
                                    onChange={() => markCorrect(idx)}
                                />
                                Correct
                            </label>
                        </div>
                    ))}

                    <button onClick={addOption}>+ Add More Option</button>

                    <label>Time Limit (seconds)</label>
                    <input
                        type="number"
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(Number(e.target.value))}
                    />

                    <button onClick={create}>Start Poll</button>
                </>
            )}

            {/* ---------------- LIVE POLL ---------------- */}
            {activePoll && (
                <>
                    <div style={{ marginTop: 20, fontWeight: "bold" }}>
                        Live Poll
                    </div>
                    <h4>{activePoll.question}</h4>

                    {activePoll.options.map((o) => (
                        <div
                            key={o.id}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "6px 0",
                                borderBottom: "1px solid #eee"
                            }}
                        >
                            <div style={{ display: "flex", gap: 6 }}>
                                <span>{o.text}</span>
                                {o.isCorrect && (
                                    <span style={{ color: "green" }}>✅</span>
                                )}
                            </div>
                            <b>{o.count}</b>
                        </div>
                    ))}
                </>
            )}

            {/* ---------------- PAST POLLS ---------------- */}
            <h4 style={{ marginTop: 30 }}>Past Polls</h4>

            {pastPolls.map((p) => (
                <div
                    key={p.id}
                    style={{
                        marginBottom: 16,
                        paddingBottom: 10,
                        borderBottom: "1px solid #ddd"
                    }}
                >
                    <b>{p.question}</b>

                    {p.options.map((o) => (
                        <div
                            key={o.id}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: 4
                            }}
                        >
                            <div style={{ display: "flex", gap: 6 }}>
                                <span>{o.text}</span>
                                {o.isCorrect && (
                                    <span style={{ color: "green" }}>✅</span>
                                )}
                            </div>
                            <span>{o.count}</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
