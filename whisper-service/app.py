import os
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel

app = Flask(__name__)

# Allow the legal dashboard (running locally in the browser) to call this service directly
CORS(app)

model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")


@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["file"]
    if audio_file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    suffix = os.path.splitext(audio_file.filename)[1] or ".m4a"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = tmp.name
        audio_file.save(tmp_path)

    try:
        segments, info = model.transcribe(tmp_path, beam_size=5)

        # Convert the generator to a list so we can use it twice (full text + segments)
        segment_list = list(segments)

        return jsonify({
            "text": " ".join(s.text.strip() for s in segment_list),
            "language": info.language,
            "language_probability": round(info.language_probability, 4),
            "segments": [
                {
                    "start": round(s.start, 2),
                    "end": round(s.end, 2),
                    "text": s.text.strip(),
                }
                for s in segment_list
            ],
        })
    finally:
        os.remove(tmp_path)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
