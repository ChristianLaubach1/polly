from flask import Flask, render_template, request, send_file, jsonify
import boto3
import io
import os

app = Flask(__name__)

# Erstelle einen Polly-Client und beziehe die Region dynamisch zur Laufzeit
region = os.environ.get('AWS_REGION')
polly = boto3.client('polly', region_name=region)

@app.route('/')
def index():
    # Verwende render_template, um die index.html aus dem templates-Verzeichnis zu senden
    return render_template('index.html')

@app.route('/synthesize', methods=['POST'])
def synthesize():
    text = request.form['text']
    voice_id = request.form['voiceId']

    if not text:
        return "Error: No text provided", 400

    response = polly.synthesize_speech(
        Text=text,
        OutputFormat='mp3',
        VoiceId=voice_id
    )

    # Sende die Audio-Daten zurück
    return send_file(
        io.BytesIO(response['AudioStream'].read()),
        mimetype='audio/mpeg'
    )

@app.route('/health')
def health():
    return jsonify(status="UP"), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)
