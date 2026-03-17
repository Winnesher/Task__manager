import json
import os
from datetime import datetime, timezone
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Allow overriding the storage path (useful on platforms with ephemeral/non-writable repo dirs).
DATA_FILE = os.environ.get("TASKS_FILE", os.path.join(BASE_DIR, "task_data.json"))

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)


def load_tasks():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return []
            return json.loads(content)
    except (FileNotFoundError, json.JSONDecodeError):
        # Ensure the tasks file exists and contains a valid JSON array.
        try:
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump([], f, ensure_ascii=False, indent=2)
        except OSError:
            pass
        return []


def save_tasks(tasks):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)


def validate_time_format(value: str) -> bool:
    try:
        datetime.strptime(value, "%H:%M")
        return True
    except ValueError:
        return False


@app.route("/api/get-tasks", methods=["GET"])
def get_tasks():
    tasks = load_tasks()
    # Always sort by start time for the UI
    tasks.sort(key=lambda t: t.get("heure_debut", ""))
    return jsonify(tasks)


@app.route("/api/add-task", methods=["POST"])
def add_task():
    payload = request.get_json(force=True)
    titre = payload.get("titre", "").strip()
    heure_debut = payload.get("heure_debut", "")
    heure_fin = payload.get("heure_fin", "")
    statut = payload.get("statut", "À venir")

    if not titre:
        return jsonify({"error": "Le titre est requis."}), 400

    if not (validate_time_format(heure_debut) and validate_time_format(heure_fin)):
        return jsonify({"error": "Le format des heures doit être HH:MM."}), 400

    h_debut = datetime.strptime(heure_debut, "%H:%M")
    h_fin = datetime.strptime(heure_fin, "%H:%M")
    if h_fin <= h_debut:
        return jsonify({"error": "L'heure de fin doit être après l'heure de début."}), 400

    tasks = load_tasks()
    task_id = str(int(datetime.now(timezone.utc).timestamp() * 1000))

    task = {
        "id": task_id,
        "titre": titre,
        "heure_debut": heure_debut,
        "heure_fin": heure_fin,
        "statut": statut,
    }

    tasks.append(task)
    save_tasks(tasks)

    return jsonify(task), 201


@app.route("/api/update-task/<task_id>", methods=["PUT"])
def update_task(task_id):
    payload = request.get_json(force=True)
    new_statut = payload.get("statut", "").strip()

    if new_statut not in ["À venir", "En cours", "Terminée"]:
        return jsonify({"error": "Statut invalide."}), 400

    tasks = load_tasks()
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        return jsonify({"error": "Tâche non trouvée."}), 404

    task["statut"] = new_statut
    save_tasks(tasks)

    return jsonify(task)


@app.route("/api/delete-task/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    tasks = load_tasks()
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        return jsonify({"error": "Tâche non trouvée."}), 404

    tasks.remove(task)
    save_tasks(tasks)

    return jsonify({"message": "Tâche supprimée."})


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    # Serve frontend assets from the frontend directory.
    if path == "":
        path = "index.html"
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)