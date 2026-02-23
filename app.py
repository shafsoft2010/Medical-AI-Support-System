from PIL import Image
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os
import re
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")


def markdown_to_html(text):
    """Convert Gemini markdown response to clean HTML."""

    # Convert **bold** → <strong>
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)

    # Convert *italic* → <em>
    text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)

    # Convert ### Heading → <h3>
    text = re.sub(r'###\s+(.*?)(?:\n|$)', r'<h3>\1</h3>', text)

    # Convert ## Heading → <h3>
    text = re.sub(r'##\s+(.*?)(?:\n|$)', r'<h3>\1</h3>', text)

    # Convert # Heading → <h3>
    text = re.sub(r'#\s+(.*?)(?:\n|$)', r'<h3>\1</h3>', text)

    # Split into lines and handle bullet points
    lines   = text.split('\n')
    result  = []
    in_list = False

    for line in lines:
        line = line.strip()
        if not line:
            if in_list:
                result.append('</ul>')
                in_list = False
            result.append('<br>')
            continue

        # Bullet: lines starting with * or - or number like "1."
        if re.match(r'^[\*\-]\s+', line) or re.match(r'^\d+\.\s+', line):
            content = re.sub(r'^[\*\-\d\.]+\s+', '', line)
            if not in_list:
                result.append('<ul>')
                in_list = True
            result.append(f'<li>{content}</li>')
        else:
            if in_list:
                result.append('</ul>')
                in_list = False
            # Skip wrapping h3 tags again
            if line.startswith('<h3>'):
                result.append(line)
            else:
                result.append(f'<p>{line}</p>')

    if in_list:
        result.append('</ul>')

    return ''.join(result)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/search", methods=["POST"])
def search():
    query    = request.json.get("query")
    response = model.generate_content(query)
    html     = markdown_to_html(response.text)
    return jsonify({"answer": html})


@app.route("/image-search", methods=["POST"])
def image_search():
    try:
        file  = request.files["image"]
        query = request.form.get("query")
        img   = Image.open(file)

        prompt = "Analyze this medical image and explain clearly."
        if query:
            prompt += f" Additional context: {query}"

        response = model.generate_content([prompt, img])
        html     = markdown_to_html(response.text)
        return jsonify({"answer": html})

    except Exception as e:
        print("IMAGE ERROR:", e)
        return jsonify({"answer": "<p>Image analysis error. Please try again.</p>"})


if __name__ == "__main__":
    app.run(debug=True)