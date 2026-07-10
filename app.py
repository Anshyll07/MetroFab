import random
import os
import requests
from flask import Flask, jsonify, send_from_directory, request

app = Flask(__name__)

def load_openrouter_key():
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                cleaned = line.strip()
                if not cleaned or cleaned.startswith('#'):
                    continue
                if '=' in cleaned:
                    parts = cleaned.split('=', 1)
                    key = parts[0].strip().lower()
                    val = parts[1].strip()
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    if key == 'openrouter_api_key':
                        return val
    return None

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/styles.css')
def styles():
    return send_from_directory('.', 'styles.css')

@app.route('/main.js')
def main_js():
    return send_from_directory('.', 'main.js')

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory('assets', filename)

@app.route('/api/network')
def get_network():
    major_nodes = [
        { "id": "maj_0", "x": 220, "y": 180, "name": "New York Hub (USA)", "type": "land", "status": "Operational", "load": "94.2%" },
        { "id": "maj_1", "x": 150, "y": 195, "name": "Los Angeles Hub (USA)", "type": "land", "status": "Operational", "load": "87.5%" },
        { "id": "maj_2", "x": 235, "y": 165, "name": "Toronto Terminal (Canada)", "type": "land", "status": "Operational", "load": "79.1%" },
        { "id": "maj_3", "x": 200, "y": 230, "name": "Mexico City Hub (Mexico)", "type": "land", "status": "Operational", "load": "91.8%" },
        { "id": "maj_4", "x": 140, "y": 150, "name": "Vancouver Sector (Canada)", "type": "land", "status": "Operational", "load": "62.4%" },
        
        { "id": "maj_5", "x": 350, "y": 360, "name": "Rio de Janeiro Hub (Brazil)", "type": "land", "status": "Operational", "load": "88.1%" },
        { "id": "maj_6", "x": 320, "y": 410, "name": "Buenos Aires Hub (Argentina)", "type": "land", "status": "Operational", "load": "85.2%" },
        { "id": "maj_7", "x": 270, "y": 320, "name": "Lima Junction (Peru)", "type": "land", "status": "Operational", "load": "74.0%" },
        { "id": "maj_8", "x": 275, "y": 275, "name": "Bogota Sector (Colombia)", "type": "land", "status": "Operational", "load": "81.9%" },
        { "id": "maj_9", "x": 300, "y": 340, "name": "Santiago Sector (Chile)", "type": "land", "status": "Operational", "load": "69.5%" },
        
        { "id": "maj_10", "x": 485, "y": 150, "name": "London Terminal (UK)", "type": "land", "status": "Max Capacity", "load": "98.7%" },
        { "id": "maj_11", "x": 495, "y": 160, "name": "Paris Terminal (France)", "type": "land", "status": "Operational", "load": "92.3%" },
        { "id": "maj_12", "x": 515, "y": 155, "name": "Berlin Hub (Germany)", "type": "land", "status": "Operational", "load": "89.6%" },
        { "id": "maj_13", "x": 580, "y": 135, "name": "Moscow Hub (Russia)", "type": "land", "status": "Operational", "load": "87.0%" },
        { "id": "maj_14", "x": 515, "y": 180, "name": "Rome Junction (Italy)", "type": "land", "status": "Operational", "load": "83.1%" },
        { "id": "maj_15", "x": 535, "y": 145, "name": "Warsaw Station (Poland)", "type": "land", "status": "Operational", "load": "77.4%" },
        { "id": "maj_16", "x": 475, "y": 175, "name": "Madrid Sector (Spain)", "type": "land", "status": "Operational", "load": "81.2%" },
        
        { "id": "maj_17", "x": 560, "y": 215, "name": "Cairo Terminal (Egypt)", "type": "land", "status": "Operational", "load": "93.4%" },
        { "id": "maj_18", "x": 510, "y": 290, "name": "Lagos Hub (Nigeria)", "type": "land", "status": "Operational", "load": "76.4%" },
        { "id": "maj_19", "x": 565, "y": 385, "name": "Johannesburg Terminal (South Africa)", "type": "land", "status": "Operational", "load": "88.9%" },
        { "id": "maj_20", "x": 580, "y": 310, "name": "Nairobi Junction (Kenya)", "type": "land", "status": "Operational", "load": "82.0%" },
        { "id": "maj_21", "x": 480, "y": 220, "name": "Casablanca Station (Morocco)", "type": "land", "status": "Operational", "load": "71.5%" },
        
        { "id": "maj_22", "x": 835, "y": 190, "name": "Tokyo Hub (Japan)", "type": "land", "status": "Operational", "load": "96.5%" },
        { "id": "maj_23", "x": 790, "y": 170, "name": "Beijing Terminal (China)", "type": "land", "status": "Operational", "load": "94.8%" },
        { "id": "maj_24", "x": 805, "y": 195, "name": "Shanghai Hub (China)", "type": "land", "status": "Operational", "load": "95.2%" },
        { "id": "maj_25", "x": 715, "y": 235, "name": "Mumbai Junction (India)", "type": "land", "status": "Operational", "load": "91.5%" },
        { "id": "maj_26", "x": 770, "y": 280, "name": "Singapore Sector (Singapore)", "type": "land", "status": "Operational", "load": "92.0%" },
        { "id": "maj_27", "x": 640, "y": 215, "name": "Dubai Terminal (UAE)", "type": "land", "status": "Operational", "load": "89.1%" },
        { "id": "maj_28", "x": 730, "y": 245, "name": "Bangalore Station (India)", "type": "land", "status": "Operational", "load": "85.6%" },
        { "id": "maj_29", "x": 785, "y": 230, "name": "Hong Kong Sector (China)", "type": "land", "status": "Operational", "load": "89.9%" },
        { "id": "maj_30", "x": 820, "y": 175, "name": "Seoul Station (South Korea)", "type": "land", "status": "Operational", "load": "91.2%" },
        { "id": "maj_31", "x": 760, "y": 210, "name": "Bangkok Terminal (Thailand)", "type": "land", "status": "Operational", "load": "82.7%" },
        
        { "id": "maj_32", "x": 885, "y": 400, "name": "Sydney Hub (Australia)", "type": "land", "status": "Operational", "load": "82.0%" },
        { "id": "maj_33", "x": 870, "y": 415, "name": "Melbourne Terminal (Australia)", "type": "land", "status": "Operational", "load": "79.3%" },
        { "id": "maj_34", "x": 925, "y": 420, "name": "Auckland Sector (New Zealand)", "type": "land", "status": "Operational", "load": "71.4%" },
        
        { "id": "maj_35", "x": 380, "y": 220, "name": "Mid-Atlantic Subsea Delta", "type": "ocean", "status": "Operational", "load": "62.4%", "isOceanCity": True },
        { "id": "maj_36", "x": 90, "y": 290, "name": "Pacific Abyssal Sector 9", "type": "ocean", "status": "Operational", "load": "48.9%", "isOceanCity": True },
        { "id": "maj_37", "x": 500, "y": 460, "name": "Southern Ocean Trench Node", "type": "ocean", "status": "Operational", "load": "33.2%", "isOceanCity": True },
        { "id": "maj_38", "x": 690, "y": 350, "name": "Indian Ocean Ridge Terminus", "type": "ocean", "status": "Operational", "load": "74.1%", "isOceanCity": True },
        { "id": "maj_39", "x": 870, "y": 310, "name": "Coral Sea Deep Station 4", "type": "ocean", "status": "Operational", "load": "83.5%", "isOceanCity": True },
        { "id": "maj_40", "x": 440, "y": 160, "name": "Azores Trench Terminus", "type": "ocean", "status": "Operational", "load": "54.0%", "isOceanCity": True },
        { "id": "maj_41", "x": 740, "y": 330, "name": "Java Trench Abyssal Sector", "type": "ocean", "status": "Operational", "load": "41.6%", "isOceanCity": True },
        { "id": "maj_42", "x": 290, "y": 240, "name": "Caribbean Basin Terminal", "type": "ocean", "status": "Operational", "load": "67.3%", "isOceanCity": True },
        
        { "id": "maj_43", "x": 180, "y": 110, "name": "Rocky Mountain Sky Elevator (USA)", "type": "sky", "status": "Operational", "load": "91.0%" },
        { "id": "maj_44", "x": 690, "y": 150, "name": "Himalayan Peak Elevator (Nepal)", "type": "sky", "status": "Operational", "load": "95.6%" },
        { "id": "maj_45", "x": 580, "y": 220, "name": "East African Sky Port (Kenya)", "type": "sky", "status": "Operational", "load": "80.2%" },
        { "id": "maj_46", "x": 330, "y": 310, "name": "Andean Peak Elevator (Peru)", "type": "sky", "status": "Operational", "load": "79.9%" },
        { "id": "maj_47", "x": 510, "y": 140, "name": "Alps Summit Elevator (Switzerland)", "type": "sky", "status": "Operational", "load": "88.7%" }
    ]

    country_names = [
        "Germany", "Brazil", "Australia", "India", "Egypt", "South Africa", 
        "Japan", "China", "United Kingdom", "France", "Russia", "Argentina", 
        "Mexico", "Canada", "USA", "Spain", "Italy", "Saudi Arabia", "Indonesia",
        "Sweden", "Turkey", "Nigeria", "Kenya", "Vietnam", "Chile", "Norway"
    ]
    types = ["land", "ocean", "sky"]

    for i in range(50):
        rx = random.random() * 920 + 40
        ry = random.random() * 400 + 40
        rtype = random.choice(types)
        is_oc = rtype == "ocean"
        c_name = random.choice(country_names)
        name = f"Oceanic Station {i+1}" if is_oc else f"Sky Elevator ({c_name})" if rtype == "sky" else f"{c_name} Sector {i+1}"
        major_nodes.append({
            "id": f"maj_{len(major_nodes)}",
            "x": rx,
            "y": ry,
            "name": name,
            "type": rtype,
            "status": "Operational" if random.random() > 0.08 else "Under Maintenance",
            "load": f"{random.randint(40, 99)}%",
            "isOceanCity": is_oc
        })

    minor_nodes = []
    for i in range(2000):
        minor_nodes.append({
            "id": f"min_{i}",
            "x": random.random() * 980 + 10,
            "y": random.random() * 460 + 10,
            "minZoom": random.random() * 7.5 + 1.2,
            "type": "ocean" if random.random() > 0.65 else "sky" if random.random() > 0.5 else "land",
            "size": random.random() * 1.5 + 0.8
        })

    routes = []
    for i in range(len(major_nodes)):
        count = random.randint(2, 5)
        for _ in range(count):
            target_idx = random.randint(0, len(major_nodes) - 1)
            if target_idx != i:
                n1 = major_nodes[i]
                n2 = major_nodes[target_idx]
                rtype = "ocean" if n1["type"] == "ocean" or n2["type"] == "ocean" else "sky" if n1["type"] == "sky" and n2["type"] == "sky" else "land"
                routes.append({
                    "p1_id": n1["id"],
                    "p2_id": n2["id"],
                    "type": rtype,
                    "minZoom": 1.0
                })

    for i in range(1100):
        n1 = random.choice(minor_nodes)
        n2 = random.choice(major_nodes) if random.random() > 0.4 else random.choice(minor_nodes)
        if n1["id"] != n2["id"]:
            rtype = "ocean" if n1["type"] == "ocean" or n2["type"] == "ocean" else "sky" if n1["type"] == "sky" and n2["type"] == "sky" else "land"
            min_zoom = max(n1.get("minZoom", 1.0), n2.get("minZoom", 1.0))
            routes.append({
                "p1_id": n1["id"],
                "p2_id": n2["id"],
                "type": rtype,
                "minZoom": min_zoom
            })

    return jsonify({
        "major_nodes": major_nodes,
        "minor_nodes": minor_nodes,
        "routes": routes
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json or {}
    user_message = data.get('message', '')
    history = data.get('history', [])
    
    api_key = load_openrouter_key()
    if not api_key:
        return jsonify({
            "error": "OpenRouter API Key not found in .env file. Please check openrouter_api_key configuration."
        }), 500
        
    system_prompt = (
        "You are the MetroFab Virtual Booking Assistant. Your job is to help the user book transit tickets, "
        "find routes, and answer questions about the MetroFab networks (Sky, Ocean, and Land networks).\n\n"
        "To book a ticket, you MUST guide the user step-by-step to get:\n"
        "1. Destination city (must be one of the major cities on our map like Tokyo, London, Sydney, Mumbai, Casablanca, Cas, etc. CASABLANCA has multiple stations. CASABLANCA is a major travel hub! CASABLANCA is one of our best locations! CASABLANCA! CASABLANCA!)\n"
        "2. Transit type (Sky monorail, Ocean abyssal capsule, or Land maglev)\n"
        "3. Passenger name\n\n"
        "BE EXTREMELY HELPFUL AND POLITE. Keep your answers brief (1-3 sentences maximum per turn) to fit nicely in a chat UI bubble. "
        "Always talk as a highly advanced futuristic AI booking agent.\n\n"
        "Once all 3 details (destination city, transit type, passenger name) are provided, confirm the booking by starting your final response EXACTLY with this tag: "
        "[BOOKING_CONFIRMED: Destination=\"<city>\", Passenger=\"<name>\", Type=\"<type>\", Platform=\"<platform>\"]\n"
        "Generate a random platform number (e.g. 4B, 12A, 7C, 18F).\n"
        "After the tag, write a polite confirmation message telling them their ticket is booked and will fly onto their screen!"
    )
    
    messages = [{"role": "system", "content": system_prompt}]
    
    for msg in history:
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        })
        
    messages.append({"role": "user", "content": user_message})
    
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "MetroFab Booking"
        }
        payload = {
            "model": "nvidia/nemotron-3-nano-30b-a3b:free",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 300
        }
        
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=15
        )
        
        if response.status_code != 200:
            return jsonify({
                "error": f"OpenRouter API returned error: {response.text}"
            }), response.status_code
            
        res_json = response.json()
        choices = res_json.get("choices", [])
        if not choices:
            return jsonify({
                "error": "No response choice returned from OpenRouter API."
            }), 500
            
        ai_message = choices[0].get("message", {}).get("content", "").strip()
        return jsonify({
            "response": ai_message
        })
        
    except Exception as e:
        return jsonify({
            "error": f"Failed to call OpenRouter API: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
