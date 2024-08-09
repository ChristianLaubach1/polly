FROM python:3.9-slim

WORKDIR /usr/src/app

# Kopiere die requirements.txt in das Arbeitsverzeichnis und installiere Abhängigkeiten
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Kopiere den gesamten Inhalt des Wurzelverzeichnisses in das Arbeitsverzeichnis des Containers
COPY . .

# Erstelle das Verzeichnis /usr/src/app/templates, falls es nicht existiert, und kopiere index.html dorthin
RUN mkdir -p /usr/src/app/templates && mv /usr/src/app/index.html /usr/src/app/templates/

# Exponiere den Port 3000
EXPOSE 3000

# Setze Flask-Umgebungsvariablen
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Starte die Flask-Anwendung
CMD ["flask", "run", "--host=0.0.0.0", "--port=3000"]
