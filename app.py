from flask import Flask, request, make_response, jsonify, render_template
import pandas as pd
import numpy as np
import geopandas as gpd
import matplotlib.pyplot as plt
import json
from flask_cors import CORS

import matplotlib
matplotlib.use('Agg')

from matplotlib.figure import Figure
import io
from matplotlib.backends.backend_agg import FigureCanvasAgg


app = Flask(__name__)
CORS(app)

df = gpd.read_file("districts2.geojson")

columns = [
            'Organisation unit UID',
            'Organisation unit Name',
            'Organisation unit code',
            'Palu % Toutes Consultations',
            'Palu % Taux de positivité',
            'palu incidence',
            'population couverte',
          ]

@app.route('/')
def index():
    return render_template("index.html", message="Hello Flask!");
    #return "<h1>Welcome to the Guinea Malaria map server !!</h1>"

@app.route('/getmsg/', methods=['GET'])
def respond():
    # Retrieve the name from url parameter
    name = request.args.get("name", None)

    # For debugging
    print(f"got name {name}")

    response = {}

    # Check if user sent a name at all
    if not name:
        response["ERROR"] = "no name found, please send a name."
    # Check if the user entered a number not a name
    elif str(name).isdigit():
        response["ERROR"] = "name can't be numeric."
    # Now the user entered a valid name
    else:
        response["MESSAGE"] = f"Welcome {name} to the Guinea map server!!"

    # Return the response in json format
    return jsonify(response)

@app.route('/post/', methods=['POST'])
def post_something():
    name = request.form.get('name')
    print(name)
    # You can add the test cases you made in the previous function, but in our case here you are just testing the POST functionality
    if name:
        return jsonify({
            "Message": f"Welcome {name} to our awesome platform!!",
            # Add this option to distinct the POST request
            "METHOD" : "POST"
        })
    else:
        return jsonify({
            "ERROR": "no name found, please send a name."
        })




@app.route('/confirmation_rate.png', methods=['POST'])
def get_confirmation_rate():
    if request.method == 'POST':
        return makemap(columns[3])

@app.route('/positivity_rate.png', methods=['POST'])
def get_positivity_rate():
    if request.method == 'POST':
        return makemap(columns[4])

@app.route('/incidence.png', methods=['POST'])
def get_incidence():
    if request.method == 'POST':
        return makemap(columns[5])

@app.route('/population.png', methods=['POST'])
def get_population():
    if request.method == 'POST':
        return makemap(columns[6])





district_uids = [
'q1zvw5TOnZF', # Beyla
'L1Gr2bAsR4T', # Boffa
'THgRhO9eF0I', # Boké Prefecture
'KnR8IiGoSxQ', # Coyah
'GUSZlo8f9t8', # Dabola
'mqBP8r7CwKc', # Dalaba
'IPv04VSahDi', # Dinguiraye
'gHO8qPxfLdl', # Dixinn
'VyZGMioVY5z', # Dubréka
'qmVkCsfziWM', # Faranah Prefecture
'CXHCAlP68L5', # Forécariah
'jiGkwTWpBeq', # Fria
'Motdz3Bql7L', # Gaoual
'khK0Ewyw0vV', # Guéckédou
'cbst9kz3DHp', # Kaloum
'Z71gNmPnc22', # Kankan Prefecture
'dkWnjo1bSrU', # Kérouané
'zmSjEUspuVL', # Kindia Prefecture
'VUj3PJpzty8', # Kissidougou
'HC3N6HbSdfg', # Koubia
'pChTVBEAPJJ', # Koundara
'kVULorkd7Vt', # Kouroussa
'kVULorkd7Vt', # Kouroussa
'E1AAcXV9PxL', # Labé Prefecture
'GuePjEvd6OH', # Lélouma
'QL7gnB6sSLA', # Lola
'TEjr8hbfz9a', # Macenta
'zJZspSfD06r', # Mali
'LyGsnnzEabg', # Mamou Prefecture
'ISZZ5m7PYAC', # Mandiana
'CoKlGkkiN4a', # Matam
'jIFb011EBWB', # Matoto
'yvJVq1GjI2A', # Nzérékoré Prefecture
'ASu054HjT5Y', # Pita
'D5WJbugzg9L', # Ratoma
'QZJuFnb2WZ6', # Siguiri
'C4dKrWoT5au', # Télimélé
'XraGmJ5tF7e', # Tougué
'PCa6e3khx5E', # Yomou

]

def transformData(content):

    rows = []

    for uid in district_uids:
        record = [''] * 7

        record[0] = uid
        record[1] = content['metaData']['items'][uid]['name']
        record[2] = content['metaData']['items'][uid]['code']

        for row in content['rows']:
            if row[1] == uid:
                if row[0] == 'kNmu11OsuGn':  # Palu % Toutes Consultations
                    record[3] = row[3]
                if row[0] == 'fk54L22yVF4':  # Taux De Positivite
                    record[4] = row[3]
                if row[0] == 'mH24Ynkgo4K':  # Taux d'incidence du paludisme
                    record[5] = row[3]
                if row[0] == 'wAsXYLfkVcX':  # Population couverte
                    record[6] = row[3]

        rows.append(record)

    result = {"rows": rows}
    return result


# the varible has to be in the request body
def makemap(variable):

    content = request.json

    if "rows" not in content:
        resp = make_response("Invalid Report", 400)
        return resp

    new_json = transformData(content)

    pivot_table_df = pd.DataFrame(new_json["rows"], columns=columns)


    # join the geodataframe with the csv dataframe
    merged = df.merge(pivot_table_df, how='left', left_on="ORG_CODE", right_on="Organisation unit code")

    # set the range for the choropleth values
    vmin, vmax = 0, 100

    # create figure and axes for Matplotlib
    fig, ax = plt.subplots(1, figsize=(8, 6))

    # remove the axis
    ax.axis('off')
    ax.set_title(variable, fontdict={'fontsize': '16', 'fontweight': '8'})

    # Create colorbar legend
    sm = plt.cm.ScalarMappable(cmap='Oranges', norm=plt.Normalize(vmin=vmin, vmax=vmax))

    # empty array for the data range
    sm.set_array([])

    # or alternatively sm._A = []. Not sure why this step is necessary, but many recommends it# add the colorbar to the figure
    # fig.colorbar(sm)
    fig.colorbar(sm, orientation="horizontal", fraction=0.036, pad=0.1, aspect=30)

    # Add Labels
    merged['coords'] = merged['geometry'].apply(lambda x: x.representative_point().coords[:])
    merged['coords'] = [coords[0] for coords in merged['coords']]

    # Add district names
    for idx, row in merged.iterrows():
        plt.annotate(text=row['NAME_2'], xy=row['coords'], horizontalalignment='center')

    merged.plot(column=variable, cmap='Oranges', linewidth=0.8, ax=ax, edgecolor='0.8')

    canvas = FigureCanvasAgg(fig)
    output = io.BytesIO()
    canvas.print_png(output)
    response = make_response(output.getvalue())
    response.mimetype = 'image/png'

    return response


if __name__ == '__main__':
    app.run(host= '0.0.0.0',debug=True)
