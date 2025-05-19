from flask import Flask, render_template, request, jsonify, send_file
from gtts import gTTS
import os
import pytesseract
import fitz  # PyMuPDF for PDF handling
from werkzeug.utils import secure_filename
import json
import subprocess  # For running Blender scripts

app = Flask(__name__)

# Folder for saving uploaded files and generated outputs
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER

# Allowed extensions for file upload
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

# Ensure upload and output folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/extract-text', methods=['POST'])
def extract_text():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Extract text from the file
        if filename.endswith('.pdf'):
            try:
                pdf_text = extract_text_from_pdf(filepath)
                return jsonify({'text': pdf_text})
            except Exception as e:
                return jsonify({'error': f"Failed to extract text from PDF: {str(e)}"}), 500
        else:
            try:
                image_text = pytesseract.image_to_string(filepath, lang='tel')
                return jsonify({'text': image_text})
            except Exception as e:
                return jsonify({'error': f"Failed to extract text from image: {str(e)}"}), 500
    else:
        return jsonify({'error': 'Invalid file type'}), 400

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF using PyMuPDF."""
    pdf_document = fitz.open(pdf_path)
    text = ""
    for page_number in range(len(pdf_document)):
        page = pdf_document[page_number]
        text += page.get_text()
    pdf_document.close()
    return text

@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    data = request.json
    telugu_text = data.get("text", "")

    if not telugu_text:
        return jsonify({"error": "No text provided"}), 400

    try:
        tts = gTTS(text=telugu_text, lang='te')
        output_file = os.path.join(app.config['OUTPUT_FOLDER'], "telugu_tts.mp3")
        tts.save(output_file)
        return send_file(output_file, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate-animation', methods=['POST'])
def generate_animation():
    data = request.json
    text = data.get("text", "")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        # Step 1: Parse the text to identify characters, actions, and dialogues
        animation_script = parse_text_to_script(text)

        # Step 2: Generate the animation using Blender
        blender_script_path = os.path.join(os.getcwd(), "blender_script.py")
        output_video_path = os.path.join(app.config['OUTPUT_FOLDER'], "animation.mp4")
        
        # Run the Blender script to generate the animation
        subprocess.run(
            ["blender", "-b", "--python", blender_script_path, "--", json.dumps(animation_script), output_video_path],
            check=True
        )

        # Step 3: Return the video to the user
        return jsonify({"success": True, "video_url": output_video_path})
    except Exception as e:
        return jsonify({"error": f"Failed to generate animation: {str(e)}"}), 500

def parse_text_to_script(text):
    """Parse the text into a script for 3D animation."""
    # Dummy parsing logic; replace with NLP-based parsing
    script = {
        "characters": ["Character 1", "Character 2"],
        "dialogues": [
            {"character": "Character 1", "text": "Hello, how are you?"},
            {"character": "Character 2", "text": "I am fine, thank you!"}
        ],
        "actions": [
            {"character": "Character 1", "action": "walks to Character 2"},
            {"character": "Character 2", "action": "waves at Character 1"}
        ]
    }
    return script

if __name__ == '__main__':
    app.run(debug=True)
